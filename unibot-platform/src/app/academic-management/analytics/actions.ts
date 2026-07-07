"use server";

import { createClient, createAdminClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { computeRiskScores } from "@/lib/risk-computation";

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

  // Try computed student_risk_scores first
  let query = supabase
    .from("student_risk_scores")
    .select(
      "*, profiles!student_risk_scores_student_id_fkey(first_name, last_name, email), courses!student_risk_scores_course_id_fkey(code, name)"
    )
    .eq("tenant_id", profile.tenant_id)
    .in("risk_level", ["high", "critical"])
    .order("risk_score", { ascending: false });

  if (semesterId) {
    query = query.eq("semester_id", semesterId);
  }

  const { data } = await query;

  let result = data || [];
  if (scopedCourseIds !== null) {
    result = result.filter(
      (r: any) => r.course_id && scopedCourseIds.includes(r.course_id)
    );
  }

  // If computed data exists, return it
  if (result.length > 0) {
    return result;
  }

  // Fallback: use v_academic_risk_students view (real-time from attendance)
  const targetCourses = scopedCourseIds ?? undefined;
  let viewQuery = supabase
    .from("v_academic_risk_students")
    .select("student_id, first_name, last_name, course_id, course_code, course_name, risk_status, absence_percentage, is_dismissed, student_major_name, student_level_name")
    .eq("tenant_id", profile.tenant_id)
    .in("risk_status", ["at_risk", "dismissed"]);

  if (targetCourses) {
    viewQuery = viewQuery.in("course_id", targetCourses);
  }

  const { data: viewData } = await viewQuery.order("absence_percentage", { ascending: false });

  return (viewData || []).map((r: any) => ({
    id: r.student_id,
    student_id: r.student_id,
    course_id: r.course_id,
    risk_level: r.is_dismissed ? "critical" : "high",
    risk_score: Math.min(Math.round(r.absence_percentage || 0), 100),
    absence_factor: 0,
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
      "*, courses!course_risk_flags_course_id_fkey(code, name)"
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
    (r: any) => r.course_id && scopedCourseIds.includes(r.course_id)
  );
}

export async function getAllRiskScores(semesterId?: string) {
  const { profile } = await requireRole([
    "academic_management",
    "tenant_admin",
  ]);
  const supabase = await createClient();

  const scopedCourseIds = await getScopedCourseIds(supabase, profile);

  // Try computed student_risk_scores first
  let query = supabase
    .from("student_risk_scores")
    .select("risk_level, course_id, courses!student_risk_scores_course_id_fkey(id)")
    .eq("tenant_id", profile.tenant_id);

  if (semesterId) {
    query = query.eq("semester_id", semesterId);
  }

  const { data } = await query;

  let result = data || [];
  if (scopedCourseIds !== null) {
    result = result.filter(
      (r: any) => r.course_id && scopedCourseIds.includes(r.course_id)
    );
  }

  // If computed data exists, return it
  if (result.length > 0) {
    return result;
  }

  // Fallback: use v_academic_risk_students view (real-time from attendance)
  // to get risk_status for as many students as possible
  const targetCourses = scopedCourseIds ?? undefined;
  let viewQuery = supabase
    .from("v_academic_risk_students")
    .select("student_id, course_id, risk_status")
    .eq("tenant_id", profile.tenant_id);

  if (targetCourses) {
    viewQuery = viewQuery.in("course_id", targetCourses);
  }

  const { data: viewData } = await viewQuery;

  if (viewData && viewData.length > 0) {
    return viewData.map((r: any) => ({
      risk_level:
        r.risk_status === "dismissed"
          ? "critical"
          : r.risk_status === "at_risk"
            ? "high"
            : "low",
    }));
  }

  return [];
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

  if (!profile.tenant_id) {
    throw new Error("لا يوجد مستأجر مرتبط بحسابك");
  }

  const adminClient = await createAdminClient();
  const result = await computeRiskScores(adminClient, profile.tenant_id, semesterId);
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

  revalidatePath("/academic-management/analytics");
}
