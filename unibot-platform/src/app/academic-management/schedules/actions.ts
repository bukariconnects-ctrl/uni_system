"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { ScheduleDay, ScheduleStatus } from "@/lib/types/database";

const CONFLICT_MESSAGES: Record<string, string> = {
  SPATIAL_CONFLICT: "تعارض مكاني: القاعة محجوزة في نفس الوقت",
  FACULTY_CONFLICT: "تعارض المحاضر: المحاضر لديه محاضرة أخرى في نفس الوقت",
  STUDENT_CONFLICT: "تعارض طلابي: مقرر إجباري في نفس المستوى الأكاديمي مجدول في نفس الوقت",
  INVALID_STATE_TRANSITION: "انتقال الحالة غير صالح للفصل الدراسي",
};

function parseConflictError(message: string): string {
  for (const [key, arabic] of Object.entries(CONFLICT_MESSAGES)) {
    if (message.includes(key)) {
      return arabic;
    }
  }
  return message;
}

export async function getSchedules() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("schedules")
    .select("*, sections(section_code, courses(code, name), profiles!sections_instructor_id_fkey(first_name, last_name), semesters(name)), venues(name, code)")
    .eq("tenant_id", profile.tenant_id)
    .order("day_of_week")
    .order("start_time");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getSectionsForSchedule() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("sections")
    .select("id, section_code, section_type, parent_section_id, course_id, semester_id, instructor_id, courses(code, name, course_type), semesters(name, status), profiles!sections_instructor_id_fkey(first_name, last_name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getVenuesForSchedule() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("venues")
    .select("id, name, code, venue_type, capacity, campus_id, campuses(name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("name");

  return data || [];
}

export async function createSchedule(formData: FormData) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const section_id = formData.get("section_id") as string;
  const venue_id = (formData.get("venue_id") as string) || null;
  const day_of_week = formData.get("day_of_week") as ScheduleDay;
  const start_time = formData.get("start_time") as string;
  const end_time = formData.get("end_time") as string;

  if (start_time >= end_time) {
    throw new Error("وقت البداية يجب أن يكون قبل وقت النهاية");
  }

  const { error } = await supabase.from("schedules").insert({
    tenant_id: profile.tenant_id,
    section_id,
    venue_id,
    day_of_week,
    start_time,
    end_time,
    status: "draft" as ScheduleStatus,
  });

  if (error) {
    throw new Error(parseConflictError(error.message));
  }

  revalidatePath("/academic-management/schedules");
}

export async function updateScheduleStatus(id: string, status: ScheduleStatus) {
  await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("schedules")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(parseConflictError(error.message));
  revalidatePath("/academic-management/schedules");
}

export async function deleteSchedule(id: string) {
  await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { error } = await supabase.from("schedules").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/schedules");
}

export async function updateSchedule(id: string, formData: FormData) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const venue_id = (formData.get("venue_id") as string) || null;
  const day_of_week = formData.get("day_of_week") as ScheduleDay;
  const start_time = formData.get("start_time") as string;
  const end_time = formData.get("end_time") as string;

  if (start_time >= end_time) {
    throw new Error("وقت البداية يجب أن يكون قبل وقت النهاية");
  }

  const { error } = await supabase
    .from("schedules")
    .update({ venue_id, day_of_week, start_time, end_time })
    .eq("id", id);

  if (error) {
    throw new Error(parseConflictError(error.message));
  }

  revalidatePath("/academic-management/schedules");
}
