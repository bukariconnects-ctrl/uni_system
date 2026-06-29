import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { CircularsClient } from "./circulars-client";

export default async function CircularsPage() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const [circularsRes, coursesRes, majorsRes, departmentsRes] = await Promise.all([
    supabase
      .from("circulars")
      .select("*, sender:profiles!circulars_created_by_fkey(first_name, last_name, role)")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false }),

    supabase
      .from("courses")
      .select("id, code, name")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("code"),

    supabase
      .from("majors")
      .select("id, name")
      .eq("tenant_id", profile.tenant_id)
      .order("name"),

    supabase
      .from("departments")
      .select("id, name")
      .eq("tenant_id", profile.tenant_id)
      .order("name"),
  ]);

  // Also fetch academic_levels grouped by major
  const majorIds = (majorsRes.data || []).map((m: any) => m.id);
  let levels: any[] = [];
  if (majorIds.length > 0) {
    const { data: levelsData } = await supabase
      .from("academic_levels")
      .select("id, name, level_number, major_id")
      .in("major_id", majorIds)
      .order("level_number");
    levels = levelsData || [];
  }

  const courses = (coursesRes.data || []).map((c: any) => ({
    id: c.id,
    label: `${c.code} — ${c.name}`,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التعاميم</h1>
        <p className="mt-1 text-sm text-text-secondary">إنشاء ونشر التعاميم الأكاديمية</p>
      </div>
      <CircularsClient
        circulars={circularsRes.data || []}
        courses={courses}
        majors={majorsRes.data || []}
        levels={levels}
        departments={departmentsRes.data || []}
      />
    </div>
  );
}
