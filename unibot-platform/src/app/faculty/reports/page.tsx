import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { FacultyReportsClient } from "./reports-client";

export default async function FacultyReportsPage() {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();
  const tenantId = profile.tenant_id!;

  // Get the faculty's courses from the view
  const { data: myCourses } = await serviceClient
    .from("v_faculty_my_courses")
    .select("*")
    .eq("faculty_id", profile.id)
    .eq("tenant_id", tenantId);

  const courseIds = [...new Set((myCourses || []).map((c: any) => c.course_id).filter(Boolean))];

  // Attendance roster for the faculty's courses
  const { data: attendanceRoster } = courseIds.length > 0
    ? await serviceClient
        .from("v_faculty_attendance_roster")
        .select("*")
        .in("course_id", courseIds)
        .eq("tenant_id", tenantId)
    : { data: [] };

  // Dismissed students for the faculty's courses
  const { data: dismissedStudents } = courseIds.length > 0
    ? await serviceClient
        .from("v_faculty_dismissed_students")
        .select("*")
        .in("course_id", courseIds)
        .eq("tenant_id", tenantId)
    : { data: [] };

  // Submission stats for the faculty's courses
  const { data: submissionStats } = courseIds.length > 0
    ? await serviceClient
        .from("v_faculty_submission_stats")
        .select("*")
        .in("course_id", courseIds)
        .eq("tenant_id", tenantId)
    : { data: [] };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">تقارير المحاضر</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إحصائيات الحضور والتكاليف للمقررات التي تدرسها
        </p>
      </div>

      <FacultyReportsClient
        data={{
          myCourses: myCourses || [],
          attendanceRoster: attendanceRoster || [],
          dismissedStudents: dismissedStudents || [],
          submissionStats: submissionStats || [],
        }}
      />
    </div>
  );
}
