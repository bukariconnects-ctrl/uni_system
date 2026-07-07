import { requireRole } from "@/lib/auth/get-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { GradebookClient } from "./gradebook-client";

export default async function GradebookPage() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: scheduleData } = await supabase
    .from("course_schedules")
    .select("study_plan_courses!inner(id, course_id, academic_level_id, courses!inner(id, code, name)), semesters!inner(name, status)")
    .eq("instructor_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  // Deduplicate courses and build course groups for major/level filtering
  const seen = new Set<string>();
  const courses: any[] = [];
  const spcIds: string[] = [];

  (scheduleData || []).forEach((s: any) => {
    const spc = s.study_plan_courses;
    if (spc?.courses && !seen.has(spc.courses.id)) {
      seen.add(spc.courses.id);
      courses.push(spc.courses);
    }
    if (spc?.id) spcIds.push(spc.id);
  });

  // Resolve course groups (major / level) from study_plan_courses
  let courseGroups: any[] = [];
  if (spcIds.length > 0) {
    const { data: spcData } = await serviceClient
      .from("study_plan_courses")
      .select("id, course_id, academic_level_id")
      .in("id", spcIds);

    const alIds = [
      ...new Set((spcData || []).map((s: any) => s.academic_level_id).filter(Boolean)),
    ];

    if (alIds.length > 0) {
      const { data: alData } = await serviceClient
        .from("academic_levels")
        .select("id, level_number, major_id, majors(name)")
        .in("id", alIds);

      courseGroups = (spcData || []).map((spc: any) => {
        const al = (alData || []).find((a: any) => a.id === spc.academic_level_id);
        return {
          course_id: spc.course_id,
          academic_level_id: spc.academic_level_id,
          major_id: al?.major_id || null,
          major_name: (al as any)?.majors?.name || null,
          level_number: al?.level_number || null,
        };
      });
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">سجل الدرجات</h1>
        <p className="mt-1 text-sm text-text-secondary">إدارة درجات الطلاب ونشرها</p>
      </div>
      <GradebookClient courses={courses} courseGroups={courseGroups} />
    </div>
  );
}
