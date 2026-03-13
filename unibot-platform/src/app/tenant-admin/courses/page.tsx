import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { CatalogClient } from "./catalog-client";

export default async function CoursesPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const [coursesRes, deptsRes] = await Promise.all([
    supabase
      .from("courses")
      .select("*, departments(name)")
      .eq("tenant_id", profile.tenant_id)
      .order("code"),
    supabase
      .from("departments")
      .select("id, name, code")
      .eq("tenant_id", profile.tenant_id)
      .order("name"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">دليل المقررات</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إدارة جميع المقررات الدراسية المتاحة في الجامعة
        </p>
      </div>
      <CatalogClient
        initialCourses={coursesRes.data || []}
        departments={deptsRes.data || []}
      />
    </div>
  );
}
