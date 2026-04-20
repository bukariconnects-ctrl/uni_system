/**
 * Re-indexes ALL active knowledge documents.
 * Fixes corrupted (Mojibake) chunks from previous broken ingestion.
 *
 * Run: npx tsx scripts/reindex-all-documents.ts
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { embedText, EMBEDDING_MODEL } from "../src/lib/ai/embedding";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const db = createSupabaseClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

function hasArabicProportion(text: string, minRatio = 0.05): boolean {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const totalAlpha = (text.match(/[a-zA-Z\u0600-\u06FF]/g) || []).length;
  if (totalAlpha === 0) return false;
  return arabicChars / totalAlpha >= minRatio;
}

async function ingestDocument(doc: {
  id: string;
  title: string;
  file_url: string;
  tenant_id: string;
  uploaded_by: string;
}) {
  console.log(`\n📄 Processing: "${doc.title}" (${doc.id})`);

  // 1. Download
  const res = await fetch(doc.file_url);
  if (!res.ok) {
    console.error(`  ❌ Failed to download: ${res.status} ${res.statusText}`);
    return 0;
  }

  // 2. Parse PDF
  const buffer = await res.arrayBuffer();
  let fullText = "";
  try {
    const data = await pdfParse(Buffer.from(buffer));
    fullText = data.text;
    console.log(`  📊 Parsed: ${data.numpages} pages, ${fullText.length} chars`);
    console.log(`  🔤 Has Arabic: ${hasArabicProportion(fullText)}`);
    if (fullText.length > 0) {
      console.log(`  Preview: ${fullText.substring(0, 150)}`);
    }
  } catch (e) {
    console.error(`  ❌ PDF parse failed:`, e);
    return 0;
  }

  if (!fullText || fullText.trim().length < 20) {
    console.error(`  ❌ Insufficient text content`);
    return 0;
  }

  // 3. Chunk
  const chunks = chunkText(fullText);
  console.log(`  🔧 Chunks: ${chunks.length}`);

  // 4. Delete old chunks
  await db.from("ai_document_chunks").delete().eq("document_id", doc.id);

  // 5. Embed & insert
  let totalTokens = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const vector = await embedText(chunk);
      const words = chunk.split(/\s+/).length;
      const tokenCount = Math.ceil(words * 1.3);
      totalTokens += tokenCount;

      const { error } = await db.from("ai_document_chunks").insert({
        tenant_id: doc.tenant_id,
        document_id: doc.id,
        chunk_index: i,
        content: chunk,
        page_number: Math.floor(i / 3) + 1,
        timestamp_sec: null,
        embedding: JSON.stringify(vector),
        token_count: tokenCount,
      });

      if (error) {
        console.error(`  ❌ Chunk ${i} insert failed:`, error.message);
      } else {
        process.stdout.write(`  ✅ ${i + 1}/${chunks.length} `);
      }

      // Rate limit: 500ms between embeddings
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.error(`  ❌ Embedding failed for chunk ${i}:`, e);
    }
  }

  // 6. Update total_chunks
  await db
    .from("ai_knowledge_documents")
    .update({ total_chunks: chunks.length })
    .eq("id", doc.id);

  // 7. Log token usage
  await db.from("ai_token_usage").insert({
    tenant_id: doc.tenant_id,
    user_id: doc.uploaded_by,
    model: EMBEDDING_MODEL,
    prompt_tokens: totalTokens,
    completion_tokens: 0,
    total_tokens: totalTokens,
    cost_usd: 0,
  });

  console.log(`\n  ✅ Done: ${chunks.length} chunks, ~${totalTokens} tokens`);
  return chunks.length;
}

async function main() {
  console.log("🚀 Starting full re-index of all active knowledge documents...\n");

  const { data: docs, error } = await db
    .from("ai_knowledge_documents")
    .select("id, title, file_url, tenant_id, uploaded_by")
    .eq("is_active", true)
    .not("file_url", "is", null);

  if (error || !docs) {
    console.error("Failed to fetch documents:", error);
    process.exit(1);
  }

  console.log(`Found ${docs.length} active documents to re-index.`);

  let totalChunks = 0;
  for (const doc of docs) {
    const count = await ingestDocument(doc as {
      id: string;
      title: string;
      file_url: string;
      tenant_id: string;
      uploaded_by: string;
    });
    totalChunks += count;

    // Pause 2 seconds between documents
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n\n🎉 Re-index complete! Total chunks: ${totalChunks}`);
}

main().catch(console.error);
