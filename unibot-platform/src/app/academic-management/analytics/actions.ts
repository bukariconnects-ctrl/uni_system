"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

async function getScopedCourseIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: { id: string; tenant_id: string | null; role: string }
): Promise<string[] | null> {
  if (profile.role === "tenant_admin") return null;

  const { data: amdRow } = await supabase
    .from("academic_management_departments")
    .select("department_id")
    .eq("profile_id", profile.id)
    .single();

  if (!amdRow?.department_id) return null;

  const { data: majorsData } = await supabase
    .from("majors")
    .select("id")
    .eq("department_id", amdRow.department_id);

  const majorIds = (majorsData || []).map((m) => m.id);
  
  let scopedCourseIds: string[] = [];
  
  if (majorIds.length > 0) {
    // Get academic_level_ids for these majors
    const { data: levelsData } = await supabase
      .from("academic_levels")
      .select("id")
      .in("major_id", majorIds);
    const levelIds = (levelsData || []).map((l) => l.id);

    if (levelIds.length > 0) {
      const { data: spcData } = await supabase
        .from("study_plan_courses")
        .select("course_id")
        .in("academic_level_id", levelIds);
      scopedCourseIds = [...new Set((spcData || []).map((s) => s.course_id))];
    }
  }
  
  // Fallback: if no courses from study_plan, get courses from the department directly
  if (scopedCourseIds.length === 0) {
    const { data: deptCourses } = await supabase
      .from("courses")
      .select("id")
      .eq("department_id", amdRow.department_id)
      .eq("is_active", true);
    scopedCourseIds = (deptCourses || []).map((c) => c.id);
  }

  return scopedCourseIds;
}

export async function getRiskZoneData(semesterId?: string) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const scopedCourseIds = await getScopedCourseIds(supabase, profile);

  let query = supabase
    .from("student_risk_scores")
    .select(
      "*, profiles!student_risk_scores_student_id_fkey(first_name, last_name, email), sections!student_risk_scores_section_id_fkey(section_code, course_id, courses(name))"
    )
    .eq("tenant_id", profile.tenant_id)
    .in("risk_level", ["high", "critical"])
    .order("risk_score", { ascending: false });

  if (semesterId) {
    query = query.eq("semester_id", semesterId);
  }

  const { data } = await query;

  if (scopedCourseIds === null) return data || [];
  return (data || []).filter(
    (r: any) => r.sections?.course_id && scopedCourseIds.includes(r.sections.course_id)
  );
}

export async function getCourseRiskFlags(semesterId?: string) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const scopedCourseIds = await getScopedCourseIds(supabase, profile);

  let query = supabase
    .from("course_risk_flags")
    .select(
      "*, sections!course_risk_flags_section_id_fkey(section_code, course_id, courses(name), instructor_id, profiles!sections_instructor_id_fkey(first_name, last_name))"
    )
    .eq("tenant_id", profile.tenant_id)
    .eq("flagged", true)
    .order("avg_risk_score", { ascending: false });

  if (semesterId) {
    query = query.eq("semester_id", semesterId);
  }

  const { data } = await query;

  if (scopedCourseIds === null) return data || [];
  return (data || []).filter(
    (r: any) => r.sections?.course_id && scopedCourseIds.includes(r.sections.course_id)
  );
}

export async function getAllRiskScores(semesterId?: string) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const scopedCourseIds = await getScopedCourseIds(supabase, profile);

  let query = supabase
    .from("student_risk_scores")
    .select("risk_level, section_id, sections!student_risk_scores_section_id_fkey(course_id)")
    .eq("tenant_id", profile.tenant_id);

  if (semesterId) {
    query = query.eq("semester_id", semesterId);
  }

  const { data } = await query;

  if (scopedCourseIds === null) return data || [];
  return (data || []).filter(
    (r: any) => r.sections?.course_id && scopedCourseIds.includes(r.sections.course_id)
  );
}

export async function getSemesters() {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("semesters")
    .select("id, name, status")
    .eq("tenant_id", profile.tenant_id)
    .order("start_date", { ascending: false });

  return data || [];
}

export async function triggerRiskComputation(semesterId: string) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/analytics/compute-risk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenant_id: profile.tenant_id,
      semester_id: semesterId,
    }),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error);
  revalidatePath("/academic-management/analytics");
  return result;
}

export async function sendRecommendation(formData: FormData) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
    "faculty",
  ]);
  const supabase = await createClient();

  const studentId = formData.get("student_id") as string;
  const sectionId = (formData.get("section_id") as string) || null;
  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const materialUrl = (formData.get("material_url") as string) || null;

  const { error } = await supabase.from("student_recommendations").insert({
    tenant_id: profile.tenant_id,
    student_id: studentId,
    section_id: sectionId,
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

  revalidatePath("/academic-management/analytics");
}
