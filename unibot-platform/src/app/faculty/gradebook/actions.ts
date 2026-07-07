"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { generateAutoRecommendation } from "@/lib/ai/recommendation-engine";

export async function getGradebookEntries(
  courseId: string,
  majorId?: string,
  academicLevelId?: string
) {
  await requireRole(["faculty"]);
  const supabase = await createClient();

  let query = supabase
    .from("gradebook_entries")
    .select("*, profiles!gradebook_entries_student_id_fkey(first_name, last_name, student_profiles(student_number)), enrollments(status)")
    .eq("course_id", courseId);

  // If filtering by major/level, constrain to matching enrollments
  if (majorId || academicLevelId) {
    let enrollmentQuery = supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("status", "enrolled");
    if (majorId) enrollmentQuery = enrollmentQuery.eq("major_id", majorId);
    if (academicLevelId) enrollmentQuery = enrollmentQuery.eq("academic_level_id", academicLevelId);

    const { data: filteredEnrollments } = await enrollmentQuery;
    const enrollmentIds = (filteredEnrollments || []).map((e: any) => e.id);

    if (enrollmentIds.length === 0) return [];
    query = query.in("enrollment_id", enrollmentIds);
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function initGradebook(
  courseId: string,
  majorId?: string,
  academicLevelId?: string
) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  let enrollmentQuery = supabase
    .from("enrollments")
    .select("id, student_id")
    .eq("course_id", courseId)
    .eq("status", "enrolled");
  if (majorId) enrollmentQuery = enrollmentQuery.eq("major_id", majorId);
  if (academicLevelId) enrollmentQuery = enrollmentQuery.eq("academic_level_id", academicLevelId);

  const { data: enrollments } = await enrollmentQuery;

  if (!enrollments || enrollments.length === 0) {
    throw new Error("لا يوجد طلاب مسجلون في هذه المادة");
  }

  const { data: existing } = await supabase
    .from("gradebook_entries")
    .select("enrollment_id")
    .eq("course_id", courseId);

  const existingIds = new Set((existing || []).map((e: any) => e.enrollment_id));

  const newEntries = enrollments
    .filter((e: any) => !existingIds.has(e.id))
    .map((e: any) => ({
      tenant_id: profile.tenant_id,
      enrollment_id: e.id,
      course_id: courseId,
      student_id: e.student_id,
      recorded_by: profile.id,
    }));

  if (newEntries.length === 0) {
    throw new Error("سجل الدرجات موجود بالفعل لجميع الطلاب");
  }

  const { error } = await supabase.from("gradebook_entries").insert(newEntries);
  if (error) throw new Error(error.message);
  revalidatePath("/faculty/gradebook");
}

export async function updateGrade(entryId: string, formData: FormData) {
  await requireRole(["faculty"]);
  const supabase = await createClient();

  const updates: Record<string, number | null> = {};
  const coursework = formData.get("coursework_grade");
  const midterm = formData.get("midterm_grade");
  const final = formData.get("final_grade");

  if (coursework !== null && coursework !== "") updates.coursework_grade = parseFloat(coursework as string);
  if (midterm !== null && midterm !== "") updates.midterm_grade = parseFloat(midterm as string);
  if (final !== null && final !== "") updates.final_grade = parseFloat(final as string);

  if (Object.keys(updates).length === 0) throw new Error("لم يتم إدخال أي درجة");

  const { error } = await supabase
    .from("gradebook_entries")
    .update(updates)
    .eq("id", entryId);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/gradebook");
}

export async function saveGradeValues(
  entryId: string,
  coursework: number | null,
  midterm: number | null,
  final: number | null
) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const updates: Record<string, number | null> = {};
  if (coursework !== null) updates.coursework_grade = coursework;
  if (midterm !== null) updates.midterm_grade = midterm;
  if (final !== null) updates.final_grade = final;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from("gradebook_entries")
    .update(updates)
    .eq("id", entryId);

  if (error) throw new Error(error.message);

  // Trigger auto-recommendation in background
  const { data: entry } = await supabase
    .from("gradebook_entries")
    .select("id, student_id, course_id, total_grade, courses!inner(name)")
    .eq("id", entryId)
    .single();

  if (entry && entry.total_grade !== null && entry.student_id && entry.course_id) {
    const courseName = Array.isArray(entry.courses)
      ? entry.courses[0]?.name
      : (entry.courses as any)?.name;
    if (courseName) {
      void generateAutoRecommendation({
        studentId: entry.student_id,
        courseId: entry.course_id,
        courseName,
        grade: entry.total_grade,
        maxGrade: 100,
        tenantId: profile.tenant_id!,
      });
    }
  }

  revalidatePath("/faculty/gradebook");
}

export async function publishGrades(courseId: string) {
  await requireRole(["faculty"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("gradebook_entries")
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq("course_id", courseId);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/gradebook");
}
