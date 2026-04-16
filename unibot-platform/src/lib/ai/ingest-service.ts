import { embedText, EMBEDDING_MODEL } from "./embedding";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

// ─────────────────────────────────────────────────────────────────────────────
// Text utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Splits `text` into overlapping word-windows suitable for embedding.
 */
function chunkText(text: string, maxWords = 800, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    chunks.push(words.slice(start, end).join(" "));
    start = end - overlap;
    if (start >= words.length) break;
    if (end === words.length) break;
  }

  return chunks.filter((c) => c.trim().length > 0);
}

/** Rough token estimate (1 word ≈ 1.3 tokens). */
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core ingest function
// ─────────────────────────────────────────────────────────────────────────────

export interface IngestResult {
  total_chunks: number;
  tokens_used: number;
}

/**
 * Core ingestion pipeline: fetches a document, extracts text, creates
 * embeddings with gemini-embedding-2-preview, and stores chunks in Supabase.
 *
 * ## Why this function exists
 * Previously, Server Actions (e.g. `reindexDocument`) triggered ingestion by
 * calling `fetch('/api/ai/ingest', ...)` — a server-to-server HTTP loopback.
 * Because Next.js does NOT forward session cookies in those fetch calls, the
 * ingest route saw an unauthenticated request, triggered `redirect("/login")`,
 * and the caller received an HTML page instead of JSON, causing:
 *   `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
 *
 * By extracting the logic here and calling it **directly** (no HTTP round-trip),
 * the authentication context is already established by the caller before
 * invoking this function.
 *
 * @param documentId  - `ai_knowledge_documents.id` to process
 * @param profile     - Already-authenticated user profile (from `requireRole`)
 */
export async function performIngest(
  documentId: string,
  profile: Pick<Profile, "id" | "tenant_id">
): Promise<IngestResult> {
  const supabase = await createClient();
  // IMPORTANT: Must use createServiceClient (raw supabase-js, no cookie session)
  // NOT createAdminClient (uses @supabase/ssr which forwards user JWT from cookies,
  // overriding the service_role key for RLS evaluation → RLS violation)
  const adminClient = createServiceClient();

  // ── 1. Fetch document metadata ─────────────────────────────────────────────
  const { data: doc, error: docError } = await supabase
    .from("ai_knowledge_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    throw new Error("الوثيقة غير موجودة");
  }

  // ── 2. Download file and extract text ──────────────────────────────────────
  let fullText = "";

  if (doc.file_url) {
    const response = await fetch(doc.file_url);
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/pdf") || doc.file_url.toLowerCase().endsWith(".pdf")) {
      // ── PDF extraction via pdf-parse ──────────────────────────────────────
      // WHY: The old approach extracted only ASCII bytes (32-126), silently
      // dropping ALL Arabic/Unicode text. Arabic chars are U+0600-U+06FF which
      // are multi-byte UTF-8 and entirely outside the ASCII range.
      // Result: garbage PDF structure bytes instead of document content.
      // pdf-parse reads the PDF text layer and returns proper Unicode strings.
      const buffer = await response.arrayBuffer();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(Buffer.from(buffer));
      fullText = data.text;
      console.log(
        `[Ingest] PDF parsed: ${data.numpages} pages, ` +
          `${fullText.length} chars, ` +
          `~${Math.round(fullText.split(/\s+/).length)} words`
      );
    } else if (contentType.includes("text") || contentType.includes("json")) {
      // Plain text / JSON — read as UTF-8 string directly
      fullText = await response.text();
    } else {
      // Other binary formats (docx, xlsx, etc.) — best-effort plain text
      fullText = await response.text();
    }
  }

  if (!fullText || fullText.trim().length < 10) {
    throw new Error("لا يوجد محتوى نصي كافٍ للمعالجة");
  }

  // ── 3. Chunk the text ──────────────────────────────────────────────────────
  const chunks = chunkText(fullText);
  if (chunks.length === 0) {
    throw new Error("لا يوجد أجزاء نصية للمعالجة");
  }

  // ── 4. Clear existing chunks for this document ─────────────────────────────
  await adminClient
    .from("ai_document_chunks")
    .delete()
    .eq("document_id", documentId);

  // ── 5. Embed and store in batches ──────────────────────────────────────────
  let totalTokens = 0;
  const batchSize = 20;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const embeddings: number[][] = [];
    for (const chunk of batch) {
      const vector = await embedText(chunk);
      embeddings.push(vector);
      totalTokens += estimateTokens(chunk);
    }

    const insertData = embeddings.map((emb, idx) => ({
      tenant_id: doc.tenant_id,
      document_id: documentId,
      chunk_index: i + idx,
      content: batch[idx],
      page_number: Math.floor((i + idx) / 3) + 1,
      timestamp_sec: null,
      embedding: JSON.stringify(emb),
      token_count: estimateTokens(batch[idx]),
    }));

    const { error: insertError } = await adminClient
      .from("ai_document_chunks")
      .insert(insertData);

    if (insertError) {
      throw new Error("فشل إدراج الأجزاء: " + insertError.message);
    }
  }

  // ── 6. Update document chunk count ────────────────────────────────────────
  await adminClient
    .from("ai_knowledge_documents")
    .update({ total_chunks: chunks.length })
    .eq("id", documentId);

  // ── 7. Log token usage ────────────────────────────────────────────────────
  await adminClient.from("ai_token_usage").insert({
    tenant_id: doc.tenant_id,
    user_id: profile.id,
    model: EMBEDDING_MODEL,
    prompt_tokens: totalTokens,
    completion_tokens: 0,
    total_tokens: totalTokens,
    cost_usd: 0,
  });

  return { total_chunks: chunks.length, tokens_used: totalTokens };
}
