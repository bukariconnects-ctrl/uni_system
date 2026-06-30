"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
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

export async function getCourses(departmentId?: string) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  let query = supabase
    .from("courses")
    .select("id, code, name, credit_hours, course_type, department_id")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("code");

  if (departmentId) query = query.eq("department_id", departmentId);

  const { data, error } = await query;
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

  // --- Auto-Enrollment Logic ---
  const academic_level_id = formData.get("academic_level_id") as string;
  const course_id = formData.get("course_id") as string;
  const semester_type = formData.get("semester_type") as SemesterType;

  const serviceClient = createServiceClient();
  
  // 1. Find active semester of this type
  const { data: activeSemester } = await serviceClient
    .from("semesters")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .eq("semester_type", semester_type)
    .in("status", ["registration", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (activeSemester) {
    // 2. Find all students currently in this academic_level
    const { data: studentsInLevel } = await serviceClient
      .from("student_majors")
      .select("student_id")
      .eq("tenant_id", profile.tenant_id)
      .eq("academic_level_id", academic_level_id)
      .eq("is_primary", true);

    if (studentsInLevel && studentsInLevel.length > 0) {
      const studentIds = studentsInLevel.map(s => s.student_id);

      // 3. Find existing enrollments to avoid duplicates
      const { data: existingEnrollments } = await serviceClient
        .from("enrollments")
        .select("student_id")
        .eq("tenant_id", profile.tenant_id)
        .eq("semester_id", activeSemester.id)
        .eq("course_id", course_id)
        .in("student_id", studentIds);

      const enrolledIds = new Set(existingEnrollments?.map(e => e.student_id) || []);
      const studentsToEnroll = studentIds.filter(id => !enrolledIds.has(id));

      if (studentsToEnroll.length > 0) {
        const enrollmentsToInsert = studentsToEnroll.map(id => ({
          tenant_id: profile.tenant_id,
          student_id: id,
          course_id: course_id,
          semester_id: activeSemester.id,
          status: "enrolled",
        }));

        await serviceClient.from("enrollments").insert(enrollmentsToInsert);
      }
    }
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
