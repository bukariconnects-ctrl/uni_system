"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getAssignments(sectionId?: string) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  let query = supabase
    .from("assignments")
    .select("*, sections(section_code, courses(code, name))")
    .eq("tenant_id", profile.tenant_id)
    .eq("created_by", profile.id)
    .order("due_date", { ascending: true });

  if (sectionId) query = query.eq("section_id", sectionId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAssignment(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  let attachmentUrl: string | null = null;

  const file = formData.get("attachment") as File | null;
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop();
    const filePath = `${profile.tenant_id}/assignments/${profile.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("course-materials")
      .upload(filePath, file);

    if (uploadError) throw new Error("فشل رفع الملف: " + uploadError.message);

    const { data: urlData } = supabase.storage
      .from("course-materials")
      .getPublicUrl(filePath);

    attachmentUrl = urlData.publicUrl;
  }

  const { error } = await supabase.from("assignments").insert({
    tenant_id: profile.tenant_id,
    section_id: formData.get("section_id") as string,
    created_by: profile.id,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    max_grade: parseFloat(formData.get("max_grade") as string) || 100,
    due_date: formData.get("due_date") as string,
    allow_late: formData.get("allow_late") === "true",
    is_published: false,
    week_number: parseInt(formData.get("week_number") as string) || null,
    attachment_url: attachmentUrl,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/assignments");
}

export async function toggleAssignmentPublish(id: string, published: boolean) {
  await requireRole(["faculty"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("assignments")
    .update({ is_published: published })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/assignments");
}

export async function deleteAssignment(id: string) {
  await requireRole(["faculty"]);
  const supabase = await createClient();

  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/faculty/assignments");
}

export async function getSubmissions(assignmentId: string) {
  await requireRole(["faculty"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("*, profiles!submissions_student_id_fkey(first_name, last_name, student_profiles(student_number))")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function gradeSubmission(id: string, formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("submissions")
    .update({
      grade: parseFloat(formData.get("grade") as string),
      feedback: (formData.get("feedback") as string) || null,
      status: "graded",
      graded_at: new Date().toISOString(),
      graded_by: profile.id,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/assignments");
}

export async function requestResubmission(id: string) {
  await requireRole(["faculty"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("submissions")
    .update({ status: "resubmit_requested" })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/assignments");
}
