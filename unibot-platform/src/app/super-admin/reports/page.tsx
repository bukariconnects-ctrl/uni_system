import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { SuperAdminReportsClient } from "./reports-client";

export default async function SuperAdminReportsPage() {
  await requireRole(["super_admin"]);
  const serviceClient = createServiceClient();

  // Fetch data from views — only platform-level data, no educational stats
  const [{ data: overview }, { data: tokenUsage }, { data: monthlyGrowth }] = await Promise.all([
    serviceClient.from("v_super_admin_tenants_overview").select("*").maybeSingle(),
    serviceClient.from("v_super_admin_token_usage").select("*"),
    serviceClient.from("v_super_admin_monthly_growth").select("*").order("year_month"),
  ]);

  // Tenant list with basic info — no educational data exposed
  const { data: tenants } = await serviceClient
    .from("tenants")
    .select("id, name, subdomain, status, max_users, storage_used_gb, max_storage_gb, created_at, absence_limit_count")
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  // Active subscriptions mapping
  const { data: subscriptions } = await serviceClient
    .from("subscriptions")
    .select("tenant_id, plan_id, status, start_date, end_date")
    .in("status", ["active", "trial"]);

  const activeSubMap: Record<string, any> = {};
  if (subscriptions) {
    for (const sub of subscriptions) {
      activeSubMap[sub.tenant_id] = sub;
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التقارير والإحصائيات</h1>
        <p className="mt-1 text-sm text-text-secondary">نظرة شاملة على جميع الجامعات في المنصة</p>
      </div>

      <SuperAdminReportsClient
        data={{
          overview,
          tokenUsage: tokenUsage || [],
          monthlyGrowth: monthlyGrowth || [],
          tenants: (tenants || []).map((t: any) => ({
            ...t,
            subscription: activeSubMap[t.id] || null,
          })),
        }}
      />
    </div>
  );
}
