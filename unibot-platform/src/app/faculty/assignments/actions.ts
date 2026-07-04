"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { generateAutoRecommendation } from "@/lib/ai/recommendation-engine";

export async function createAssignment(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const groupId = formData.get("group_id") as string;

  // Resolve major_id and academic_level_id from group
  let majorId: string | null = null;
  let academicLevelId: string | null = null;

  if (groupId) {
    const { data: spc } = await serviceClient
      .from("study_plan_courses")
      .select("academic_level_id")
      .eq("id", groupId)
      .single();

    if (spc) {
      academicLevelId = spc.academic_level_id;
      const { data: al } = await serviceClient
        .from("academic_levels")
        .select("major_id")
        .eq("id", academicLevelId)
        .single();
      if (al) majorId = al.major_id;
    }
  }

  let attachmentUrl: string | null = null;

  const file = formData.get("attachment") as File | null;
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop();
    const filePath = `${profile.tenant_id}/assignments/${profile.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await serviceClient.storage
      .from("course-materials")
      .upload(filePath, file);

    if (uploadError) throw new Error("فشل رفع الملف: " + uploadError.message);

    const { data: urlData } = serviceClient.storage
      .from("course-materials")
      .getPublicUrl(filePath);

    attachmentUrl = urlData.publicUrl;
  }

  const { error } = await serviceClient.from("assignments").insert({
    tenant_id: profile.tenant_id,
    course_id: formData.get("course_id") as string,
    major_id: majorId,
    academic_level_id: academicLevelId,
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
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("assignments")
    .update({ is_published: published })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/assignments");
}

export async function deleteAssignment(id: string) {
  await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient.from("assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/faculty/assignments");
}

export async function getSubmissions(assignmentId: string) {
  await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient
    .from("submissions")
    .select("*, profiles!submissions_student_id_fkey(first_name, last_name, student_profiles(student_number))")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function gradeSubmission(id: string, formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const grade = parseFloat(formData.get("grade") as string);

  const { error } = await serviceClient
    .from("submissions")
    .update({
      grade,
      feedback: (formData.get("feedback") as string) || null,
      status: "graded",
      graded_at: new Date().toISOString(),
      graded_by: profile.id,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Trigger auto-recommendation in background
  const { data: sub } = await serviceClient
    .from("submissions")
    .select("student_id, assignments!inner(max_grade, course_id, courses!inner(name))")
    .eq("id", id)
    .single();

  if (sub && !isNaN(grade)) {
    const assignment = Array.isArray(sub.assignments) ? sub.assignments[0] : sub.assignments;
    const course = assignment?.courses
      ? Array.isArray(assignment.courses)
        ? assignment.courses[0]
        : assignment.courses
      : null;
    if (assignment?.max_grade && course?.name && assignment?.course_id) {
      void generateAutoRecommendation({
        studentId: sub.student_id,
        courseId: assignment.course_id,
        courseName: course.name,
        grade,
        maxGrade: assignment.max_grade,
        tenantId: profile.tenant_id!,
      });
    }
  }

  revalidatePath("/faculty/assignments");
}

export async function requestResubmission(id: string) {
  await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("submissions")
    .update({ status: "resubmit_requested" })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/assignments");
}
