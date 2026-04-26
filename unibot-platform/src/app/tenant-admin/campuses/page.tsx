import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { CampusesClient } from "./campuses-client";

export default async function CampusesPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const [campusesRes, collegesRes] = await Promise.all([
    supabase
      .from("campuses")
      .select("id, name, location, is_active")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("colleges")
      .select("id, name, code, campus_id, campuses(name)")
      .eq("tenant_id", profile.tenant_id)
      .order("name"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">الفروع والأحرم الجامعية</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إدارة الفروع الجامعية واستنساخ الهياكل الأكاديمية بين الفروع
        </p>
      </div>
      <CampusesClient
        initialCampuses={campusesRes.data || []}
        colleges={collegesRes.data || []}
      />
    </div>
  );
}
