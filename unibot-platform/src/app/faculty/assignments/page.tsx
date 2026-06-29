import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { AssignmentsClient } from "./assignments-client";

export default async function AssignmentsPage() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const [coursesRes, assignmentsRes] = await Promise.all([
    supabase
      .from("course_schedules")
      .select("study_plan_courses!inner(course_id, courses!inner(id, code, name)), semesters!inner(name, status)")
      .eq("instructor_id", profile.id)
      .eq("tenant_id", profile.tenant_id),
    supabase
      .from("assignments")
      .select("*, courses(code, name)")
      .eq("tenant_id", profile.tenant_id)
      .eq("created_by", profile.id)
      .order("due_date", { ascending: true }),
  ]);

  // Deduplicate courses (same course may appear in multiple schedules)
  const seen = new Set<string>();
  const courses = (coursesRes.data || []).reduce((acc: any[], s: any) => {
    const c = s.study_plan_courses?.courses;
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      acc.push(c);
    }
    return acc;
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التكاليف والواجبات</h1>
        <p className="mt-1 text-sm text-text-secondary">إنشاء التكاليف وتصحيح التسليمات</p>
      </div>
      <AssignmentsClient
        courses={courses}
        assignments={assignmentsRes.data || []}
      />
    </div>
  );
}
