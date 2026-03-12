import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { MaterialsClient } from "./materials-client";

export default async function MaterialsPage() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const [sectionsRes, materialsRes, syllabiRes] = await Promise.all([
    supabase
      .from("sections")
      .select("id, section_code, courses(code, name), semesters(name, status)")
      .eq("tenant_id", profile.tenant_id)
      .eq("instructor_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("course_materials")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("uploaded_by", profile.id)
      .order("week_number", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("syllabi")
      .select("*, sections(section_code, courses(code, name))")
      .eq("tenant_id", profile.tenant_id)
      .eq("instructor_id", profile.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">المحتوى التعليمي</h1>
        <p className="mt-1 text-sm text-text-secondary">
          رفع المواد التعليمية وإدارة خطط المقررات
        </p>
      </div>
      <MaterialsClient
        sections={sectionsRes.data || []}
        materials={materialsRes.data || []}
        syllabi={syllabiRes.data || []}
      />
    </div>
  );
}
