"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { AiDocumentType } from "@/lib/types/database";

export async function getKnowledgeDocuments() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_knowledge_documents")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .is("section_id", null)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function uploadKnowledgeDocument(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const file = formData.get("file") as File | null;
  let fileUrl: string | null = null;

  if (file && file.size > 0) {
    const ext = file.name.split(".").pop();
    const filePath = `${profile.tenant_id}/knowledge/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("course-materials")
      .upload(filePath, file);

    if (uploadError) throw new Error("فشل رفع الملف: " + uploadError.message);

    const { data: urlData } = supabase.storage
      .from("course-materials")
      .getPublicUrl(filePath);

    fileUrl = urlData.publicUrl;
  }

  const { data: doc, error } = await supabase
    .from("ai_knowledge_documents")
    .insert({
      tenant_id: profile.tenant_id,
      uploaded_by: profile.id,
      title: formData.get("title") as string,
      doc_type: (formData.get("doc_type") as AiDocumentType) || "regulation",
      file_url: fileUrl,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await fetch(`${baseUrl}/api/ai/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: doc.id }),
    });
  } catch {
    // pipeline will be retried
  }

  revalidatePath("/tenant-admin/knowledge");
}

export async function toggleDocumentActive(id: string, isActive: boolean) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("ai_knowledge_documents")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/knowledge");
}

export async function deleteKnowledgeDocument(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("ai_knowledge_documents")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/knowledge");
}

export async function reindexDocument(id: string) {
  await requireRole(["tenant_admin"]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/ai/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: id }),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error);
  revalidatePath("/tenant-admin/knowledge");
  return result;
}
