"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { SemesterType, PlanCourseType } from "@/lib/types/database";

export async function getMajorsWithLevels() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("majors")
    .select("id, name, code, departments(name, colleges(name)), academic_levels(id, level_number, name)")
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getCourses() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("id, code, name, credit_hours, course_type")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("code");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getStudyPlanCourses(majorId: string) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: levels } = await supabase
    .from("academic_levels")
    .select("id")
    .eq("major_id", majorId)
    .eq("tenant_id", profile.tenant_id);

  if (!levels || levels.length === 0) return [];

  const levelIds = levels.map((l) => l.id);

  const { data, error } = await supabase
    .from("study_plan_courses")
    .select("*, courses(id, code, name, credit_hours, course_type)")
    .eq("tenant_id", profile.tenant_id)
    .in("academic_level_id", levelIds);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPrerequisites(majorId: string) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: levels } = await supabase
    .from("academic_levels")
    .select("id")
    .eq("major_id", majorId)
    .eq("tenant_id", profile.tenant_id);

  if (!levels || levels.length === 0) return [];

  const levelIds = levels.map((l) => l.id);

  const { data: planCourses } = await supabase
    .from("study_plan_courses")
    .select("course_id")
    .eq("tenant_id", profile.tenant_id)
    .in("academic_level_id", levelIds);

  if (!planCourses || planCourses.length === 0) return [];

  const courseIds = planCourses.map((pc) => pc.course_id);

  const { data, error } = await supabase
    .from("course_prerequisites")
    .select("*, courses!course_prerequisites_prerequisite_id_fkey(code, name)")
    .eq("tenant_id", profile.tenant_id)
    .in("course_id", courseIds);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function addStudyPlanCourse(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("study_plan_courses").insert({
    tenant_id: profile.tenant_id,
    academic_level_id: formData.get("academic_level_id") as string,
    course_id: formData.get("course_id") as string,
    semester_type: formData.get("semester_type") as SemesterType,
    plan_course_type: formData.get("plan_course_type") as PlanCourseType,
    min_grade_to_pass: parseFloat(formData.get("min_grade_to_pass") as string) || 60,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("هذا المقرر مُضاف بالفعل لنفس المستوى والفصل");
    throw new Error(error.message);
  }
  revalidatePath("/tenant-admin/study-plans");
}

export async function removeStudyPlanCourse(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("study_plan_courses").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/study-plans");
}

export async function addPrerequisite(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const course_id = formData.get("course_id") as string;
  const prerequisite_id = formData.get("prerequisite_id") as string;

  if (course_id === prerequisite_id) {
    throw new Error("لا يمكن للمقرر أن يكون متطلباً لنفسه");
  }

  const { error } = await supabase.from("course_prerequisites").insert({
    tenant_id: profile.tenant_id,
    course_id,
    prerequisite_id,
    min_grade: parseFloat(formData.get("min_grade") as string) || 60,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("هذا المتطلب مُضاف بالفعل");
    throw new Error(error.message);
  }
  revalidatePath("/tenant-admin/study-plans");
}

export async function removePrerequisite(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("course_prerequisites").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/study-plans");
}
