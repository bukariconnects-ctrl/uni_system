import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { GradebookClient } from "./gradebook-client";

export default async function GradebookPage() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const { data: scheduleData } = await supabase
    .from("course_schedules")
    .select("study_plan_courses!inner(course_id, courses!inner(id, code, name)), semesters!inner(name, status)")
    .eq("instructor_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  // Deduplicate courses
  const seen = new Set<string>();
  const courses = (scheduleData || []).reduce((acc: any[], s: any) => {
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
        <h1 className="text-2xl font-bold text-text-primary">سجل الدرجات</h1>
        <p className="mt-1 text-sm text-text-secondary">إدارة درجات الطلاب ونشرها</p>
      </div>
      <GradebookClient courses={courses} />
    </div>
  );
}
