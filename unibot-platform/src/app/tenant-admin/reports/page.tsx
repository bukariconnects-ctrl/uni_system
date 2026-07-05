import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { TenantAdminReportsClient } from "./reports-client";

export default async function TenantAdminReportsPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const serviceClient = createServiceClient();
  const tenantId = profile.tenant_id!;

  const [{ data: userStats }, { data: collegeStats }, { data: courseOverview }, { data: attendanceSummary }] = await Promise.all([
    serviceClient.from("v_tenant_user_stats").select("*").eq("tenant_id", tenantId).maybeSingle(),
    serviceClient.from("v_tenant_college_stats").select("*").eq("tenant_id", tenantId),
    serviceClient.from("v_tenant_course_overview").select("*").eq("tenant_id", tenantId).order("course_name"),
    serviceClient.from("v_tenant_attendance_summary").select("*").eq("tenant_id", tenantId),
  ]);

  // Tenant info for additional context
  const { data: tenant } = await serviceClient
    .from("tenants")
    .select("name, storage_used_gb, max_storage_gb, max_users, absence_limit_count, status")
    .eq("id", tenantId)
    .single();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التقارير والإحصائيات</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tenant?.name || "جامعة"} — إحصائيات شاملة
        </p>
      </div>

      <TenantAdminReportsClient
        data={{
          userStats,
          collegeStats: collegeStats || [],
          courseOverview: courseOverview || [],
          attendanceSummary: attendanceSummary || [],
          tenant,
        }}
      />
    </div>
  );
}
