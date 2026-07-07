"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TicketCategory } from "@/lib/types/database";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function getFacultyAssignedTickets() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  // Tickets assigned or escalated to faculty — include both assigned_to
  // and created_by so no triggered ticket slips through.
  const { data: assigned } = await supabase
    .from("tickets")
    .select("*, profiles:created_by(first_name, last_name, role), assigned_profile:assigned_to(first_name, last_name)")
    .eq("tenant_id", profile.tenant_id)
    .or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`)
    .order("created_at", { ascending: false });

  return assigned || [];
}

export async function getFacultyCreatedTickets() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("tickets")
    .select("*, profiles:created_by(first_name, last_name), assigned_profile:assigned_to(first_name, last_name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function createFacultyTicket(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const category = formData.get("category") as TicketCategory;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

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

  const { error } = await supabase.from("tickets").insert({
    tenant_id: profile.tenant_id,
    created_by: profile.id,
    category,
    priority,
    priority_reason: priorityReason,
    title,
    description,
    status: "open",
    ai_attempted: false,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/tickets");
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "resolved") updateData.resolved_at = new Date().toISOString();
  if (status === "closed") updateData.closed_at = new Date().toISOString();

  const { error } = await supabase
    .from("tickets")
    .update(updateData)
    .eq("id", ticketId)
    .eq("tenant_id", profile.tenant_id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/tickets");
}

export async function sendFacultyTicketMessage(ticketId: string, body: string) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { error } = await supabase.from("ticket_messages").insert({
    tenant_id: profile.tenant_id,
    ticket_id: ticketId,
    sender_id: profile.id,
    body,
    is_internal: false,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/tickets");
}

export async function getTicketMessages(ticketId: string) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("ticket_messages")
    .select("*, profiles:sender_id(first_name, last_name)")
    .eq("ticket_id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  return data || [];
}

export async function escalateTicket(ticketId: string, reason: string) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  // Get current ticket
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (!ticket) throw new Error("التذكرة غير موجودة");

  // Find academic management users to escalate to
  const { data: managementUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .eq("role", "academic_management")
    .limit(1);

  const targetId = managementUsers?.[0]?.id;
  if (!targetId) throw new Error("لا يوجد مستخدمين في الإدارة الأكاديمية");

  // Create escalation record
  await supabase.from("ticket_escalations").insert({
    tenant_id: profile.tenant_id,
    ticket_id: ticketId,
    escalated_by: profile.id,
    escalated_to: targetId,
    from_role: "faculty",
    to_role: "academic_management",
    reason,
    previous_status: ticket.status,
  });

  // Update ticket - assign to management and add internal note about escalation
  await supabase
    .from("tickets")
    .update({
      assigned_to: targetId,
      status: "in_progress",
      is_direct_to_faculty: false,  // return to admin queue so academic_management can see it
    })
    .eq("id", ticketId)
    .eq("tenant_id", profile.tenant_id);

  // Add internal message about escalation
  await supabase.from("ticket_messages").insert({
    tenant_id: profile.tenant_id,
    ticket_id: ticketId,
    sender_id: profile.id,
    body: `🔼 تم تصعيد التذكرة إلى الإدارة الأكاديمية. السبب: ${reason}`,
    is_internal: true,
  });

  // Notify all academic_management users
  const { data: allAdmins } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .eq("role", "academic_management");

  if (allAdmins && allAdmins.length > 0) {
    await supabase.from("notifications").insert(
      allAdmins.map((admin) => ({
        tenant_id: profile.tenant_id,
        recipient_id: admin.id,
        notification_type: "ticket_assigned" as any,
        title: `🔼 تصعيد تذكرة: ${ticket.title}`,
        body: `محاضر قام بتصعيد تذكرة. السبب: ${reason}`,
        reference_table: "tickets",
        reference_id: ticketId,
      }))
    );
  }

  revalidatePath("/faculty/tickets");
  revalidatePath("/academic-management/tickets");
}

export async function getEscalationHistory(ticketId: string) {
  const { profile } = await requireRole(["faculty", "academic_management"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("ticket_escalations")
    .select("*, escalated_by_profile:escalated_by(first_name, last_name), escalated_to_profile:escalated_to(first_name, last_name)")
    .eq("ticket_id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  return data || [];
}

export async function summarizeConversation(ticketId: string) {
  const { profile } = await requireRole(["faculty", "academic_management"]);
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("*, profiles:sender_id(first_name, last_name)")
    .eq("ticket_id", ticketId)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  if (!messages || messages.length === 0) return "لا توجد رسائل";

  const conversationText = messages
    .map((m: any) => `${m.profiles?.first_name || ""} ${m.profiles?.last_name || ""}: ${m.body}`)
    .join("\n");

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
    });
    const result = await model.generateContent(
      `لخص المحادثة التالية بالعربية في 3-5 نقاط:\n\n${conversationText}\n\nالملخص:`
    );
    return result.response.text().trim();
  } catch {
    return "فشل التلخيص";
  }
}

async function analyzePriority(description: string, category: TicketCategory) {
  const prompt = `أنت محلل أولويات للتذاكر. حلل:
التصنيف: ${category}
الوصف: ${description}

أعد JSON فقط: {"priority": "urgent"|"high"|"medium"|"low", "reason": "سبب مختصر"}`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const valid = ["urgent", "high", "medium", "low"];
    return {
      priority: valid.includes(parsed.priority) ? parsed.priority : "medium",
      reason: parsed.reason || null,
    };
  } catch {
    return { priority: "medium", reason: "" };
  }
}
