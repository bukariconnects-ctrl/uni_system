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

  // Fetch sections in managed departments for active semester
  const { data: sections } =
    semesterId && courseIds.length > 0
      ? await supabase
          .from("sections")
          .select("id, section_code, status, course_id, semester_id, enrolled_count, courses(code, name)")
          .eq("tenant_id", profile.tenant_id)
          .eq("semester_id", semesterId)
          .in("course_id", courseIds)
      : { data: [] };

  const sectionIds = (sections || []).map((s: any) => s.id);

  // Fetch enrollments for these sections
  const { data: enrollments } =
    sectionIds.length > 0
      ? await supabase
          .from("enrollments")
          .select("id, student_id, section_id, status")
          .in("section_id", sectionIds)
          .eq("status", "enrolled")
      : { data: [] };

  // Fetch attendance summaries for these sections
  const { data: attendanceSummaries } =
    sectionIds.length > 0
      ? await supabase
          .from("attendance_summaries")
          .select("student_id, section_id, absence_percentage, attended_sessions, total_sessions, is_dismissed")
          .in("section_id", sectionIds)
      : { data: [] };

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
          sections: (sections || []) as any,
          enrollments: (enrollments || []) as any,
          attendanceSummaries: (attendanceSummaries || []) as any,
          riskStudents: (riskStudents || []) as any,
        }}
      />
    </div>
  );
}
