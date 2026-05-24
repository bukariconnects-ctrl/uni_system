/**
 * Migration script: Add section_type ENUM + parent_section_id to sections table
 *
 * Why this script exists:
 *   Migration 20260318001114_align_academic_workflow.sql was never pushed to the
 *   remote Supabase instance. The `section_type` column is missing from the DB,
 *   causing "Could not find the 'section_type' column of 'sections' in the schema cache".
 *
 * Run: node scripts/apply-section-type-migration.mjs
 */

import pg from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

const { Client } = pg;

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

// ── Build connection string (session mode = port 5432 for DDL) ───────────────
const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}
const sessionUrl = rawUrl.replace(":6543/", ":5432/");

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║   UniBot — Apply Migration: section_type + parent_section_id ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log(`  DB endpoint: ${sessionUrl.replace(/:[^:@]+@/, ":***@")}`);

// ── Targeted SQL ─────────────────────────────────────────────────────────────
const migrationSQL = `
-- Create section_type enum (safe: skips if already exists)
DO $$ BEGIN
    CREATE TYPE section_type AS ENUM ('lecture', 'lab', 'tutorial');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add parent_section_id (self-referencing FK for child lab sections)
ALTER TABLE sections
    ADD COLUMN IF NOT EXISTS parent_section_id UUID REFERENCES sections(id) ON DELETE CASCADE;

-- Add section_type to distinguish lecture (parent) from lab (child)
ALTER TABLE sections
    ADD COLUMN IF NOT EXISTS section_type section_type NOT NULL DEFAULT 'lecture';

-- Index for parent lookups
CREATE INDEX IF NOT EXISTS idx_sections_parent_id ON sections(parent_section_id);
`;

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

    // Verify columns exist
    const res = await client.query(`
      SELECT column_name, data_type, udt_name, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'sections'
        AND column_name  IN ('section_type', 'parent_section_id')
      ORDER BY column_name
    `);

    console.log("  Verification — sections table columns:");
    if (res.rows.length === 0) {
      console.log("  ⚠️  No matching columns found — migration may have failed silently.");
    } else {
      for (const row of res.rows) {
        console.log(
          `    ✅ ${row.column_name}: type=${row.udt_name}, default=${row.column_default ?? "none"}, nullable=${row.is_nullable}`
        );
      }
    }

    console.log(
      "\n  ✅ Done! Refresh the Supabase schema cache (or restart your Next.js dev server) to pick up the changes."
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
