"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { CourseType, SemesterType, PlanCourseType } from "@/lib/types/database";

export async function getCourses() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*, departments(name)")
    .eq("tenant_id", profile.tenant_id)
    .order("code");

  if (error) throw new Error(error.message);
  return data;
}

export async function getDepartments() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("departments")
    .select("id, name, code")
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createCourse(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const department_id = formData.get("department_id") as string;
  if (!department_id) throw new Error("يجب اختيار القسم");

  const { error } = await supabase.from("courses").insert({
    tenant_id: profile.tenant_id,
    department_id,
    code: formData.get("code") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    credit_hours: parseInt(formData.get("credit_hours") as string),
    course_type: formData.get("course_type") as CourseType,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("كود المقرر مكرر، يرجى استخدام كود آخر");
    throw new Error(error.message);
  }
  revalidatePath("/tenant-admin/courses");
}

export async function updateCourse(id: string, formData: FormData) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({
      department_id: formData.get("department_id") as string,
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      credit_hours: parseInt(formData.get("credit_hours") as string),
      course_type: formData.get("course_type") as CourseType,
      is_active: formData.get("is_active") === "true",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/courses");
}

export async function deleteCourse(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  // Soft delete — deactivate instead of removing
  const { error } = await supabase.from("courses").update({ is_active: false }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/courses");
}

export async function restoreCourse(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("courses").update({ is_active: true }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/courses");
}

export async function getStudyPlanData() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const [levels, courses, planCourses, prerequisites] = await Promise.all([
    supabase
      .from("academic_levels")
      .select("id, level_number, name, major_id, majors(name, code)")
      .eq("tenant_id", profile.tenant_id)
      .order("level_number"),
    supabase
      .from("courses")
      .select("id, code, name, credit_hours, course_type")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("code"),
    supabase
      .from("study_plan_courses")
      .select("*, courses(code, name, credit_hours), academic_levels(level_number, name, majors(name))")
      .eq("tenant_id", profile.tenant_id),
    supabase
      .from("course_prerequisites")
      .select("*, courses!course_prerequisites_prerequisite_id_fkey(code, name)")
      .eq("tenant_id", profile.tenant_id),
  ]);

  if (levels.error) throw new Error(levels.error.message);
  if (courses.error) throw new Error(courses.error.message);
  if (planCourses.error) throw new Error(planCourses.error.message);
  if (prerequisites.error) throw new Error(prerequisites.error.message);

  return {
    levels: levels.data || [],
    courses: courses.data || [],
    planCourses: planCourses.data || [],
    prerequisites: prerequisites.data || [],
  };
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
  revalidatePath("/tenant-admin/courses");
}

export async function removeStudyPlanCourse(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("study_plan_courses").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/courses");
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
    if (error.message.includes("chk_no_self_prerequisite"))
      throw new Error("لا يمكن للمقرر أن يكون متطلباً لنفسه");
    throw new Error(error.message);
  }
  revalidatePath("/tenant-admin/courses");
}

export async function removePrerequisite(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("course_prerequisites").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/courses");
}
