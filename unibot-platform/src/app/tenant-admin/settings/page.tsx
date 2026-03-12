import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", profile.tenant_id)
    .single();

  if (!tenant) {
    return (
      <div className="text-center text-sm text-text-secondary">
        لم يتم العثور على بيانات الجامعة
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إعدادات الجامعة</h1>
        <p className="mt-1 text-sm text-text-secondary">
          تخصيص العلامة التجارية والإعدادات العامة
        </p>
      </div>
      <SettingsClient tenant={tenant} />
    </div>
  );
}
