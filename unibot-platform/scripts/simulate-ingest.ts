/**
 * Script 2 — Ingest Simulator & Real Ingest Runner
 * ───────────────────────────────────────────────────
 * PURPOSE: Simulate and optionally execute the full indexing pipeline
 *          for the "الخدمات الرقمية" document.
 *
 * Modes:
 *   DRY RUN (default) — shows every step with timing, no API calls to Gemini,
 *                        no writes to Supabase.
 *   REAL (--real flag) — executes the full pipeline: pdf-parse → embed → store.
 *
 * Run:
 *   npx tsx scripts/simulate-ingest.ts          # dry run
 *   npx tsx scripts/simulate-ingest.ts --real   # real ingest
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ── Load .env.local ───────────────────────────────────────────────────────────
const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  const v = t.slice(eq + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY   = process.env.GEMINI_API_KEY!;
const IS_REAL_RUN  = process.argv.includes("--real");
const MODEL        = "gemini-embedding-2-preview";
const DIMS         = 768;
const MIN_DELAY_MS = parseInt(process.env.EMBEDDING_CALL_DELAY_MS ?? "4200", 10);

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

function sep(title: string) {
  console.log(`\n${"═".repeat(65)}`);
  console.log(`  ${IS_REAL_RUN ? "🔴 REAL" : "🔵 DRY"} | STEP: ${title}`);
  console.log(`${"═".repeat(65)}`);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

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
  return chunks.filter(c => c.trim().length > 0);
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

let lastCallAt = 0;

async function embedSingle(text: string): Promise<number[]> {
  // Proactive rate limiting
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (lastCallAt > 0 && elapsed < MIN_DELAY_MS) {
    const wait = MIN_DELAY_MS - elapsed;
    process.stdout.write(`    ⏳ Rate-limit wait: ${wait}ms…`);
    await sleep(wait);
    process.stdout.write(" done\n");
  }

  const MAX_RETRIES = 4;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: DIMS,
        }),
      }
    );
    lastCallAt = Date.now();

    if (res.ok) {
      const data = await res.json() as { embedding?: { values?: number[] } };
      return data.embedding?.values ?? [];
    }

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const wait = 5000 * Math.pow(3, attempt);
      console.warn(`\n    ⚠️  429 rate-limited. Backing off ${wait / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
      await sleep(wait);
      continue;
    }

    const errBody = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${errBody.slice(0, 300)}`);
  }
  throw new Error("Exhausted retries");
}

// ── MAIN PIPELINE ─────────────────────────────────────────────────────────────

async function main() {
  const mode = IS_REAL_RUN ? "🔴 REAL INGEST" : "🔵 DRY RUN (simulation only)";
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  UniBot — Ingest Simulator                                    ║`);
  console.log(`║  Mode: ${mode.padEnd(53)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (IS_REAL_RUN) {
    console.log("\n  ⚠️  REAL MODE: Will embed ALL chunks and write to Supabase.");
    console.log(`  ⚠️  Rate limit: ${MIN_DELAY_MS}ms between calls.`);
    console.log("  ⚠️  Press Ctrl+C within 5s to abort…\n");
    await sleep(5000);
  }

  // ── Step 1: Fetch target document ───────────────────────────────────────────
  sep("1. Fetch Document from Supabase");

  const docsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_knowledge_documents?title=ilike.*الخدمات*&select=id,title,doc_type,file_url,tenant_id,total_chunks`,
    { headers: sbHeaders }
  );

  if (!docsRes.ok) throw new Error(`DB error: ${docsRes.status}`);
  const docs = await docsRes.json() as {
    id: string; title: string; doc_type: string;
    file_url: string; tenant_id: string; total_chunks: number;
  }[];

  if (docs.length === 0) {
    console.log("\n  Document 'الخدمات الرقمية' not found. Trying all documents…");
    const allRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_knowledge_documents?select=id,title,doc_type,file_url,tenant_id,total_chunks`,
      { headers: sbHeaders }
    );
    const all = await allRes.json() as typeof docs;
    for (const d of all) console.log(`  • "${d.title}" (${d.id})`);
    throw new Error("Target document not found. Check document title.");
  }

  const doc = docs[0];
  console.log(`  ✅ Found: "${doc.title}"`);
  console.log(`     ID:         ${doc.id}`);
  console.log(`     Tenant:     ${doc.tenant_id}`);
  console.log(`     Type:       ${doc.doc_type}`);
  console.log(`     file_url:   ${doc.file_url}`);
  console.log(`     chunks now: ${doc.total_chunks}`);

  // ── Step 2: Download PDF ─────────────────────────────────────────────────────
  sep("2. Download & Parse PDF");

  let pdfBuffer: Buffer;

  // Try local file first (faster, no network)
  const localPath = resolve(process.cwd(), "test-embedding", "الخدمات الرقمية.pdf");
  if (existsSync(localPath)) {
    pdfBuffer = readFileSync(localPath);
    console.log(`  ✅ Using LOCAL file: ${localPath}`);
  } else {
    console.log(`  Downloading from: ${doc.file_url}`);
    const r = await fetch(doc.file_url);
    if (!r.ok) throw new Error(`Download failed: ${r.status}`);
    pdfBuffer = Buffer.from(await r.arrayBuffer());
    console.log(`  ✅ Downloaded: ${pdfBuffer.length} bytes`);
  }

  // ── Step 3: Extract text ─────────────────────────────────────────────────────
  sep("3. Extract Text with pdf-parse");

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const t0 = Date.now();
  const pdfData = await pdfParse(pdfBuffer);
  const parsedMs = Date.now() - t0;

  const fullText: string = pdfData.text;
  const words = fullText.split(/\s+/).filter(Boolean);
  const arabicChars = (fullText.match(/[\u0600-\u06FF]/g) ?? []).length;

  console.log(`  ✅ Parsed in ${parsedMs}ms`);
  console.log(`     Pages:        ${pdfData.numpages}`);
  console.log(`     Total chars:  ${fullText.length}`);
  console.log(`     Total words:  ${words.length}`);
  console.log(`     Arabic chars: ${arabicChars} (${Math.round(arabicChars / fullText.length * 100)}%)`);
  console.log(`\n  First 400 chars:`);
  console.log(`  "${fullText.slice(0, 400).replace(/\n/g, "↵")}"`);

  if (words.length < 10) {
    throw new Error(
      "Extracted text has < 10 words. This may be a scanned PDF (image-based). " +
      "Need OCR to extract text."
    );
  }

  // ── Step 4: Chunk the text ───────────────────────────────────────────────────
  sep("4. Chunk Text (800 words, 100-word overlap)");

  const chunks = chunkText(fullText);
  const totalTokens = chunks.reduce((s, c) => s + estimateTokens(c), 0);

  console.log(`  ✅ Created ${chunks.length} chunks`);
  console.log(`     Total estimated tokens: ~${totalTokens}`);
  console.log(`     Avg words/chunk: ${Math.round(words.length / chunks.length)}`);

  for (let i = 0; i < Math.min(chunks.length, 3); i++) {
    const preview = chunks[i].slice(0, 120).replace(/\n/g, " ");
    console.log(`\n  Chunk ${i}: ${chunks[i].split(" ").length} words`);
    console.log(`  "${preview}…"`);
  }
  if (chunks.length > 3) console.log(`\n  … and ${chunks.length - 3} more chunks`);

  // ── Step 5: Estimate timing ──────────────────────────────────────────────────
  sep("5. Rate Limit & Timing Estimate");

  const secPerChunk = MIN_DELAY_MS / 1000;
  const totalSec = chunks.length * secPerChunk;
  console.log(`  Rate limit delay:  ${MIN_DELAY_MS}ms (= ${secPerChunk}s) per embedding call`);
  console.log(`  Chunks to embed:   ${chunks.length}`);
  console.log(`  Estimated time:    ~${Math.round(totalSec)}s (${Math.round(totalSec / 60 * 10) / 10} min)`);

  if (!IS_REAL_RUN) {
    sep("6. [DRY RUN — Skipping Embed & Store]");
    console.log("  Re-run with --real to execute the actual embedding + storage.");
    console.log(`  Command: npx tsx scripts/simulate-ingest.ts --real`);
    return;
  }

  // ── Step 6 (REAL): Embed + Store ─────────────────────────────────────────────
  sep("6. [REAL] Embed Chunks + Store in Supabase");

  // Delete existing chunks first
  const delRes = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_document_chunks?document_id=eq.${doc.id}`,
    { method: "DELETE", headers: sbHeaders }
  );
  console.log(`  🗑️  Cleared old chunks (HTTP ${delRes.status})`);

  const BATCH_SIZE = 5;
  let storedCount = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    console.log(`\n  📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} — chunks ${i}‒${i + batch.length - 1}`);

    const insertData: object[] = [];
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const globalIdx = i + j;
      process.stdout.write(`    [${globalIdx + 1}/${chunks.length}] Embedding… `);
      const t1 = Date.now();
      const vector = await embedSingle(chunk);
      console.log(`done in ${Date.now() - t1}ms, ${vector.length} dims`);

      insertData.push({
        tenant_id: doc.tenant_id,
        document_id: doc.id,
        chunk_index: globalIdx,
        content: chunk,
        page_number: Math.floor(globalIdx / 3) + 1,
        timestamp_sec: null,
        embedding: "[" + vector.join(",") + "]",
        token_count: estimateTokens(chunk),
      });
    }

    // Batch insert
    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/ai_document_chunks`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify(insertData),
    });

    if (!insRes.ok) {
      const body = await insRes.text();
      throw new Error(`Insert failed (HTTP ${insRes.status}): ${body}`);
    }

    storedCount += insertData.length;
    console.log(`    ✅ Batch stored (${storedCount}/${chunks.length} total)`);
  }

  // Update document chunk count
  await fetch(
    `${SUPABASE_URL}/rest/v1/ai_knowledge_documents?id=eq.${doc.id}`,
    {
      method: "PATCH",
      headers: sbHeaders,
      body: JSON.stringify({ total_chunks: storedCount }),
    }
  );

  sep("Result");
  console.log(`  ✅ Document "${doc.title}" fully indexed!`);
  console.log(`     Chunks stored: ${storedCount}`);
  console.log(`     Next step: run  npx tsx scripts/test-rag.ts`);
}

main().catch(e => { console.error("\n  ❌ FATAL:", e.message); process.exit(1); });
