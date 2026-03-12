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
    .select("*, courses(code, name, credit_hours), semesters(name, status), profiles!sections_instructor_id_fkey(first_name, last_name)")
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
    .in("status", ["planning", "active"])
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

export async function createSection(formData: FormData) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { error } = await supabase.from("sections").insert({
    tenant_id: profile.tenant_id,
    course_id: formData.get("course_id") as string,
    semester_id: formData.get("semester_id") as string,
    section_code: formData.get("section_code") as string,
    instructor_id: (formData.get("instructor_id") as string) || null,
    max_capacity: parseInt(formData.get("max_capacity") as string) || 40,
    status: "open",
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("كود الشعبة مكرر لنفس المقرر والفصل");
    throw new Error(error.message);
  }
  revalidatePath("/academic-management/sections");
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
