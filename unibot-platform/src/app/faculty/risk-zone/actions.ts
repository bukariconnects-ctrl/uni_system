"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getFacultyRiskScores() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // Get the faculty's course IDs from course_schedules
  const { data: schedules } = await supabase
    .from("course_schedules")
    .select("study_plan_courses!inner(course_id)")
    .eq("instructor_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  if (!schedules || schedules.length === 0) return [];

  const courseIds = [
    ...new Set(
      schedules
        .map((s: any) => s.study_plan_courses?.course_id)
        .filter(Boolean),
    ),
  ];

  // Use the v_academic_risk_students view which has computed risk_status
  const { data: riskData } = await serviceClient
    .from("v_academic_risk_students")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .in("course_id", courseIds)
    .in("risk_status", ["at_risk", "dismissed"])
    .order("absence_percentage", { ascending: false });

  if (!riskData) return [];

  // Transform to match RiskScore interface expected by the client
  return riskData.map((r: any) => ({
    id: r.summary_id || r.student_id,
    student_id: r.student_id,
    course_id: r.course_id,
    risk_level: r.is_dismissed ? "critical" : "high",
    risk_score: Math.min(Math.round(r.absence_percentage || 0), 100),
    absence_factor: r.unexcused_absences || 0,
    grade_factor: 0,
    engagement_factor: 0,
    student_major_name: r.student_major_name || null,
    student_level_name: r.student_level_name || null,
    profiles: {
      first_name: r.first_name,
      last_name: r.last_name,
      email: "",
    },
    courses: {
      code: r.course_code || "",
      name: r.course_name || "",
    },
  }));
}

export async function sendFacultyRecommendation(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const studentId = formData.get("student_id") as string;
  const courseId = (formData.get("course_id") as string) || null;
  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const materialUrl = (formData.get("material_url") as string) || null;

  const { error } = await supabase.from("student_recommendations").insert({
    tenant_id: profile.tenant_id,
    student_id: studentId,
    course_id: courseId,
    sent_by: profile.id,
    title,
    body,
    material_url: materialUrl,
  });

  if (error) throw new Error(error.message);

  await supabase.from("notifications").insert({
    tenant_id: profile.tenant_id,
    recipient_id: studentId,
    notification_type: "recommendation",
    title: "توصية أكاديمية جديدة",
    body: title,
    reference_table: "student_recommendations",
  });

  revalidatePath("/faculty/risk-zone");
}
