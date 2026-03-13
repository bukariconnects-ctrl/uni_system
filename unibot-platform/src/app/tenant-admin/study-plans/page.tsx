import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { StudyPlanClient } from "./study-plan-client";

export default async function StudyPlansPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const [majorsRes, coursesRes] = await Promise.all([
    supabase
      .from("majors")
      .select("id, name, code, departments(name, colleges(name)), academic_levels(id, level_number, name)")
      .eq("tenant_id", profile.tenant_id)
      .order("name"),
    supabase
      .from("courses")
      .select("id, code, name, credit_hours, course_type")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("code"),
  ]);

  const transformedMajors = (majorsRes.data || []).map((major: any) => ({
    ...major,
    departments: Array.isArray(major.departments) && major.departments.length > 0
      ? {
          name: major.departments[0].name,
          colleges: Array.isArray(major.departments[0].colleges) && major.departments[0].colleges.length > 0
            ? major.departments[0].colleges[0]
            : null
        }
      : null
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">الخطط الدراسية</h1>
        <p className="mt-1 text-sm text-text-secondary">
          بناء الخطط الدراسية وربط المقررات بالمستويات والفصول الدراسية
        </p>
      </div>
      <StudyPlanClient
        majors={transformedMajors}
        courses={coursesRes.data || []}
      />
    </div>
  );
}
