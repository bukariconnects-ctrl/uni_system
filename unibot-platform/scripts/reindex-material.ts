/**
 * One-time script to manually re-index a course material that failed to index.
 * Run: npx tsx scripts/reindex-material.ts
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { embedText, EMBEDDING_MODEL } from "../src/lib/ai/embedding";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DOC_ID       = "eea0d28f-f8fb-4744-9f0a-ca108369f197";
const TENANT_ID    = "bf1649ad-66c3-4b25-a9b1-795f0315df14";
const UPLOADER_ID  = "4442c27c-ff8c-49f8-8deb-e7f732afce15";

function chunkText(text: string, maxWords = 800, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    chunks.push(words.slice(start, end).join(" "));
    start = end - overlap;
    if (start >= words.length || end === words.length) break;
  }
  return chunks.filter((c) => c.trim().length > 0);
}

async function main() {
  const db = createSupabaseClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch document
  const { data: doc, error } = await db.from("ai_knowledge_documents").select("*").eq("id", DOC_ID).single();
  if (error || !doc) { console.error("Doc not found:", error); process.exit(1); }
  console.log("Document:", doc.title, "| URL:", doc.file_url);

  // Download PDF
  const res = await fetch(doc.file_url);
  const buffer = await res.arrayBuffer();
  const parsed = await pdfParse(Buffer.from(buffer));
  const text = parsed.text;
  console.log(`Parsed: ${parsed.numpages} pages, ${text.length} chars`);

  if (!text || text.trim().length < 10) { console.error("No text content"); process.exit(1); }

  // Chunk
  const chunks = chunkText(text);
  console.log(`Chunks: ${chunks.length}`);

  // Delete old chunks
  await db.from("ai_document_chunks").delete().eq("document_id", DOC_ID);

  // Embed & insert
  let totalTokens = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const vector = await embedText(chunk);
    const words = chunk.split(/\s+/).length;
    totalTokens += Math.ceil(words * 1.3);

    const { error: insertErr } = await db.from("ai_document_chunks").insert({
      tenant_id: TENANT_ID,
      document_id: DOC_ID,
      chunk_index: i,
      content: chunk,
      page_number: Math.floor(i / 3) + 1,
      timestamp_sec: null,
      embedding: JSON.stringify(vector),
      token_count: Math.ceil(words * 1.3),
    });
    if (insertErr) { console.error(`Chunk ${i} failed:`, insertErr.message); }
    else { console.log(`✅ Chunk ${i + 1}/${chunks.length} indexed`); }

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  // Update total_chunks
  await db.from("ai_knowledge_documents").update({ total_chunks: chunks.length }).eq("id", DOC_ID);

  // Log token usage
  await db.from("ai_token_usage").insert({
    tenant_id: TENANT_ID,
    user_id: UPLOADER_ID,
    model: EMBEDDING_MODEL,
    prompt_tokens: totalTokens,
    completion_tokens: 0,
    total_tokens: totalTokens,
    cost_usd: 0,
  });

  console.log(`\n✅ Done! Indexed ${chunks.length} chunks, ~${totalTokens} tokens`);
}

main().catch(console.error);
