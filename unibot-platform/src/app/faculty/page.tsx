import { requireRole } from "@/lib/auth/get-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { FacultyDashboardClient } from "./faculty-client";

export default async function FacultyDashboard() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const [schedulesRes, assignmentsRes] = await Promise.all([
    supabase
      .from("course_schedules")
      .select("study_plan_courses!inner(course_id, courses!inner(id, code, name)), semesters!inner(name, status)")
      .eq("tenant_id", profile.tenant_id)
      .eq("instructor_id", profile.id),
    supabase
      .from("assignments")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("created_by", profile.id),
  ]);

  // Deduplicate courses
  const seen = new Set<string>();
  const courses = ((schedulesRes.data || []) as any[]).reduce((acc: any[], s: any) => {
    const c = s.study_plan_courses?.courses;
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      acc.push({
        ...c,
        semester: s.semesters,
      });
    }
    return acc;
  }, []);

  const courseIds = courses.map((c: any) => c.id);

  // Get enrollment counts
  let enrollmentCounts: Record<string, number> = {};
  if (courseIds.length > 0) {
    const { data: enrollments } = await serviceClient
      .from("enrollments")
      .select("course_id")
      .in("course_id", courseIds)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "enrolled");

    (enrollments || []).forEach((e: any) => {
      enrollmentCounts[e.course_id] = (enrollmentCounts[e.course_id] || 0) + 1;
    });
  }

  const coursesWithCount = courses.map((c: any) => ({
    ...c,
    enrolled_count: enrollmentCounts[c.id] || 0,
  }));

  const totalStudents = coursesWithCount.reduce(
    (sum: number, c: any) => sum + c.enrolled_count,
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

  // Get attendance sessions for faculty's courses
  let attendanceSessions: any[] = [];
  if (courseIds.length > 0) {
    const { data: sessions } = await serviceClient
      .from("attendance_sessions")
      .select("id, course_id, session_date, start_time")
      .in("course_id", courseIds)
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
      .select("session_id, course_id, status, created_at")
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
          courses: coursesWithCount as any,
          totalStudents,
          pendingSubmissions: (pendingSubmissions || []) as any,
          assignmentsCount: (assignmentsRes.data || []).length,
          attendanceRecords: enrichedAttendance as any,
        }}
      />
    </div>
  );
}
