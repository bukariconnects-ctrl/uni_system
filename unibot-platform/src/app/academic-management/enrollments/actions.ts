"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getOpenSections() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sections")
    .select("id, section_code, max_capacity, enrolled_count, courses(code, name), semesters(name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getStudents() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, student_profiles(student_number)")
    .eq("tenant_id", profile.tenant_id)
    .eq("role", "student")
    .eq("account_status", "active")
    .order("first_name");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function batchEnroll(
  sectionId: string,
  semesterId: string,
  studentIds: string[]
) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const results: { success: number; errors: string[] } = {
    success: 0,
    errors: [],
  };

  for (const studentId of studentIds) {
    const { error } = await supabase.from("enrollments").insert({
      tenant_id: profile.tenant_id,
      student_id: studentId,
      section_id: sectionId,
      semester_id: semesterId,
      status: "enrolled",
    });

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        results.errors.push(`الطالب مسجل بالفعل في هذه الشعبة`);
      } else {
        results.errors.push(error.message);
      }
    } else {
      results.success++;
    }
  }

  revalidatePath("/academic-management/enrollments");
  return results;
}

export async function getEnrollments() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select("id, status, enrolled_at, profiles!enrollments_student_id_fkey(first_name, last_name, student_profiles(student_number)), sections(section_code, courses(code, name)), semesters(name)")
    .eq("tenant_id", profile.tenant_id)
    .order("enrolled_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateEnrollmentStatus(
  id: string,
  status: "enrolled" | "dropped"
) {
  await requireRole(["academic_management"]);
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "dropped") {
    updateData.dropped_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("enrollments")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/enrollments");
}
