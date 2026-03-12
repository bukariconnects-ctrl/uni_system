import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { SectionsClient } from "./sections-client";

export default async function SectionsPage() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const [sectionsRes, coursesRes, semestersRes, facultyRes] = await Promise.all([
    supabase
      .from("sections")
      .select("*, courses(code, name, credit_hours), semesters(name, status), profiles!sections_instructor_id_fkey(first_name, last_name)")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("courses")
      .select("id, code, name")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("code"),
    supabase
      .from("semesters")
      .select("id, name, status")
      .eq("tenant_id", profile.tenant_id)
      .in("status", ["planning", "active"])
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("tenant_id", profile.tenant_id)
      .in("role", ["faculty", "academic_management"])
      .eq("account_status", "active")
      .order("first_name"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إدارة الشعب</h1>
        <p className="mt-1 text-sm text-text-secondary">فتح وإغلاق ودمج الشعب الدراسية وتعيين المحاضرين</p>
      </div>
      <SectionsClient
        initialSections={sectionsRes.data || []}
        courses={coursesRes.data || []}
        semesters={semestersRes.data || []}
        faculty={facultyRes.data || []}
      />
    </div>
  );
}
