"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import { Pool } from "pg";

// Tables that have a tenant_id column directly — deleted in dependency order
const DELETE_SQL = `
  -- Disable triggers temporarily to avoid notification spam on bulk delete
  SET session_replication_role = 'replica';

  -- 1. Messages & tickets
  DELETE FROM ticket_messages  WHERE ticket_id IN (SELECT id FROM tickets WHERE tenant_id = $1);
  DELETE FROM channel_messages WHERE channel_id IN (SELECT id FROM channels WHERE tenant_id = $1);
  DELETE FROM channel_members  WHERE channel_id IN (SELECT id FROM channels WHERE tenant_id = $1);

  -- 2. Attendance
  DELETE FROM attendance_records    WHERE tenant_id = $1;
  DELETE FROM attendance_summaries  WHERE tenant_id = $1;
  DELETE FROM attendance_sessions   WHERE tenant_id = $1;

  -- 3. Risk & recommendations
  DELETE FROM course_risk_flags      WHERE tenant_id = $1;
  DELETE FROM student_risk_scores    WHERE tenant_id = $1;
  DELETE FROM student_recommendations WHERE tenant_id = $1;

  -- 4. Study plan & scheduling
  DELETE FROM course_prerequisites   WHERE course_id IN (SELECT id FROM courses WHERE tenant_id = $1);
  DELETE FROM study_plan_courses     WHERE tenant_id = $1;
  DELETE FROM course_schedules       WHERE tenant_id = $1;

  -- 5. Enrollments
  DELETE FROM enrollments            WHERE tenant_id = $1;

  -- 6. Notifications
  DELETE FROM notifications          WHERE tenant_id = $1;

  -- 7. Student data
  DELETE FROM student_majors         WHERE tenant_id = $1;
  DELETE FROM student_profiles       WHERE tenant_id = $1;

  -- 8. Tickets
  DELETE FROM tickets                WHERE tenant_id = $1;

  -- 9. Courses & academic structure
  DELETE FROM courses                WHERE tenant_id = $1;
  DELETE FROM academic_levels        WHERE tenant_id = $1;
  DELETE FROM majors                 WHERE tenant_id = $1;
  DELETE FROM departments            WHERE tenant_id = $1;
  DELETE FROM colleges               WHERE tenant_id = $1;

  -- 10. Semester, campuses, circulars
  DELETE FROM semesters              WHERE tenant_id = $1;
  DELETE FROM campuses               WHERE tenant_id = $1;
  DELETE FROM circulars              WHERE tenant_id = $1;

  -- 11. Channels (after channel_messages/channel_members)
  DELETE FROM channels               WHERE tenant_id = $1;

  -- 12. Profiles (users)
  DELETE FROM profiles               WHERE tenant_id = $1;

  -- 13. Finally the tenant itself
  DELETE FROM tenants                WHERE id = $1;

  -- Re-enable triggers
  SET session_replication_role = 'origin';
`;

export async function permanentCleanDeletedTenants() {
  const { profile } = await requireRole(["super_admin"]);
  const supabase = await createClient();

  // Find all deleted tenants
  const { data: deletedTenants, error: fetchError } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("status", "deleted");

  if (fetchError) throw new Error("فشل في جلب بيانات الجامعات المحذوفة: " + fetchError.message);
  if (!deletedTenants || deletedTenants.length === 0) {
    return { success: true, message: "لا توجد جامعات محذوفة لتنظيف بياناتها", results: [] };
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const results: { tenant: string; deleted: boolean; error?: string }[] = [];

  try {
    for (const tenant of deletedTenants) {
      try {
        await pool.query(DELETE_SQL, [tenant.id]);
        results.push({ tenant: tenant.name, deleted: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "خطأ غير معروف";
        console.error(`Error deleting tenant ${tenant.id} (${tenant.name}):`, msg);
        results.push({ tenant: tenant.name, deleted: false, error: msg });
      }
    }
  } finally {
    await pool.end();
  }

  revalidatePath("/super-admin/tenants");

  return {
    success: true,
    message: `تم حذف ${deletedTenants.length} جامعة وجميع بياناتهم`,
    results,
  };
}
