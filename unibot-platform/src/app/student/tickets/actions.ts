"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TicketCategory, TicketPriority } from "@/lib/types/database";

const categoryLabels: Record<string, string> = {
  grade_appeal: "اعتراض على درجة",
  absence_excuse: "عذر غياب",
  registration_issue: "مشكلة في التسجيل",
  schedule_change: "طلب تغيير جدول",
  venue_issue: "مشكلة قاعة",
  technical_problem: "مشكلة فنية",
  administrative: "إداري عام",
  course_content_query: "استفسار عن محتوى المادة",
  leave_excuse_request: "طلب إجازة",
  schedule_conflict: "تعارض جدول",
  other: "أخرى",
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function getMyTickets() {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("tickets")
    .select("*, profiles:created_by(first_name, last_name), assigned_profile:assigned_to(first_name, last_name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function createTicket(formData: FormData) {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const category = formData.get("category") as TicketCategory;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const courseId = formData.get("course_id") as string | null;
  const aiAttempted = formData.get("ai_attempted") === "true";
  const aiSuggestion = formData.get("ai_suggestion") as string | null;
  const autoClose = formData.get("auto_close") === "true";
  const isDirectToFaculty = formData.get("is_direct_to_faculty") === "true";

  // AI priority analysis
  let priority = "medium";
  let priorityReason: string | null = null;
  try {
    const result = await analyzePriority(description, category);
    priority = result.priority;
    priorityReason = result.reason;
  } catch {
    priority = "medium";
  }

  const insertData: Record<string, unknown> = {
    tenant_id: profile.tenant_id,
    created_by: profile.id,
    category,
    priority,
    priority_reason: priorityReason,
    title,
    description,
    ai_attempted: aiAttempted,
    ai_suggestion: aiSuggestion || null,
    status: autoClose ? "closed" : "open",
    is_direct_to_faculty: isDirectToFaculty,
  };

  let assignedInstructorId: string | null = null;

  // If direct-to-faculty mode, auto-assign the instructor from course_schedules
  if (isDirectToFaculty && courseId) {
    // course_schedules uses study_plan_course_id (FK to study_plan_courses), NOT course_id directly
    // So first find the study_plan_courses record(s) for this course
    const { data: spCourses } = await supabase
      .from("study_plan_courses")
      .select("id")
      .eq("course_id", courseId)
      .eq("tenant_id", profile.tenant_id);

    let instructorId: string | null = null;
    if (spCourses && spCourses.length > 0) {
      const spcIds = spCourses.map((spc: { id: string }) => spc.id);
      const { data: schedules } = await supabase
        .from("course_schedules")
        .select("instructor_id")
        .in("study_plan_course_id", spcIds)
        .eq("tenant_id", profile.tenant_id)
        .not("instructor_id", "is", null)
        .limit(1);

      instructorId = schedules?.[0]?.instructor_id ?? null;
    }

    if (instructorId) {
      insertData.assigned_to = instructorId;
      assignedInstructorId = instructorId;
    }
  }

  if (courseId) {
    // If it's a course_content_query, we use related_course_id
    // Otherwise use related_section_id (existing field)
    if (category === "course_content_query") {
      insertData.related_course_id = courseId;
    } else {
      // Try to find a section for this course enrollment
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("section_id")
        .eq("student_id", profile.id)
        .eq("course_id", courseId)
        .eq("status", "enrolled")
        .maybeSingle();
      if (enrollment?.section_id) {
        insertData.related_section_id = enrollment.section_id;
      }
    }
  }

  const { data: createdTicket, error } = await supabase
    .from("tickets")
    .insert(insertData)
    .select("id, title, ticket_number")
    .single();

  if (error) throw new Error(error.message);

  // ─── Send notifications ──────────────────────────────────────
  if (isDirectToFaculty && assignedInstructorId) {
    // Notify the assigned faculty member directly
    await supabase.from("notifications").insert({
      tenant_id: profile.tenant_id,
      recipient_id: assignedInstructorId,
      notification_type: "ticket_assigned" as any,
      title: `📩 تذكرة جديدة: ${title}`,
      body: `تم توجيه تذكرة لك من الطالب بخصوص ${categoryLabels[category] || category}`,
      reference_table: "tickets",
      reference_id: createdTicket!.id,
    });
  } else {
    // Notify all academic_management users
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("role", "academic_management");

    if (admins && admins.length > 0) {
      const adminNotifications = admins.map((admin) => ({
        tenant_id: profile.tenant_id,
        recipient_id: admin.id,
        notification_type: "new_ticket" as any,
        title: `🎫 تذكرة جديدة: ${title}`,
        body: `طالب - ${categoryLabels[category] || category}`,
        reference_table: "tickets",
        reference_id: createdTicket!.id,
      }));
      await supabase.from("notifications").insert(adminNotifications);
    }
  }

  revalidatePath("/student/tickets");
}

export async function getTicketMessages(ticketId: string) {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("ticket_messages")
    .select("*, profiles:sender_id(first_name, last_name)")
    .eq("ticket_id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .eq("is_internal", false)
    .order("created_at", { ascending: true });

  return data || [];
}

export async function sendTicketMessage(ticketId: string, body: string) {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  const { error } = await supabase.from("ticket_messages").insert({
    tenant_id: profile.tenant_id,
    ticket_id: ticketId,
    sender_id: profile.id,
    body,
    is_internal: false,
  });

  if (error) throw new Error(error.message);

  // If ticket is pending_info, move back to in_progress when student replies
  await supabase
    .from("tickets")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "pending_info");

  revalidatePath("/student/tickets");
}

export async function rateTicket(ticketId: string, rating: number) {
  const { profile } = await requireRole(["student", "faculty"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("tickets")
    .update({ rating })
    .eq("id", ticketId)
    .eq("created_by", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/student/tickets");
}

export async function closeTicket(ticketId: string) {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("tickets")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("created_by", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/student/tickets");
}

export async function getAiSuggestion(description: string) {
  const { profile } = await requireRole(["student", "faculty"]);

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: description,
        new_conversation: true,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const noAnswer = "لم أجد معلومات كافية";
    if (data.message && !data.message.includes(noAnswer)) {
      return data.message as string;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getStudentCourses(): Promise<
  { id: string; code: string; name: string }[]
> {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("enrollments")
    .select("course_id, courses!inner(id, code, name)")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const courseList: { id: string; code: string; name: string }[] = [];
  for (const e of data || []) {
    const c = (e as any).courses;
    if (c?.id && c?.code && c?.name) {
      courseList.push({ id: c.id, code: c.code, name: c.name });
    }
  }
  return courseList;
}

export async function getCourseInstructors(courseId: string) {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  // course_schedules uses study_plan_course_id, not course_id directly
  const { data: spCourses } = await supabase
    .from("study_plan_courses")
    .select("id")
    .eq("course_id", courseId)
    .eq("tenant_id", profile.tenant_id);

  if (!spCourses || spCourses.length === 0) return [];

  const spcIds = spCourses.map((spc: { id: string }) => spc.id);

  // Find instructors teaching this course via course_schedules
  const { data } = await supabase
    .from("course_schedules")
    .select("instructor_id, profiles!course_schedules_instructor_id_fkey(first_name, last_name)")
    .in("study_plan_course_id", spcIds)
    .eq("tenant_id", profile.tenant_id);

  if (!data || data.length === 0) return [];

  const seen = new Set<string>();
  interface InstructorResult {
    id: string;
    first_name: string;
    last_name: string;
  }
  const instructors: InstructorResult[] = [];
  for (const s of data as any[]) {
    const instructor = s.profiles;
    if (instructor && !seen.has(instructor.id)) {
      seen.add(instructor.id);
      instructors.push({ id: instructor.id, first_name: instructor.first_name, last_name: instructor.last_name });
    }
  }
  return instructors;
}

export async function getTicketEscalations() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("ticket_escalations")
    .select("*, escalated_by_profile:escalated_by(first_name, last_name), escalated_to_profile:escalated_to(first_name, last_name)")
    .eq("tenant_id", profile.tenant_id);

  return data || [];
}

// ─── AI Priority Analysis ────────────────────────────────────────────────

async function analyzePriority(
  description: string,
  category: TicketCategory
): Promise<{ priority: string; reason: string | null }> {
  const prompt = `أنت محلل أولويات لتذاكر النظام الأكاديمي. حلل الشكوى التالية وحدد أولويتها.

التصنيف: ${category}
الوصف: ${description}

أعد فقط JSON بالصيغة:
{
  "priority": "urgent" | "high" | "medium" | "low",
  "reason": "سبب مختصر بالعربية (لا يزيد عن 50 حرف)"
}

قواعد تحديد الأولوية:
- urgent: كلمات مثل "اختبار", "امتحان", "نهائي", "طرد", "حرمان", "فصل", "غداً", "اليوم"
- high: "تسجيل", "مشكلة", "عاجل", "مهم", "درجة", "تظلم"
- low: استفسار عام, اقتراح
- medium: ما عدا ذلك

أعد JSON فقط ولا شيء غيره.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 200,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const validPriorities = ["urgent", "high", "medium", "low"];
    return {
      priority: validPriorities.includes(parsed.priority) ? parsed.priority : "medium",
      reason: parsed.reason || null,
    };
  } catch {
    return { priority: "medium", reason: "" };
  }
}

export async function summarizeConversation(ticketId: string) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
    "faculty",
  ]);
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("*, profiles:sender_id(first_name, last_name)")
    .eq("ticket_id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  if (!messages || messages.length === 0) return "لا توجد رسائل للتلخيص";

  const conversationText = messages
    .map(
      (m: any) =>
        `${m.profiles?.first_name || "مجهول"} ${m.profiles?.last_name || ""}: ${m.body}`
    )
    .join("\n");

  const prompt = `لخص المحادثة التالية في التذكرة الأكاديمية بالعربية في 3-5 نقاط:\n\n${conversationText}\n\nالملخص:`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
    });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return "فشل في تلخيص المحادثة";
  }
}
