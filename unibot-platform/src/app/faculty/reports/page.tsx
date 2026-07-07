import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { FacultyReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

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

  const courseIds = [
    ...new Set((myCourses || []).map((c: any) => c.course_id).filter(Boolean)),
  ] as string[];

  // ── Existing reports data ──
  const [attendanceRoster, dismissedStudents, submissionStats] = courseIds.length > 0
    ? await Promise.all([
        serviceClient
          .from("v_faculty_attendance_roster")
          .select("*")
          .in("course_id", courseIds)
          .eq("tenant_id", tenantId),
        serviceClient
          .from("v_faculty_dismissed_students")
          .select("*")
          .in("course_id", courseIds)
          .eq("tenant_id", tenantId),
        serviceClient
          .from("v_faculty_submission_stats")
          .select("*")
          .in("course_id", courseIds)
          .eq("tenant_id", tenantId),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  // ── 1. Gradebook entries (for Official Gradebook Report) ──
  const { data: gradebookEntries } = courseIds.length > 0
    ? await serviceClient
        .from("gradebook_entries")
        .select(
          "*, profiles!gradebook_entries_student_id_fkey(first_name, last_name, student_profiles(student_number)), courses(code, name), enrollments(letter_grade, final_grade)"
        )
        .in("course_id", courseIds)
        .eq("tenant_id", tenantId)
    : { data: [] };

  // ── 2. Per-student submission details ──
  let submissions: any[] = [];
  let assignments: any[] = [];

  if (courseIds.length > 0) {
    // Fetch assignments for course filter
    const { data: assignData } = await serviceClient
      .from("assignments")
      .select("id, title, max_grade, due_date, course_id, is_published")
      .in("course_id", courseIds)
      .eq("tenant_id", tenantId);

    assignments = assignData || [];

    if (assignments.length > 0) {
      const assignmentIds = assignments.map((a: any) => a.id);

      const { data: subData } = await serviceClient
        .from("submissions")
        .select(
          "*, assignments!inner(id, title, max_grade, due_date, course_id), profiles!student_id(first_name, last_name, student_profiles(student_number))"
        )
        .in("assignment_id", assignmentIds)
        .eq("tenant_id", tenantId);

      submissions = subData || [];
    }

    // Fetch enrolled students per course to identify non-submitters
    const { data: enrollmentsData } = await serviceClient
      .from("enrollments")
      .select("student_id, course_id, profiles!student_id(first_name, last_name, student_profiles(student_number))")
      .in("course_id", courseIds)
      .eq("status", "enrolled");

    // Build submission lookup: assignment_id -> set of student_ids who submitted
    const subLookup: Record<string, Set<string>> = {};
    for (const sub of submissions) {
      if (!subLookup[sub.assignment_id]) subLookup[sub.assignment_id] = new Set();
      subLookup[sub.assignment_id].add(sub.student_id);
    }

    // Enrich submissions with late status
    submissions = submissions.map((s: any) => ({
      ...s,
      is_late: s.submitted_at && s.assignments?.due_date
        ? new Date(s.submitted_at) > new Date(s.assignments.due_date)
        : false,
    }));

    // Store enrolled students for the client to use with non-submitters
    const assignmentEnrolledMap: Record<string, any[]> = {};
    for (const asgn of assignments) {
      const courseEnrollments = (enrollmentsData || []).filter(
        (e: any) => e.course_id === asgn.course_id
      );
      const enrolledStudents = courseEnrollments.map((e: any) => ({
        student_id: e.student_id,
        first_name: e.profiles?.first_name,
        last_name: e.profiles?.last_name,
        student_number: e.profiles?.student_profiles?.[0]?.student_number,
      }));
      assignmentEnrolledMap[asgn.id] = enrolledStudents;
    }

    // Attach enrolled students info to each assignment
    assignments = assignments.map((a: any) => ({
      ...a,
      enrolled_students: assignmentEnrolledMap[a.id] || [],
    }));
  }

  // ── 3. Attendance matrix data (sessions + records) ──
  const { data: sessions } = courseIds.length > 0
    ? await serviceClient
        .from("attendance_sessions")
        .select("id, course_id, session_date, title, start_time")
        .in("course_id", courseIds)
        .eq("tenant_id", tenantId)
        .order("session_date", { ascending: true })
    : { data: [] };

  const sessionList = (sessions || []) as any[];
  const allSessionIds = sessionList.map((s: any) => s.id);

  const { data: records } = allSessionIds.length > 0
    ? await serviceClient
        .from("attendance_records")
        .select("session_id, student_id, status")
        .in("session_id", allSessionIds)
    : { data: [] };

  const recordList = (records || []) as any[];

  // Build matrix: { courseId: { studentId: { sessionId: status } } }
  const attendanceMatrix: Record<string, Record<string, Record<string, string>>> = {};
  for (const rec of recordList) {
    const session = sessionList.find((s: any) => s.id === rec.session_id);
    if (!session) continue;
    const cId = session.course_id;
    if (!attendanceMatrix[cId]) attendanceMatrix[cId] = {};
    if (!attendanceMatrix[cId][rec.student_id]) attendanceMatrix[cId][rec.student_id] = {};
    attendanceMatrix[cId][rec.student_id][rec.session_id] = rec.status;
  }

  // Group sessions by course
  const sessionsByCourse: Record<string, any[]> = {};
  for (const s of sessionList) {
    if (!sessionsByCourse[s.course_id]) sessionsByCourse[s.course_id] = [];
    sessionsByCourse[s.course_id].push(s);
  }

  // ── 4. Attendance summaries for percentages ──
  const { data: attendanceSummaries } = courseIds.length > 0
    ? await serviceClient
        .from("attendance_summaries")
        .select("student_id, course_id, total_sessions, attended_sessions, unexcused_absences, absence_percentage, is_dismissed")
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
          attendanceRoster: (attendanceRoster as any)?.data || [],
          dismissedStudents: (dismissedStudents as any)?.data || [],
          submissionStats: (submissionStats as any)?.data || [],
          gradebookEntries: (gradebookEntries as any) || [],
          submissions,
          assignments,
          sessionsByCourse,
          attendanceMatrix,
          attendanceSummaries: attendanceSummaries || [],
        }}
      />
    </div>
  );
}
