import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { VenuesClient } from "./venues-client";

export default async function VenuesPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إدارة القاعات</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إضافة وتعديل القاعات والمختبرات والمدرجات
        </p>
      </div>
      <VenuesClient initialVenues={venues || []} />
    </div>
  );
}
