"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { ContentType } from "@/lib/types/database";
import { validateFile } from "@/lib/security/file-validator";
import { performIngest } from "@/lib/ai/ingest-service";

export async function uploadMaterial(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const courseId = formData.get("course_id") as string;
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

  const file = formData.get("file") as File | null;
  let fileUrl: string | null = null;
  let fileSize: number | null = null;

  if (file && file.size > 0) {
    const validation = validateFile(file.name, file.type, 50 * 1024 * 1024, file.size);
    if (!validation.valid) throw new Error(validation.error!);

    const ext = file.name.split(".").pop();
    const filePath = `${profile.tenant_id}/${profile.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await serviceClient.storage
      .from("course-materials")
      .upload(filePath, file);

    if (uploadError) throw new Error("فشل رفع الملف: " + uploadError.message);

    const { data: urlData } = serviceClient.storage
      .from("course-materials")
      .getPublicUrl(filePath);

    fileUrl = urlData.publicUrl;
    fileSize = file.size;
  }

  const { error } = await serviceClient.from("course_materials").insert({
    tenant_id: profile.tenant_id,
    course_id: courseId,
    major_id: majorId,
    academic_level_id: academicLevelId,
    uploaded_by: profile.id,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    content_type: (formData.get("content_type") as ContentType) || "document",
    file_url: fileUrl || (formData.get("link_url") as string) || null,
    file_size_bytes: fileSize,
    week_number: parseInt(formData.get("week_number") as string) || null,
    is_ai_approved: false,
    is_published: false,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/materials");
}

export async function togglePublish(id: string, published: boolean) {
  await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("course_materials")
    .update({ is_published: published })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/materials");
}

export async function toggleAiApproved(id: string, approved: boolean) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("course_materials")
    .update({ is_ai_approved: approved })
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (approved) {
    const { data: material } = await serviceClient
      .from("course_materials")
      .select("*")
      .eq("id", id)
      .single();

    if (material) {
      const { data: existingDoc } = await serviceClient
        .from("ai_knowledge_documents")
        .select("id")
        .eq("material_id", id)
        .maybeSingle();

      let docId: string;

      if (existingDoc) {
        await serviceClient
          .from("ai_knowledge_documents")
          .update({ is_active: true })
          .eq("id", existingDoc.id);
        docId = existingDoc.id;
      } else {
        const { data: newDoc, error: docError } = await serviceClient
          .from("ai_knowledge_documents")
          .insert({
            tenant_id: profile.tenant_id,
            course_id: material.course_id,
            material_id: id,
            uploaded_by: profile.id,
            title: material.title,
            doc_type: "course_material" as const,
            file_url: material.file_url,
            is_active: true,
          })
          .select("id")
          .single();

        if (docError || !newDoc) {
          throw new Error("فشل إنشاء سجل المعرفة: " + (docError?.message ?? "unknown"));
        }
        docId = newDoc.id;
      }

      await performIngest(docId, profile);
    }
  } else {
    await serviceClient
      .from("ai_knowledge_documents")
      .update({ is_active: false })
      .eq("material_id", id);
  }

  revalidatePath("/faculty/materials");
}

export async function deleteMaterial(id: string) {
  await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient.from("course_materials").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/faculty/materials");
}

export async function upsertSyllabus(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const courseId = formData.get("course_id") as string;
  const content = formData.get("content") as string;

  // Find existing syllabus for this course
  const { data: existing } = await serviceClient
    .from("syllabi")
    .select("id")
    .eq("course_id", courseId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  if (existing) {
    const { error } = await serviceClient
      .from("syllabi")
      .update({ content: JSON.parse(content) })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await serviceClient.from("syllabi").insert({
      tenant_id: profile.tenant_id,
      course_id: courseId,
      content: JSON.parse(content),
      status: "draft",
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/faculty/materials");
}

export async function submitSyllabus(id: string) {
  await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("syllabi")
    .update({ status: "submitted" })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/materials");
}
