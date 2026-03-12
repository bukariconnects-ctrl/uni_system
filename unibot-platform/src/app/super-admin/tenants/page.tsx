import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { TenantsClient } from "./tenants-client";

export default async function TenantsPage() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("*, subscriptions(*, subscription_plans(name))")
    .order("created_at", { ascending: false });

  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إدارة الجامعات</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إنشاء وإدارة الجامعات المشتركة في المنصة
        </p>
      </div>
      <TenantsClient initialTenants={tenants || []} plans={plans || []} />
    </div>
  );
}
