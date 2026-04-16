/**
 * Script 1 — Debug Document Inspector
 * ─────────────────────────────────────
 * PURPOSE: Phase 1 of systematic debugging.
 *   1. Fetch ALL knowledge documents from Supabase
 *   2. Show their chunks count, file_url, type, status
 *   3. Download the "الخدمات الرقمية" PDF and extract text with pdf-parse
 *   4. Compare old ASCII extraction vs correct pdf-parse extraction
 *   5. Test the NEW Gemini API key with a real single-call embedding
 *   6. Diagnose rate limiting and quota status
 *
 * Run:  npx tsx scripts/debug-document.ts
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

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

function sep(title: string) {
  const line = "─".repeat(Math.max(0, 60 - title.length));
  console.log(`\n━━━ ${title} ${line}`);
}
function ok(msg: string)   { console.log(`  ✅ ${msg}`); }
function err(msg: string)  { console.error(`  ❌ ${msg}`); }
function info(msg: string) { console.log(`  ℹ️  ${msg}`); }
function warn(msg: string) { console.log(`  ⚠️  ${msg}`); }

// ── SECTION 1: DB Documents ───────────────────────────────────────────────────

async function inspectDocuments() {
  sep("Section 1 — Knowledge Documents in DB");

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_knowledge_documents?select=id,title,doc_type,file_url,total_chunks,created_at&order=created_at.desc`,
    { headers }
  );

  if (!res.ok) {
    err(`Failed to fetch documents: HTTP ${res.status}`);
    return null;
  }

  const docs = await res.json() as {
    id: string; title: string; doc_type: string;
    file_url: string | null; total_chunks: number; created_at: string;
  }[];

  ok(`Found ${docs.length} document(s) in ai_knowledge_documents`);
  console.log();

  for (const d of docs) {
    console.log(`  📄 "${d.title}"`);
    console.log(`     id:          ${d.id}`);
    console.log(`     type:        ${d.doc_type}`);
    console.log(`     chunks:      ${d.total_chunks}`);
    console.log(`     created:     ${new Date(d.created_at).toLocaleString()}`);
    console.log(`     file_url:    ${d.file_url ?? "(none)"}`);
    console.log();
  }

  return docs;
}

// ── SECTION 2: Existing Chunks ────────────────────────────────────────────────

async function inspectChunks(docs: { id: string; title: string }[]) {
  sep("Section 2 — Stored Chunks per Document");

  for (const doc of docs) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_document_chunks?document_id=eq.${doc.id}&select=id,chunk_index,token_count,content&order=chunk_index.asc&limit=3`,
      { headers }
    );

    if (!res.ok) {
      err(`Chunks query failed for "${doc.title}": ${res.status}`);
      continue;
    }

    const chunks = await res.json() as {
      id: string; chunk_index: number; token_count: number; content: string;
    }[];

    // Full count
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_document_chunks?document_id=eq.${doc.id}&select=id`,
      { headers: { ...headers, Prefer: "count=exact" } }
    );
    const total = parseInt(countRes.headers.get("content-range")?.split("/")[1] ?? "0", 10);

    console.log(`  📄 "${doc.title}": ${total} chunk(s) actually stored`);
    if (chunks.length > 0) {
      for (const c of chunks) {
        const preview = c.content.slice(0, 100).replace(/\n/g, " ");
        console.log(`     [${c.chunk_index}] tokens=${c.token_count} | "${preview}…"`);
      }
      if (total > 3) console.log(`     … and ${total - 3} more`);
    } else {
      warn(`No chunks found — document needs to be (re)indexed`);
    }
    console.log();
  }
}

// ── SECTION 3: PDF Extraction Comparison ─────────────────────────────────────

async function inspectPdfExtraction(fileUrl: string | null) {
  sep("Section 3 — PDF Text Extraction Analysis");

  // Try local file first
  const localPath = resolve(process.cwd(), "test-embedding", "الخدمات الرقمية.pdf");
  let pdfBuffer: Buffer | null = null;

  if (existsSync(localPath)) {
    pdfBuffer = readFileSync(localPath);
    info(`Using LOCAL file: ${localPath} (${pdfBuffer.length} bytes)`);
  } else if (fileUrl) {
    info(`Downloading from Supabase Storage: ${fileUrl}`);
    const r = await fetch(fileUrl);
    if (r.ok) {
      pdfBuffer = Buffer.from(await r.arrayBuffer());
      info(`Downloaded: ${pdfBuffer.length} bytes`);
    } else {
      err(`Download failed: ${r.status} ${r.statusText}`);
      return;
    }
  } else {
    err("No local file and no file_url — cannot test extraction");
    return;
  }

  console.log();

  // ── OLD approach: ASCII-only extraction ──────────────────────────────────
  console.log("  [OLD — ASCII-only extraction]");
  const uint8 = new Uint8Array(pdfBuffer);
  let asciiText = "";
  for (let i = 0; i < uint8.length; i++) {
    if (uint8[i] >= 32 && uint8[i] <= 126) asciiText += String.fromCharCode(uint8[i]);
    else if (uint8[i] === 10 || uint8[i] === 13) asciiText += "\n";
    else asciiText += " ";
  }
  asciiText = asciiText.replace(/\s{3,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  const asciiWords = asciiText.split(/\s+/).filter(Boolean).length;
  const arabicInAscii = (asciiText.match(/[\u0600-\u06FF]/g) ?? []).length;
  console.log(`     Characters: ${asciiText.length}`);
  console.log(`     Words:      ${asciiWords}`);
  console.log(`     Arabic chars extracted: ${arabicInAscii} (should be near 0 — all dropped!)`);
  console.log(`     Preview: "${asciiText.slice(0, 150).replace(/\s+/g, " ")}"`);
  console.log();

  if (asciiWords < 10) {
    err("OLD extraction produced < 10 words — virtually useless for an Arabic PDF");
  } else {
    warn(`OLD extraction got ${asciiWords} words but likely all are PDF structure noise, not Arabic text`);
  }

  // ── NEW approach: pdf-parse ───────────────────────────────────────────────
  console.log("  [NEW — pdf-parse Unicode extraction]");
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(pdfBuffer);

    const { text, numpages, info: pdfInfo } = data;
    const words = text.split(/\s+/).filter(Boolean).length;
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) ?? []).length;

    console.log(`     Pages:       ${numpages}`);
    console.log(`     Characters:  ${text.length}`);
    console.log(`     Words:       ${words}`);
    console.log(`     Arabic chars: ${arabicChars} (${Math.round(arabicChars / text.length * 100)}% of content)`);
    console.log(`     PDF title:   ${pdfInfo?.Title ?? "(none)"}`);
    console.log(`     PDF author:  ${pdfInfo?.Author ?? "(none)"}`);
    console.log();
    console.log(`     First 300 chars of extracted text:`);
    console.log(`     "${text.slice(0, 300).replace(/\n/g, "↵")}"`);
    console.log();

    if (words < 10) {
      err("pdf-parse also got < 10 words — this may be a scanned/image PDF (needs OCR)");
    } else if (arabicChars < 10) {
      warn("pdf-parse got text but almost no Arabic — might be encoding issue or non-Arabic PDF");
      ok(`Got ${words} words (mostly Latin/numbers)`);
    } else {
      ok(`pdf-parse extracted ${words} words with ${arabicChars} Arabic chars ✓`);
    }

    // Estimate chunks
    const MAX_WORDS = 800;
    const estimatedChunks = Math.ceil(words / (MAX_WORDS * 0.9));
    info(`Estimated chunks (800 words each): ~${estimatedChunks}`);
    info(`Time to embed at 4.2s/chunk (free tier): ~${Math.round(estimatedChunks * 4.2)}s`);
  } catch (e) {
    err(`pdf-parse failed: ${e}`);
  }
}

// ── SECTION 4: API Key Validation ────────────────────────────────────────────

async function testApiKey() {
  sep("Section 4 — Gemini API Key Validation");

  const keyMasked = GEMINI_KEY
    ? `${GEMINI_KEY.slice(0, 8)}...${GEMINI_KEY.slice(-4)}`
    : "(not set)";

  console.log(`  Key in use:   ${keyMasked}`);
  console.log(`  Key format:   ${GEMINI_KEY?.startsWith("AIzaSy") ? "✅ Standard AIzaSy… format" : "⚠️  Non-standard format (may be expired/wrong)"}`);
  console.log();

  if (!GEMINI_KEY) {
    err("GEMINI_API_KEY is not set in .env.local");
    return;
  }

  const MODEL = "gemini-embedding-2-preview";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${GEMINI_KEY}`;

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text: "اختبار مفتاح API الجديد لنظام UniBot" }] },
        outputDimensionality: 768,
      }),
    });
  } catch (e) {
    err(`Network error: ${e}`);
    return;
  }
  const elapsed = Date.now() - t0;

  if (res.status === 429) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    err(`429 Too Many Requests — KEY IS RATE LIMITED OR EXHAUSTED`);
    console.log(`     Response: ${JSON.stringify(body).slice(0, 400)}`);
    warn("Try a new API key or wait until the quota resets (daily at midnight UTC)");
    return;
  }

  if (res.status === 400) {
    const body = await res.text();
    err(`400 Bad Request — Key may be invalid. Detail: ${body.slice(0, 300)}`);
    return;
  }

  if (res.status === 403) {
    err("403 Forbidden — Key does not have permission for this API or the API is not enabled");
    return;
  }

  if (!res.ok) {
    const body = await res.text();
    err(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    return;
  }

  const data = await res.json() as { embedding?: { values?: number[] } };
  const values = data?.embedding?.values ?? [];

  if (values.length === 768) {
    ok(`API key is VALID ✓ — Got 768-dim embedding in ${elapsed}ms`);
    info(`First 3 dims: [${values.slice(0, 3).map(v => v.toFixed(4)).join(", ")}]`);
  } else {
    err(`Unexpected dimension: ${values.length} (expected 768)`);
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       UniBot — Debug Document Inspector                      ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const docs = await inspectDocuments();
  if (!docs) process.exit(1);

  await inspectChunks(docs);

  const targetDoc = docs.find(d => d.title.includes("الخدمات") || d.title.toLowerCase().includes("digital"));
  await inspectPdfExtraction(targetDoc?.file_url ?? null);

  await testApiKey();

  sep("Diagnosis Summary");
  console.log(`
  ROOT CAUSES identified:
  1. API Key: Old key (AQ.Ab8…) is exhausted/invalid.
              New key (AIzaSy…) applied → test above confirms.
  2. Rate limit delay was 1100ms (54 RPM) vs free-tier 15 RPM.
              Fixed to 4200ms (14 RPM).
  3. PDF extraction: Old code used ASCII-only (bytes 32-126).
              Arabic text (U+0600-U+06FF) → all became spaces.
              Fixed with pdf-parse → proper Unicode extraction.
  `);
}

main().catch(e => { console.error(e); process.exit(1); });
