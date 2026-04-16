/**
 * Migration script: Fix embedding column dimensions (1536 → 768)
 *
 * Why this script exists:
 *   The remote Supabase DB still has embedding column as vector(1536)
 *   because the local migration 20260308002000_gemini_embedding_768.sql
 *   was never pushed to the remote instance.
 *   gemini-embedding-2-preview with outputDimensionality=768 (MRL)
 *   produces 768-dim vectors, causing dimension mismatch on INSERT.
 *
 * IMPORTANT: Uses port 5432 (session-mode pooler) because:
 *   - Port 6543 = transaction-mode pooler → DDL (ALTER TABLE) not supported
 *   - Port 5432 = session-mode pooler    → DDL fully supported
 *
 * Run: npx tsx scripts/apply-migration.ts
 */

import { Client } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local ──────────────────────────────────────────────────────────
const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

// ── Build connection string (session mode = port 5432) ───────────────────────
// DATABASE_URL uses port 6543 (transaction pooler) — switch to 5432 for DDL
const rawUrl = process.env.DATABASE_URL!;
const sessionUrl = rawUrl.replace(":6543/", ":5432/");

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║   UniBot — Apply Migration: fix embedding dimensions (768)   ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log(`  DB endpoint: ${sessionUrl.replace(/:[^:@]+@/, ":***@")}`);

// ── Read migration SQL ───────────────────────────────────────────────────────
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260416000001_fix_embedding_dimensions_768.sql"
);
const migrationSQL = readFileSync(migrationPath, "utf-8");

// ── Connect and run ──────────────────────────────────────────────────────────
const client = new Client({
  connectionString: sessionUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function run() {
  console.log("\n  Connecting to Supabase (session-mode pooler, port 5432)...");
  await client.connect();
  console.log("  ✅ Connected\n");

  console.log("  Running migration SQL...");
  try {
    await client.query(migrationSQL);
    console.log("  ✅ Migration applied successfully!\n");

    // Verify the column type changed
    const res = await client.query(`
      SELECT column_name, udt_name, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'ai_document_chunks'
        AND column_name  = 'embedding'
    `);
    const row = res.rows[0];
    console.log("  Verification:");
    console.log(`    Table: ai_document_chunks`);
    console.log(`    Column: ${row?.column_name ?? "???"}`);
    console.log(`    Type: ${row?.udt_name ?? "???"}`);

    // Check match_chunks function
    const fnRes = await client.query(`
      SELECT p.proname, pg_catalog.pg_get_function_arguments(p.oid) AS args
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'match_chunks'
    `);
    for (const fn of fnRes.rows) {
      console.log(`    Function: ${fn.proname}(${fn.args})`);
    }

    // Count documents reset
    const docRes = await client.query(
      "SELECT COUNT(*) as cnt FROM ai_knowledge_documents WHERE total_chunks > 0"
    );
    console.log(
      `\n  ⚠️  Documents with stale chunk counts: ${docRes.rows[0].cnt} ` +
        `(all were reset to 0 — please reindex each document)`
    );
  } catch (err) {
    console.error("  ❌ Migration failed:", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
