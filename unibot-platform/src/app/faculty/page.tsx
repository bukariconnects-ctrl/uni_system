import { requireRole } from "@/lib/auth/get-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { FacultyDashboardClient } from "./faculty-client";

export default async function FacultyDashboard() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const [sectionsRes, assignmentsRes] = await Promise.all([
    supabase
      .from("sections")
      .select("id, section_code, status, courses(code, name), semesters(name, status)")
      .eq("tenant_id", profile.tenant_id)
      .eq("instructor_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("created_by", profile.id),
  ]);

  const sections = (sectionsRes.data || []) as any[];
  const sectionIds = sections.map((s) => s.id);

  // Get enrollment counts
  let enrollmentCounts: Record<string, number> = {};
  if (sectionIds.length > 0) {
    const { data: enrollments } = await serviceClient
      .from("enrollments")
      .select("section_id")
      .in("section_id", sectionIds)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "enrolled");

    (enrollments || []).forEach((e: any) => {
      enrollmentCounts[e.section_id] = (enrollmentCounts[e.section_id] || 0) + 1;
    });
  }

  const sectionsWithCount = sections.map((s) => ({
    ...s,
    enrolled_count: enrollmentCounts[s.id] || 0,
  }));

  const totalStudents = sectionsWithCount.reduce(
    (sum, s) => sum + s.enrolled_count,
    0
  );

  // Get pending submissions for faculty's assignments
  const assignmentIds = (assignmentsRes.data || []).map((a: any) => a.id);
  let pendingSubmissions: any[] = [];
  if (assignmentIds.length > 0) {
    const { data: subs } = await serviceClient
      .from("submissions")
      .select(
        "id, assignment_id, student_id, submitted_at, status, grade, assignments(title, max_grade), profiles!submissions_student_id_fkey(first_name, last_name)"
      )
      .in("assignment_id", assignmentIds)
      .neq("status", "graded")
      .order("submitted_at", { ascending: false });
    pendingSubmissions = subs || [];
  }

  // Get attendance sessions for faculty's sections
  let attendanceSessions: any[] = [];
  if (sectionIds.length > 0) {
    const { data: sessions } = await serviceClient
      .from("attendance_sessions")
      .select("id, section_id, session_date, start_time")
      .in("section_id", sectionIds)
      .eq("tenant_id", profile.tenant_id)
      .order("session_date", { ascending: false });
    attendanceSessions = sessions || [];
  }

  const sessionIds = attendanceSessions.map((s: any) => s.id);

  // Get attendance records for those sessions
  let attendanceRecords: any[] = [];
  if (sessionIds.length > 0) {
    const { data: records } = await serviceClient
      .from("attendance_records")
      .select("session_id, section_id, status, created_at")
      .in("session_id", sessionIds)
      .eq("tenant_id", profile.tenant_id);
    attendanceRecords = records || [];
  }

  // Enrich attendance records with session dates
  const sessionMap = new Map(attendanceSessions.map((s: any) => [s.id, s]));
  const enrichedAttendance = attendanceRecords.map((r: any) => ({
    ...r,
    attendance_sessions: sessionMap.get(r.session_id),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">مرحباً، {profile.first_name}</h1>
        <p className="mt-1 text-sm text-text-secondary">لوحة تحكم عضو هيئة التدريس</p>
      </div>

      <FacultyDashboardClient
        data={{
          sections: sectionsWithCount as any,
          totalStudents,
          pendingSubmissions: (pendingSubmissions || []) as any,
          assignmentsCount: (assignmentsRes.data || []).length,
          attendanceRecords: enrichedAttendance as any,
        }}
      />
    </div>
  );
}
