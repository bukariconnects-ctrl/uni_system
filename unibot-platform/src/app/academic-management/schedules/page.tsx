import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { SchedulesClient } from "./schedules-client";

export default async function SchedulesPage() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data: amdRow } = await supabase
    .from("academic_management_departments")
    .select("department_id")
    .eq("profile_id", profile.id)
    .single();

  const departmentId = amdRow?.department_id;

  const majorsQuery = supabase
    .from("majors")
    .select("id, name, code, department_id")
    .eq("tenant_id", profile.tenant_id)
    .order("name");
  if (departmentId) majorsQuery.eq("department_id", departmentId);

  const { data: majorsData } = await majorsQuery;
  const majorIds = (majorsData || []).map((m) => m.id);

  let scopedCourseIds: string[] | null = null;
  if (departmentId && majorIds.length > 0) {
    // Get academic_level_ids for these majors
    const { data: levelsData } = await supabase
      .from("academic_levels")
      .select("id")
      .in("major_id", majorIds);
    const levelIds = (levelsData || []).map((l) => l.id);

    if (levelIds.length > 0) {
      const { data: spcData } = await supabase
        .from("study_plan_courses")
        .select("course_id")
        .in("academic_level_id", levelIds);
      scopedCourseIds = [...new Set((spcData || []).map((s) => s.course_id))];
    }
  }
  
  // Fallback: if no courses from study_plan, get courses from the department directly
  if (departmentId && (!scopedCourseIds || scopedCourseIds.length === 0)) {
    const { data: deptCourses } = await supabase
      .from("courses")
      .select("id")
      .eq("department_id", departmentId)
      .eq("is_active", true);
    scopedCourseIds = (deptCourses || []).map((c) => c.id);
  }

  const schedulesQuery = supabase
    .from("schedules")
    .select("*, sections(section_code, course_id, semester_id, courses(code, name), profiles!sections_instructor_id_fkey(first_name, last_name), semesters(id, name)), venues(name, code)")
    .eq("tenant_id", profile.tenant_id)
    .order("day_of_week")
    .order("start_time");

  const sectionsQuery = supabase
    .from("sections")
    .select("id, section_code, course_id, semester_id, instructor_id, courses(code, name), semesters(name, status), profiles!sections_instructor_id_fkey(first_name, last_name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (scopedCourseIds !== null && scopedCourseIds.length > 0) {
    sectionsQuery.in("course_id", scopedCourseIds);
  }
  // If scopedCourseIds is null or empty, show all tenant sections (fallback)

  const [schedulesRes, sectionsRes, venuesRes, semestersRes, levelsRes, studyPlanRes] = await Promise.all([
    schedulesQuery,
    sectionsQuery,
    supabase
      .from("venues")
      .select("id, name, code, venue_type, capacity")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("semesters")
      .select("id, name, status")
      .eq("tenant_id", profile.tenant_id)
      .in("status", ["planning", "active"])
      .order("created_at", { ascending: false }),
    majorIds.length > 0
      ? supabase
          .from("academic_levels")
          .select("id, name, level_number, major_id")
          .eq("tenant_id", profile.tenant_id)
          .in("major_id", majorIds)
          .order("level_number")
      : Promise.resolve({ data: [] }),
    majorIds.length > 0
      ? supabase
          .from("study_plan_courses")
          .select("course_id, major_id, academic_level_id")
          .eq("tenant_id", profile.tenant_id)
          .in("major_id", majorIds)
      : Promise.resolve({ data: [] }),
  ]);

  let filteredSchedules = schedulesRes.data || [];
  if (scopedCourseIds !== null) {
    filteredSchedules = filteredSchedules.filter((s: any) =>
      s.sections?.course_id && scopedCourseIds.includes(s.sections.course_id)
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">الجدول الدراسي</h1>
        <p className="mt-1 text-sm text-text-secondary">
          بناء الجدول الأسبوعي مع كشف التعارضات تلقائياً
        </p>
      </div>
      <SchedulesClient
        initialSchedules={filteredSchedules}
        sections={(sectionsRes.data || []) as never[]}
        venues={venuesRes.data || []}
        semesters={semestersRes.data || []}
        majors={majorsData || []}
        academicLevels={levelsRes.data || []}
        studyPlanCourses={studyPlanRes.data || []}
      />
    </div>
  );
}
