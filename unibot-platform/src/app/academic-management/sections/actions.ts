"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { SectionStatus } from "@/lib/types/database";

export async function getSections() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sections")
    .select("*, courses(code, name, credit_hours, course_type), semesters(name, status), profiles!sections_instructor_id_fkey(first_name, last_name), parent:parent_section_id(section_code)")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getCoursesForSections() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("courses")
    .select("id, code, name")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("code");

  return data || [];
}

export async function getSemestersForSections() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("semesters")
    .select("id, name, status")
    .eq("tenant_id", profile.tenant_id)
    .in("status", ["planning", "registration", "active"])
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getFacultyForSections() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("tenant_id", profile.tenant_id)
    .in("role", ["faculty", "academic_management"])
    .eq("account_status", "active")
    .order("first_name");

  return data || [];
}

async function assertDepartmentScope(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string, courseId: string) {
  const { data: amdRow } = await supabase
    .from("academic_management_departments")
    .select("department_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!amdRow) return; // No department restriction — full tenant access

  const { data: course } = await supabase
    .from("courses")
    .select("department_id")
    .eq("id", courseId)
    .single();

  if (course && course.department_id !== amdRow.department_id) {
    throw new Error("ليس لديك صلاحية إنشاء شعبة لهذا المقرر — المقرر ينتمي لقسم آخر");
  }
}

export async function createSection(formData: FormData) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const courseId = formData.get("course_id") as string;
  await assertDepartmentScope(supabase, profile.id, courseId);

  const { error } = await supabase.from("sections").insert({
    tenant_id: profile.tenant_id,
    course_id: courseId,
    semester_id: formData.get("semester_id") as string,
    section_code: formData.get("section_code") as string,
    instructor_id: (formData.get("instructor_id") as string) || null,
    max_capacity: parseInt(formData.get("max_capacity") as string) || 40,
    section_type: "lecture",
    status: "open",
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("كود الشعبة مكرر لنفس المقرر والفصل");
    throw new Error(error.message);
  }
  revalidatePath("/academic-management/sections");
}

export async function createLabSection(formData: FormData) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const parent_section_id = formData.get("parent_section_id") as string;

  const { data: parentSection, error: parentError } = await supabase
    .from("sections")
    .select("course_id, semester_id, section_type")
    .eq("id", parent_section_id)
    .single();

  if (parentError || !parentSection) throw new Error("الشعبة الأم غير موجودة");
  if (parentSection.section_type !== "lecture")
    throw new Error("لا يمكن إنشاء شعبة معمل تابعة لشعبة معمل أخرى");

  await assertDepartmentScope(supabase, profile.id, parentSection.course_id);

  const { error } = await supabase.from("sections").insert({
    tenant_id: profile.tenant_id,
    course_id: parentSection.course_id,
    semester_id: parentSection.semester_id,
    section_code: formData.get("section_code") as string,
    instructor_id: (formData.get("instructor_id") as string) || null,
    max_capacity: parseInt(formData.get("max_capacity") as string) || 20,
    parent_section_id,
    section_type: "lab",
    status: "open",
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("كود الشعبة مكرر لنفس المقرر والفصل");
    throw new Error(error.message);
  }
  revalidatePath("/academic-management/sections");
}

export async function getLabSectionsForParent(parentSectionId: string) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sections")
    .select("*, profiles!sections_instructor_id_fkey(first_name, last_name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("parent_section_id", parentSectionId)
    .order("section_code");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateSectionStatus(id: string, status: SectionStatus) {
  await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("sections")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/sections");
}

export async function updateSectionInstructor(id: string, instructorId: string) {
  await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("sections")
    .update({ instructor_id: instructorId || null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/sections");
}

export async function mergeSection(sourceId: string, targetId: string) {
  await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("sections")
    .update({ status: "merged" as SectionStatus, merged_into_id: targetId })
    .eq("id", sourceId);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/sections");
}
