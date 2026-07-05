// Script to check deleted tenants and estimate data volume
const { createClient } = require('@supabase/supabase-js');

const url = 'https://leduumxihcngowpaujkr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZHV1bXhpaGNuZ293cGF1amtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgyMDg2OSwiZXhwIjoyMDg4Mzk2ODY5fQ.GqCf2T4Z1dpmh5MM4bYBV1CtkwXBYS6rgdc-t9NuIQY';

const supabase = createClient(url, key);

const DELETED_IDS = [
  "bf1649ad-66c3-4b25-a9b1-795f0315df14",
  "c040bad1-1fdb-472c-9f58-cb15ab18ff9b",
  "b0000000-0000-0000-0000-000000000001"
];

async function countTable(table, tenantCol = "tenant_id", ids = DELETED_IDS) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .in(tenantCol, ids);
  if (error) return { table, count: 0, error: error.message };
  return { table, count };
}

async function main() {
  // Known tables that have tenant_id
  const tables = [
    "tenants", "profiles", "colleges", "departments", "majors",
    "academic_levels", "courses", "study_plan_courses", "course_prerequisites",
    "enrollments", "course_schedules", "attendance_sessions",
    "attendance_records", "attendance_summaries", "semesters",
    "notifications", "channels", "channel_messages", "channel_members",
    "student_risk_scores", "course_risk_flags", "student_recommendations",
    "student_profiles", "student_majors", "tickets", "ticket_messages",
    "student_payments", "campuses", "circulars"
  ];

  console.log("=== Data volume for deleted tenants ===\n");

  for (const table of tables) {
    const result = await countTable(table);
    if (result.count > 0 || result.error) {
      console.log(`${table}: ${result.count} rows${result.error ? ` (ERROR: ${result.error})` : ''}`);
    }
  }
}

main().catch(console.error);
