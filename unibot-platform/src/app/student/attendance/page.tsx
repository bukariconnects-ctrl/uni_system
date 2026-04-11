import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { StudentAttendanceClient } from "./attendance-client";

export default async function StudentAttendancePage() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("section_id, sections(section_code, courses(code, name))")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const sectionIds = (enrollments || []).map((e: any) => e.section_id);

  let summaries: any[] = [];
  let records: any[] = [];

  if (sectionIds.length > 0) {
    const [sumRes, recRes] = await Promise.all([
      supabase
        .from("attendance_summaries")
        .select("*, sections(section_code, courses(code, name))")
        .eq("student_id", profile.id)
        .in("section_id", sectionIds),
      supabase
        .from("attendance_records")
        .select("*, attendance_sessions(session_date, start_time, sections(section_code, courses(code, name)))")
        .eq("student_id", profile.id)
        .in("section_id", sectionIds)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    summaries = sumRes.data || [];
    records = recRes.data || [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">سجل حضوري</h1>
        <p className="mt-1 text-sm text-text-secondary">متابعة الحضور والغياب في مقرراتك</p>
      </div>
      <StudentAttendanceClient
        enrollments={enrollments || []}
        summaries={summaries}
        records={records}
        studentId={profile.id}
      />
    </div>
  );
}
