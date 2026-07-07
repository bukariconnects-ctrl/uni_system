import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { getStorageUsageGb } from "@/lib/storage-usage";
import { SuperAdminReportsClient } from "./reports-client";

export default async function SuperAdminReportsPage() {
  await requireRole(["super_admin"]);
  const serviceClient = createServiceClient();

  // Fetch data from views — only platform-level data, no educational stats
  const [{ data: overview }, { data: tokenUsage }, { data: monthlyGrowth }, storageUsage] = await Promise.all([
    serviceClient.from("v_super_admin_tenants_overview").select("*").maybeSingle(),
    serviceClient.from("v_super_admin_token_usage").select("*"),
    serviceClient.from("v_super_admin_monthly_growth").select("*").order("year_month"),
    getStorageUsageGb(),
  ]);

  // Build real storage map: tenant_id → storage_mb (convert from GB to MB)
  const storageMap = new Map<string, number>();
  let realTotalStorageMb = 0;
  for (const s of storageUsage) {
    const mb = s.storage_gb * 1024;
    storageMap.set(s.tenant_id, mb);
    realTotalStorageMb += mb;
  }

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

  // Build overview with real storage values (MB)
  const realOverview = overview
    ? {
        ...overview,
        total_storage_used_gb: realTotalStorageMb,
        total_max_storage_gb: (overview.total_max_storage_gb || 0) * 1024,
      }
    : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التقارير والإحصائيات</h1>
        <p className="mt-1 text-sm text-text-secondary">نظرة شاملة على جميع الجامعات في المنصة</p>
      </div>

      <SuperAdminReportsClient
        data={{
          overview: realOverview,
          tokenUsage: tokenUsage || [],
          monthlyGrowth: monthlyGrowth || [],
          tenants: (tenants || []).map((t: any) => ({
            ...t,
            storage_used_gb: storageMap.get(t.id) ?? (t.storage_used_gb || 0) * 1024,
            max_storage_gb: (t.max_storage_gb || 0) * 1024,
            subscription: activeSubMap[t.id] || null,
          })),
        }}
      />
    </div>
  );
}
