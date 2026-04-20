"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { ContentType } from "@/lib/types/database";
import { validateFile } from "@/lib/security/file-validator";
import { performIngest } from "@/lib/ai/ingest-service";

export async function getFacultySections() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("sections")
    .select("id, section_code, courses(code, name), semesters(name, status)")
    .eq("tenant_id", profile.tenant_id)
    .eq("instructor_id", profile.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getMaterials(sectionId?: string) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  let query = supabase
    .from("course_materials")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("uploaded_by", profile.id)
    .order("week_number", { ascending: true })
    .order("created_at", { ascending: false });

  if (sectionId) {
    query = query.eq("section_id", sectionId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function uploadMaterial(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const file = formData.get("file") as File | null;
  let fileUrl: string | null = null;
  let fileSize: number | null = null;

  if (file && file.size > 0) {
    const validation = validateFile(file.name, file.type, 50 * 1024 * 1024, file.size);
    if (!validation.valid) throw new Error(validation.error!);

    const ext = file.name.split(".").pop();
    const filePath = `${profile.tenant_id}/${profile.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("course-materials")
      .upload(filePath, file);

    if (uploadError) throw new Error("فشل رفع الملف: " + uploadError.message);

    const { data: urlData } = supabase.storage
      .from("course-materials")
      .getPublicUrl(filePath);

    fileUrl = urlData.publicUrl;
    fileSize = file.size;
  }

  const { error } = await supabase.from("course_materials").insert({
    tenant_id: profile.tenant_id,
    section_id: formData.get("section_id") as string,
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
  const supabase = await createClient();

  const { error } = await supabase
    .from("course_materials")
    .update({ is_published: published })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/materials");
}

export async function toggleAiApproved(id: string, approved: boolean) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("course_materials")
    .update({ is_ai_approved: approved })
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (approved) {
    const { data: material } = await supabase
      .from("course_materials")
      .select("*")
      .eq("id", id)
      .single();

    if (material) {
      // Check if an ai_knowledge_documents record already exists for this material
      const { data: existingDoc } = await supabase
        .from("ai_knowledge_documents")
        .select("id")
        .eq("material_id", id)
        .maybeSingle();

      let docId: string;

      if (existingDoc) {
        // Reactivate & re-index existing record
        await supabase
          .from("ai_knowledge_documents")
          .update({ is_active: true })
          .eq("id", existingDoc.id);
        docId = existingDoc.id;
      } else {
        // Create new knowledge document record
        const { data: newDoc, error: docError } = await supabase
          .from("ai_knowledge_documents")
          .insert({
            tenant_id: profile.tenant_id,
            section_id: material.section_id,
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

      // ✅ Call performIngest directly (no HTTP loopback — avoids auth failure)
      await performIngest(docId, profile);
    }
  } else {
    // Deactivate knowledge document without deleting chunks
    await supabase
      .from("ai_knowledge_documents")
      .update({ is_active: false })
      .eq("material_id", id);
  }

  revalidatePath("/faculty/materials");
}

export async function deleteMaterial(id: string) {
  await requireRole(["faculty"]);
  const supabase = await createClient();

  const { error } = await supabase.from("course_materials").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/materials");
}

export async function getSyllabi() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("syllabi")
    .select("*, sections(section_code, courses(code, name))")
    .eq("tenant_id", profile.tenant_id)
    .eq("instructor_id", profile.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function upsertSyllabus(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const sectionId = formData.get("section_id") as string;
  const contentRaw = formData.get("content") as string;
  let content;
  try {
    content = JSON.parse(contentRaw);
  } catch {
    content = [{ week: 1, topics: [contentRaw], objectives: [] }];
  }

  const { data: existing } = await supabase
    .from("syllabi")
    .select("id")
    .eq("section_id", sectionId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("syllabi")
      .update({ content, status: "draft" })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("syllabi").insert({
      tenant_id: profile.tenant_id,
      section_id: sectionId,
      instructor_id: profile.id,
      content,
      status: "draft",
    });
    if (error) {
      if (error.message.includes("unique") || error.message.includes("duplicate"))
        throw new Error("توجد خطة مقرر لهذه الشعبة بالفعل");
      throw new Error(error.message);
    }
  }
  revalidatePath("/faculty/materials");
}

export async function submitSyllabus(id: string) {
  await requireRole(["faculty"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("syllabi")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/materials");
}
