import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { StudentAttendanceClient } from "./attendance-client";

export default async function StudentAttendancePage() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  // Fetch enrollments — section_id is kept for backward compat with attendance_summaries
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, section_id, courses!inner(code, name)")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const enrollmentList = (enrollments || []) as any[];
  const courseIds = enrollmentList.map((e: any) => e.course_id).filter(Boolean);

  // Build lookup: course_id → course code
  const courseLookup: Record<string, { code: string; name: string }> = {};
  // Build lookup: section_id → course_id (backward compat)
  const sectionToCourse: Record<string, string> = {};
  for (const e of enrollmentList) {
    const course = Array.isArray(e.courses) ? e.courses[0] : e.courses;
    if (e.course_id && course) {
      courseLookup[e.course_id] = { code: course.code, name: course.name };
    }
    if (e.section_id && e.course_id) {
      sectionToCourse[e.section_id] = e.course_id;
    }
  }

  let summaries: any[] = [];
  let records: any[] = [];

  if (courseIds.length > 0) {
    // Query attendance_summaries — still uses section_id (backward compat)
    const sectionIds = enrollmentList.map((e: any) => e.section_id).filter(Boolean);
    const [sumRes, recRes] = await Promise.all([
      supabase
        .from("attendance_summaries")
        .select("*")
        .eq("student_id", profile.id)
        .in("section_id", sectionIds),
      supabase
        .from("attendance_records")
        .select("*, attendance_sessions!inner(session_date, start_time, course_id, courses!inner(code, name))")
        .eq("student_id", profile.id)
        .in("attendance_sessions.course_id", courseIds)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    summaries = (sumRes.data || []).map((s: any) => ({
      ...s,
      course_id: sectionToCourse[s.section_id] || null,
    }));
    records = recRes.data || [];
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
