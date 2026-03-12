import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { CircularsClient } from "./circulars-client";

export default async function CircularsPage() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data: circulars } = await supabase
    .from("circulars")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التعاميم</h1>
        <p className="mt-1 text-sm text-text-secondary">إنشاء ونشر التعاميم الأكاديمية</p>
      </div>
      <CircularsClient circulars={circulars || []} />
    </div>
  );
}
