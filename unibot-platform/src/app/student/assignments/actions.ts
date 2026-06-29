"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { validateFile } from "@/lib/security/file-validator";

export async function getStudentAssignments() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const courseIds = (enrollments || []).map((e: any) => e.course_id);
  if (courseIds.length === 0) return [];

  const { data, error } = await supabase
    .from("assignments")
    .select("*, courses(code, name)")
    .in("course_id", courseIds)
    .eq("is_published", true)
    .order("due_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getMySubmissions() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", profile.id)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function submitAssignment(formData: FormData) {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const assignmentId = formData.get("assignment_id") as string;

  const { data: assignment } = await supabase
    .from("assignments")
    .select("due_date, allow_late")
    .eq("id", assignmentId)
    .single();

  if (!assignment) throw new Error("التكليف غير موجود");

  const now = new Date();
  const dueDate = new Date(assignment.due_date);
  const isLate = now > dueDate;

  if (isLate && !assignment.allow_late) {
    throw new Error("انتهى موعد التسليم ولا يُسمح بالتسليم المتأخر");
  }

  const file = formData.get("file") as File | null;
  let fileUrl: string | null = null;

  if (file && file.size > 0) {
    const validation = validateFile(file.name, file.type, 50 * 1024 * 1024, file.size);
    if (!validation.valid) throw new Error(validation.error!);

    const ext = file.name.split(".").pop();
    const filePath = `${profile.tenant_id}/submissions/${profile.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("submissions")
      .upload(filePath, file);

    if (uploadError) throw new Error("فشل رفع الملف: " + uploadError.message);

    const { data: urlData } = supabase.storage
      .from("submissions")
      .getPublicUrl(filePath);

    fileUrl = urlData.publicUrl;
  }

  const textContent = (formData.get("text_content") as string) || null;

  if (!fileUrl && !textContent) {
    throw new Error("يجب رفع ملف أو كتابة نص التسليم");
  }

  // Check if a previous submission exists (duplicate resubmission case)
  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("assignment_id", assignmentId)
    .eq("student_id", profile.id)
    .maybeSingle();

  if (existing) {
    // Allow update only when faculty explicitly requested resubmission
    if (existing.status !== "resubmit_requested") {
      throw new Error("لقد قمت بتسليم هذا التكليف مسبقاً ولا يمكن التعديل عليه");
    }

    // UPDATE the existing submission record
    const { error } = await supabase
      .from("submissions")
      .update({
        file_url: fileUrl,
        text_content: textContent,
        status: isLate ? "late" : "submitted",
        submitted_at: new Date().toISOString(),
        // Reset grading fields
        grade: null,
        feedback: null,
        graded_at: null,
        graded_by: null,
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    // First-time submission — INSERT
    const { error } = await supabase.from("submissions").insert({
      tenant_id: profile.tenant_id,
      assignment_id: assignmentId,
      student_id: profile.id,
      file_url: fileUrl,
      text_content: textContent,
      status: isLate ? "late" : "submitted",
    });

    if (error) {
      if (error.message.includes("unique") || error.message.includes("duplicate"))
        throw new Error("لقد قمت بتسليم هذا التكليف مسبقاً");
      throw new Error(error.message);
    }
  }

  revalidatePath("/student/assignments");
}
