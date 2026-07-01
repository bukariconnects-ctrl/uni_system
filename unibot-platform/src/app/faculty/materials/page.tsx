import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { MaterialsClient } from "./materials-client";

export default async function MaterialsPage() {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const [mySchedules, materialsRes, syllabiRes] = await Promise.all([
    serviceClient
      .from("course_schedules")
      .select("id, study_plan_course_id, semester_id")
      .eq("tenant_id", profile.tenant_id)
      .eq("instructor_id", profile.id),
    serviceClient
      .from("course_materials")
      .select("*, courses(code, name)")
      .eq("tenant_id", profile.tenant_id)
      .eq("uploaded_by", profile.id)
      .order("week_number", { ascending: true })
      .order("created_at", { ascending: false }),
    serviceClient
      .from("syllabi")
      .select("*, courses(code, name)")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false }),
  ]);

  // Resolve course groups
  const spcIds = [...new Set((mySchedules.data || []).map((s: any) => s.study_plan_course_id).filter(Boolean))];

  let courseGroups: any[] = [];
  let courses: any[] = [];

  if (spcIds.length > 0) {
    const { data: spcData } = await serviceClient
      .from("study_plan_courses")
      .select("id, course_id, academic_level_id")
      .in("id", spcIds);

    const alIds = [...new Set((spcData || []).map((s: any) => s.academic_level_id).filter(Boolean))];
    const courseIds = [...new Set((spcData || []).map((s: any) => s.course_id).filter(Boolean))];

    const [alRes, coursesRes] = await Promise.all([
      alIds.length > 0
        ? serviceClient.from("academic_levels").select("id, level_number, major_id, majors(name)").in("id", alIds)
        : { data: [] },
      courseIds.length > 0
        ? serviceClient.from("courses").select("id, code, name").in("id", courseIds)
        : { data: [] },
    ]);

    const academicLevels = alRes.data || [];
    const allCourses = coursesRes.data || [];

    courseGroups = (spcData || []).map((spc: any) => {
      const al = academicLevels.find((a: any) => a.id === spc.academic_level_id);
      return {
        study_plan_course_id: spc.id,
        course_id: spc.course_id,
        academic_level_id: spc.academic_level_id,
        level_number: al?.level_number || null,
        major_id: al?.major_id || null,
        major_name: (al as any)?.majors?.name || null,
      };
    });

    const seen = new Set<string>();
    courses = allCourses.filter((c: any) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">المحتوى التعليمي</h1>
        <p className="mt-1 text-sm text-text-secondary">رفع المواد التعليمية وإدارة خطط المقررات</p>
      </div>
      <MaterialsClient
        courses={courses}
        courseGroups={courseGroups}
        materials={materialsRes.data || []}
        syllabi={syllabiRes.data || []}
      />
    </div>
  );
}
