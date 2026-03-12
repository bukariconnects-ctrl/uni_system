import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { AssignmentsClient } from "./assignments-client";

export default async function AssignmentsPage() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const [sectionsRes, assignmentsRes] = await Promise.all([
    supabase
      .from("sections")
      .select("id, section_code, courses(code, name), semesters(name, status)")
      .eq("tenant_id", profile.tenant_id)
      .eq("instructor_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("*, sections(section_code, courses(code, name))")
      .eq("tenant_id", profile.tenant_id)
      .eq("created_by", profile.id)
      .order("due_date", { ascending: true }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التكاليف والواجبات</h1>
        <p className="mt-1 text-sm text-text-secondary">إنشاء التكاليف وتصحيح التسليمات</p>
      </div>
      <AssignmentsClient
        sections={sectionsRes.data || []}
        assignments={assignmentsRes.data || []}
      />
    </div>
  );
}
