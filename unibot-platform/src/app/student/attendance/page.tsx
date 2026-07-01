import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { StudentAttendanceClient } from "./attendance-client";

export const dynamic = 'force-dynamic';

export default async function StudentAttendancePage() {
  const { profile } = await requireRole(["student"]);
  const supabase = createServiceClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const enrollmentList = (enrollments || []) as any[];
  const courseIds = enrollmentList.map((e: any) => e.course_id).filter(Boolean);

  const courseLookup: Record<string, { code: string; name: string }> = {};

  if (courseIds.length > 0) {
    const { data: allCourses } = await supabase
      .from("courses")
      .select("id, code, name")
      .in("id", courseIds);

    if (allCourses) {
      for (const c of allCourses) {
        courseLookup[c.id] = { code: c.code, name: c.name };
      }
    }
  }

  let summaries: any[] = [];
  let records: any[] = [];

  if (courseIds.length > 0) {
    const { data: summariesData } = await supabase
      .from("attendance_summaries")
      .select("*")
      .eq("student_id", profile.id)
      .in("course_id", courseIds);

    const seenEnrollment = new Set<string>();
    summaries = (summariesData || []).filter((s: any) => {
      if (seenEnrollment.has(s.enrollment_id)) return false;
      seenEnrollment.add(s.enrollment_id);
      return true;
    }).map((s: any) => ({
      ...s,
      course_name: s.course_id ? courseLookup[s.course_id]?.name || null : null,
    }));

    const { data: recData } = await supabase
      .from("attendance_records")
      .select("id, session_id, student_id, status, created_at")
      .eq("student_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const sessionIds = (recData || []).map((r: any) => r.session_id).filter(Boolean);
    const sessionLookup: Record<string, any> = {};
    if (sessionIds.length > 0) {
      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id, session_date, start_time, course_id, title")
        .in("id", sessionIds);
      if (sessions) {
        for (const s of sessions) {
          sessionLookup[s.id] = s;
        }
      }
    }

    records = (recData || []).map((r: any) => {
      const session = r.session_id ? sessionLookup[r.session_id] : null;
      return {
        ...r,
        attendance_sessions: {
          ...(session || {}),
          courses: session?.course_id ? courseLookup[session.course_id] || null : null,
        },
      };
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">سجل حضوري</h1>
        <p className="mt-1 text-sm text-text-secondary">متابعة الحضور والغياب في مقرراتك</p>
      </div>
      <StudentAttendanceClient
        enrollments={enrollmentList}
        summaries={summaries}
        records={records}
        studentId={profile.id}
        courseLookup={courseLookup}
      />
    </div>
  );
}
