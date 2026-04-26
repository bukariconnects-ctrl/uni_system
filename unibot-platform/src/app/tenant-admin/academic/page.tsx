import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { AcademicClient } from "./academic-client";

export default async function AcademicPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: colleges } = await supabase
    .from("colleges")
    .select("id, name, code, dean_id, absence_threshold, campus_id, campuses(name), departments(id, name, code, head_id, college_id, majors(id, name, code, total_credits, duration_years, department_id, academic_levels(id, major_id, level_number, name)))")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  const [facultyRes, campusesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("tenant_id", profile.tenant_id)
      .in("role", ["faculty", "academic_management"])
      .eq("account_status", "active")
      .order("first_name"),
    supabase
      .from("campuses")
      .select("id, name")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">الهيكل التنظيمي</h1>
        <p className="mt-1 text-sm text-text-secondary">
          بناء الهيكل الأكاديمي للجامعة: الكليات ← الأقسام ← التخصصات ← المستويات
        </p>
      </div>
      <AcademicClient
        initialColleges={colleges || []}
        faculty={facultyRes.data || []}
        campuses={campusesRes.data || []}
      />
    </div>
  );
}
