import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { GradebookClient } from "./gradebook-client";

export default async function GradebookPage() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { data: sections } = await supabase
    .from("sections")
    .select("id, section_code, courses(code, name), semesters(name, status)")
    .eq("tenant_id", profile.tenant_id)
    .eq("instructor_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">سجل الدرجات</h1>
        <p className="mt-1 text-sm text-text-secondary">إدارة درجات الطلاب ونشرها</p>
      </div>
      <GradebookClient sections={sections || []} />
    </div>
  );
}
