"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

type ScheduleDay = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

/**
 * Fetch course_schedules with related study-plan, course, venue, and instructor info.
 */
export async function getCourseSchedules() {
  const { profile } = await requireRole(["academic_management", "head_of_department"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("course_schedules")
    .select(`
      *,
      study_plan_courses!inner(
        course_id,
        courses(name, code, credit_hours, course_type),
        academic_level_id,
        academic_levels(name, level_number, major_id, majors(name, code)),
        semester_type
      ),
      venues(name, code, capacity, venue_type),
      instructors:profiles!fk_course_schedules_instructor(first_name, last_name)
    `)
    .eq("tenant_id", profile.tenant_id)
    .order("day_of_week")
    .order("start_time");

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Fetch study-plan courses for a given major + academic_level + semester_type.
 * Returns courses that need schedule entries.
 */
export async function getStudyPlanCoursesForScheduling(
  majorId: string,
  academicLevelId: string,
  semesterType: "first" | "second" | "summer"
) {
  const { profile } = await requireRole(["academic_management", "head_of_department"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("study_plan_courses")
    .select(`
      id, course_id, plan_course_type, min_grade_to_pass,
      courses(id, code, name, credit_hours, course_type, department_id),
      academic_levels(id, name, level_number, major_id)
    `)
    .eq("academic_level_id", academicLevelId)
    .eq("semester_type", semesterType)
    .eq("courses.is_active", true);

  if (error) throw new Error(error.message);

  // Also fetch existing schedules for these study-plan courses
  const spcIds = (data || []).map((spc) => spc.id);
  let existingSchedules: any[] = [];
  if (spcIds.length > 0) {
    const { data: schedData } = await supabase
      .from("course_schedules")
      .select(`
        *,
        venues(name, code, capacity),
        instructors:profiles!fk_course_schedules_instructor(first_name, last_name)
      `)
      .in("study_plan_course_id", spcIds)
      .eq("tenant_id", profile.tenant_id);
    existingSchedules = schedData || [];
  }

  return {
    studyPlanCourses: data || [],
    existingSchedules,
  };
}

/** Fetch venues for scheduling */
export async function getVenuesForScheduling() {
  const { profile } = await requireRole(["academic_management", "head_of_department"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("venues")
    .select("id, name, code, venue_type, capacity, campus_id")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("name");

  return data || [];
}

/** Fetch faculty members (potential instructors) */
export async function getFacultyForScheduling() {
  const { profile } = await requireRole(["academic_management", "head_of_department"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("tenant_id", profile.tenant_id)
    .in("role", ["faculty", "lecturer"])
    .eq("account_status", "active")
    .order("first_name");

  return data || [];
}

/** Fetch semesters for filter */
export async function getSemestersForScheduling() {
  const { profile } = await requireRole(["academic_management", "head_of_department"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("semesters")
    .select("id, name, status, semester_type")
    .eq("tenant_id", profile.tenant_id)
    .in("status", ["planning", "registration", "active"])
    .order("created_at", { ascending: false });

  return data || [];
}

/** Fetch majors scoped to user's department */
export async function getMajorsForScheduling() {
  const { profile } = await requireRole(["academic_management", "head_of_department"]);
  const supabase = await createClient();

  const { data: amd } = await supabase
    .from("academic_management_departments")
    .select("department_id")
    .eq("profile_id", profile.id)
    .single();

  const query = supabase
    .from("majors")
    .select("id, name, code, department_id")
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  if (amd?.department_id) query.eq("department_id", amd.department_id);

  const { data } = await query;
  return data || [];
}

/** Create a course_schedule entry */
export async function createCourseSchedule(formData: FormData) {
  const { profile } = await requireRole(["academic_management", "head_of_department"]);
  const supabase = await createClient();

  const study_plan_course_id = formData.get("study_plan_course_id") as string;
  const semester_id = formData.get("semester_id") as string;
  const component_type = formData.get("component_type") as string;
  const day_of_week = formData.get("day_of_week") as ScheduleDay;
  const start_time = formData.get("start_time") as string;
  const end_time = formData.get("end_time") as string;
  const venue_id = (formData.get("venue_id") as string) || null;
  const instructor_id = (formData.get("instructor_id") as string) || null;

  if (start_time >= end_time) {
    throw new Error("وقت البداية يجب أن يكون قبل وقت النهاية");
  }

  const { error } = await supabase.from("course_schedules").insert({
    tenant_id: profile.tenant_id,
    semester_id,
    study_plan_course_id,
    component_type,
    day_of_week,
    start_time,
    end_time,
    venue_id,
    instructor_id,
    status: "draft",
  });

  if (error) {
    // The conflict trigger raises readable errors
    throw new Error(error.message);
  }

  revalidatePath("/academic-management/schedules");
}

/** Update a course_schedule entry */
export async function updateCourseSchedule(id: string, formData: FormData) {
  const { profile } = await requireRole(["academic_management", "head_of_department"]);
  const supabase = await createClient();

  const day_of_week = formData.get("day_of_week") as ScheduleDay;
  const start_time = formData.get("start_time") as string;
  const end_time = formData.get("end_time") as string;
  const venue_id = (formData.get("venue_id") as string) || null;
  const instructor_id = (formData.get("instructor_id") as string) || null;
  const status = (formData.get("status") as string) || undefined;

  if (start_time >= end_time) {
    throw new Error("وقت البداية يجب أن يكون قبل وقت النهاية");
  }

  const updates: Record<string, any> = {
    day_of_week,
    start_time,
    end_time,
    venue_id,
    instructor_id,
  };
  if (status) updates.status = status;

  const { error } = await supabase
    .from("course_schedules")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/schedules");
}

/** Delete a course_schedule entry */
export async function deleteCourseSchedule(id: string) {
  await requireRole(["academic_management", "head_of_department"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("course_schedules")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/schedules");
}

/** Publish / unpublish a course_schedule entry */
export async function toggleScheduleStatus(id: string, status: "draft" | "published") {
  await requireRole(["academic_management", "head_of_department"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("course_schedules")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/schedules");
}
