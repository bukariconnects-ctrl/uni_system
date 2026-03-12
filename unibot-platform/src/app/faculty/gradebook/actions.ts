"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getGradebookEntries(sectionId: string) {
  await requireRole(["faculty"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gradebook_entries")
    .select("*, profiles!gradebook_entries_student_id_fkey(first_name, last_name, student_profiles(student_number)), enrollments(status)")
    .eq("section_id", sectionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function initGradebook(sectionId: string) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, student_id")
    .eq("section_id", sectionId)
    .eq("status", "enrolled");

  if (!enrollments || enrollments.length === 0) {
    throw new Error("لا يوجد طلاب مسجلون في هذه الشعبة");
  }

  const { data: existing } = await supabase
    .from("gradebook_entries")
    .select("enrollment_id")
    .eq("section_id", sectionId);

  const existingIds = new Set((existing || []).map((e: any) => e.enrollment_id));

  const newEntries = enrollments
    .filter((e: any) => !existingIds.has(e.id))
    .map((e: any) => ({
      tenant_id: profile.tenant_id,
      enrollment_id: e.id,
      section_id: sectionId,
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

export async function publishGrades(sectionId: string) {
  await requireRole(["faculty"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("gradebook_entries")
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq("section_id", sectionId);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/gradebook");
}
