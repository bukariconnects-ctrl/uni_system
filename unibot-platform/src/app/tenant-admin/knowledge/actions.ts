"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { performIngest } from "@/lib/ai/ingest-service";
import type { AiDocumentType } from "@/lib/types/database";

export async function getKnowledgeDocuments() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_knowledge_documents")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .is("course_id", null)
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

  // Call performIngest directly — avoids the HTTP loopback auth bug
  try {
    await performIngest(doc.id, profile);
  } catch {
    // Non-fatal: user can trigger reindex manually
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

/**
 * Re-indexes a document: regenerates all embedding chunks.
 *
 * FIX: Previously this called `fetch('/api/ai/ingest', ...)` from a Server
 * Action, which is a server-to-server HTTP loopback. Next.js does not forward
 * session cookies in those requests, so `requireRole` inside the route called
 * `redirect("/login")`, returning an HTML page. `res.json()` then threw:
 *   "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"
 *
 * Solution: call `performIngest` directly — no HTTP, no auth problem.
 */
export async function reindexDocument(id: string) {
  const { profile } = await requireRole(["tenant_admin"]);

  const result = await performIngest(id, profile);

  revalidatePath("/tenant-admin/knowledge");
  return result;
}
