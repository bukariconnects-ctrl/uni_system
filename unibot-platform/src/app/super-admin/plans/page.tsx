import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { PlansClient } from "./plans-client";

export default async function PlansPage() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("price_monthly", { ascending: true });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">خطط الاشتراك</h1>
          <p className="mt-1 text-sm text-text-secondary">
            إدارة خطط الاشتراك المتاحة للجامعات
          </p>
        </div>
      </div>
      <PlansClient initialPlans={plans || []} />
    </div>
  );
}
