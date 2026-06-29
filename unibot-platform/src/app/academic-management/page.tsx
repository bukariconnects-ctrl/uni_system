import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { AcademicManagementDashboardClient } from "./academic-management-client";

export default async function AcademicManagementDashboard() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data: activeSemester } = await supabase
    .from("semesters")
    .select("id, name")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "active")
    .single();

  const semesterId = activeSemester?.id;

  // Get departments managed by this academic manager
  const { data: managedDepts } = await supabase
    .from("academic_management_departments")
    .select("department_id")
    .eq("profile_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  const deptIds = managedDepts?.map((d) => d.department_id) || [];

  // Get course IDs in managed departments
  let courseIds: string[] = [];
  if (deptIds.length > 0) {
    const { data: courses } = await supabase
      .from("courses")
      .select("id")
      .in("department_id", deptIds)
      .eq("tenant_id", profile.tenant_id);
    courseIds = (courses || []).map((c) => c.id);
  }

  // Fetch courses in managed departments for active semester
  const { data: courseList } =
    semesterId && courseIds.length > 0
      ? await supabase
          .from("courses")
          .select("id, code, name, credit_hours")
          .in("id", courseIds)
          .eq("tenant_id", profile.tenant_id)
      : { data: [] };

  // Fetch enrollments for these courses
  const { data: enrollments } =
    courseIds.length > 0
      ? await supabase
          .from("enrollments")
          .select("id, student_id, course_id, section_id, status")
          .in("course_id", courseIds)
          .eq("status", "enrolled")
      : { data: [] };

  // Build section→course map for backward compat with attendance_summaries
  const enrollmentSectionToCourse: Record<string, string> = {};
  for (const e of (enrollments || [])) {
    if ((e as any).section_id && (e as any).course_id) {
      enrollmentSectionToCourse[(e as any).section_id] = (e as any).course_id;
    }
  }

  // Fetch section IDs from enrollments for backward-compat with attendance_summaries
  const enrolledSectionIds = Object.keys(enrollmentSectionToCourse);

  // Fetch attendance summaries (still uses section_id — backward compat)
  const { data: attendanceSummaries } =
    enrolledSectionIds.length > 0
      ? await supabase
          .from("attendance_summaries")
          .select("student_id, section_id, absence_percentage, attended_sessions, total_sessions, is_dismissed")
          .in("section_id", enrolledSectionIds)
      : { data: [] };

  // Attach course_id to each summary
  const enrichedSummaries = (attendanceSummaries || []).map((s: any) => ({
    ...s,
    course_id: enrollmentSectionToCourse[s.section_id] || null,
  }));

  // Fetch risk zone students
  const studentIds = (enrollments || []).map((e: any) => e.student_id);
  const { data: riskStudents } =
    studentIds.length > 0
      ? await supabase
          .from("student_profiles")
          .select("profile_id, risk_level, risk_score, cumulative_gpa, student_number, profiles(first_name, last_name)")
          .in("profile_id", studentIds)
          .in("risk_level", ["high", "critical"])
      : { data: [] };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">مرحباً، {profile.first_name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {activeSemester ? `الفصل الحالي: ${activeSemester.name}` : "لا يوجد فصل دراسي نشط"}
        </p>
      </div>

      <AcademicManagementDashboardClient
        data={{
          courses: (courseList || []) as any,
          enrollments: (enrollments || []) as any,
          attendanceSummaries: enrichedSummaries as any,
          riskStudents: (riskStudents || []) as any,
        }}
      />
    </div>
  );
}
