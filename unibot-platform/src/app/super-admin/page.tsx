import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { SuperAdminDashboardClient } from "./super-admin-client";

export default async function SuperAdminDashboard() {
  const { profile } = await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, status, storage_used_gb, max_storage_gb, created_at");

  const { data: tokenUsage } = await supabase
    .from("ai_token_usage")
    .select("tenant_id, total_tokens, cost_usd");

  const { data: invoices } = await supabase
    .from("invoices")
    .select("status, amount, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  // Enrich token usage with tenant names
  const tenantMap = new Map((tenants || []).map((t) => [t.id, t.name]));
  const enrichedTokenUsage = (tokenUsage || []).map((t) => ({
    ...t,
    tenant_name: tenantMap.get(t.tenant_id) || undefined,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-text-secondary">
          مرحباً {profile.first_name}، هذه نظرة عامة على حالة المنصة
        </p>
      </div>

      <SuperAdminDashboardClient
        data={{
          tenants: tenants || [],
          tokenUsage: enrichedTokenUsage,
          invoices: invoices || [],
        }}
      />
    </div>
  );
}
