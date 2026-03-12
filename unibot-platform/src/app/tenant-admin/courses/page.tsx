import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { CoursesClient } from "./courses-client";

export default async function CoursesPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const [coursesRes, deptsRes, levelsRes, planCoursesRes, prerequisitesRes] =
    await Promise.all([
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
      supabase
        .from("academic_levels")
        .select("id, level_number, name, major_id, majors(name, code)")
        .eq("tenant_id", profile.tenant_id)
        .order("level_number"),
      supabase
        .from("study_plan_courses")
        .select("*, courses(code, name, credit_hours), academic_levels(level_number, name, majors(name))")
        .eq("tenant_id", profile.tenant_id),
      supabase
        .from("course_prerequisites")
        .select("id, course_id, prerequisite_id, min_grade")
        .eq("tenant_id", profile.tenant_id),
    ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">المقررات والخطط الدراسية</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إدارة كتالوج المقررات وربطها بالخطط الدراسية والمتطلبات السابقة
        </p>
      </div>
      <CoursesClient
        initialCourses={coursesRes.data || []}
        departments={deptsRes.data || []}
        levels={levelsRes.data || []}
        planCourses={planCoursesRes.data || []}
        prerequisites={prerequisitesRes.data || []}
      />
    </div>
  );
}
