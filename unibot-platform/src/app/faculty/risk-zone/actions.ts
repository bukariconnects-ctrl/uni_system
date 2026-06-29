"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getFacultyRiskScores() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { data: schedules } = await supabase
    .from("course_schedules")
    .select("study_plan_courses!inner(course_id)")
    .eq("instructor_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  if (!schedules || schedules.length === 0) return [];

  const courseIds = [...new Set(schedules.map((s: any) => s.study_plan_courses?.course_id).filter(Boolean))];

  const { data } = await supabase
    .from("student_risk_scores")
    .select(
      "*, profiles!student_risk_scores_student_id_fkey(first_name, last_name, email), courses!student_risk_scores_course_id_fkey(code, name)"
    )
    .eq("tenant_id", profile.tenant_id)
    .in("course_id", courseIds)
    .in("risk_level", ["high", "critical"])
    .order("risk_score", { ascending: false });

  return data || [];
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
