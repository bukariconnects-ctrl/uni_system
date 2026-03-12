import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");

let SUPABASE_URL = "";
let ANON_KEY = "";
for (const line of env.split("\n")) {
  const [key, ...val] = line.split("=");
  const value = val.join("=").trim();
  if (key?.trim() === "NEXT_PUBLIC_SUPABASE_URL") SUPABASE_URL = value;
  if (key?.trim() === "NEXT_PUBLIC_SUPABASE_ANON_KEY") ANON_KEY = value;
}

const USERS = [
  {
    email: "superadmin@unibot.io", role: "super_admin",
    tables: ["profiles", "tenants", "subscription_plans", "system_announcements"],
  },
  {
    email: "admin@ust-taiz.edu.ye", role: "tenant_admin",
    tables: ["profiles", "colleges", "departments", "majors", "academic_levels", "courses", "study_plan_courses", "venues", "semesters", "sections", "enrollments", "schedules", "custom_roles", "notifications", "circulars"],
  },
  {
    email: "khaled.nasser@ust-taiz.edu.ye", role: "academic_management",
    tables: ["profiles", "sections", "enrollments", "schedules", "colleges", "departments", "majors", "courses", "circulars", "notifications"],
  },
  {
    email: "dr.ahmed@ust-taiz.edu.ye", role: "faculty",
    tables: ["sections", "course_materials", "assignments", "attendance_sessions", "gradebook_entries", "attendance_records", "channels", "messages", "notifications"],
  },
  {
    email: "mohammed.ali@ust-taiz.edu.ye", role: "student",
    tables: ["enrollments", "course_materials", "assignments", "submissions", "attendance_records", "attendance_summaries", "gradebook_entries", "conversations", "messages", "notifications", "circulars"],
  },
];

let totalTests = 0;
let passed = 0;
let warnings = 0;
let failed = 0;

console.log("=".repeat(60));
console.log("UniBot RLS — Comprehensive Data Access Test");
console.log("=".repeat(60));

for (const user of USERS) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error: authError } = await client.auth.signInWithPassword({
    email: user.email,
    password: "123456",
  });

  if (authError) {
    console.log(`\n❌ ${user.role} (${user.email}): Sign-in FAILED — ${authError.message}`);
    failed += user.tables.length;
    totalTests += user.tables.length;
    continue;
  }

  console.log(`\n✅ ${user.role} (${user.email})`);

  for (const table of user.tables) {
    totalTests++;
    const { data, error } = await client
      .from(table)
      .select("*", { count: "exact", head: false })
      .limit(5);

    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`);
      failed++;
    } else if (data.length === 0) {
      console.log(`   ⚠️  ${table}: 0 rows (may be expected)`);
      warnings++;
    } else {
      console.log(`   ✅ ${table}: ${data.length} rows`);
      passed++;
    }
  }

  await client.auth.signOut();
}

console.log("\n" + "=".repeat(60));
console.log(`Results: ${passed} passed, ${warnings} warnings, ${failed} failed / ${totalTests} total`);
console.log("=".repeat(60));
