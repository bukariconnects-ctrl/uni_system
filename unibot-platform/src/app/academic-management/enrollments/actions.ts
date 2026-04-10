"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getOpenSections() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sections")
    .select("id, section_code, section_type, parent_section_id, max_capacity, enrolled_count, courses(code, name, course_type), semesters(name, status)")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "open")
    .is("parent_section_id", null) // only parent/standalone sections for enrollment UI
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getLabSectionsForEnrollment(parentSectionId: string) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sections")
    .select("id, section_code, max_capacity, enrolled_count, profiles!sections_instructor_id_fkey(first_name, last_name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("parent_section_id", parentSectionId)
    .eq("status", "open")
    .order("section_code");

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
  studentIds: string[],
  labSectionId?: string // مطلوب للمقررات الهجينة
) {
  const { profile } = await requireRole(["academic_management"]);
  const serviceClient = createServiceClient();

  // تحقق من نوع الشعبة والمقرر
  const { data: sectionInfo } = await serviceClient
    .from("sections")
    .select("section_type, tenant_id, courses(course_type)")
    .eq("id", sectionId)
    .single();

  const coursesData = sectionInfo?.courses as unknown as { course_type: string } | null;
  const isHybridLecture =
    sectionInfo?.section_type === "lecture" &&
    coursesData?.course_type === "hybrid";

  if (isHybridLecture && !labSectionId) {
    throw new Error(
      "HYBRID_LAB_REQUIRED: هذا المقرر هجين — يجب تحديد شعبة معمل لكل طالب عند التسجيل"
    );
  }

  // Use section's tenant_id to ensure consistency
  const tenantId = sectionInfo?.tenant_id || profile.tenant_id;

  const results: { success: number; errors: string[] } = {
    success: 0,
    errors: [],
  };

  for (const studentId of studentIds) {
    // تسجيل في شعبة النظري
    const { error: lectureError } = await serviceClient.from("enrollments").insert({
      tenant_id: tenantId,
      student_id: studentId,
      section_id: sectionId,
      semester_id: semesterId,
      status: "enrolled",
    });

    if (lectureError) {
      if (lectureError.message.includes("duplicate") || lectureError.message.includes("unique")) {
        results.errors.push(`الطالب مسجل بالفعل في هذه الشعبة`);
      } else if (lectureError.message.includes("ENROLLMENT_BLOCKED")) {
        results.errors.push(`التسجيل محظور: الفصل الدراسي ليس في مرحلة التسجيل`);
      } else {
        results.errors.push(lectureError.message);
      }
      continue;
    }

    // تسجيل تلقائي في شعبة المعمل إذا كان المقرر هجيناً
    if (isHybridLecture && labSectionId) {
      const { error: labError } = await serviceClient.from("enrollments").insert({
        tenant_id: tenantId,
        student_id: studentId,
        section_id: labSectionId,
        semester_id: semesterId,
        status: "enrolled",
      });

      if (labError && !labError.message.includes("duplicate")) {
        results.errors.push(`تحذير: تم تسجيل الطالب في النظري لكن فشل التسجيل في المعمل: ${labError.message}`);
      }
    }

    results.success++;
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
