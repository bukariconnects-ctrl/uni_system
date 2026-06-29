import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { AttendanceClient } from "./attendance-client";

export default async function AttendancePage() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const [coursesRes, sessionsRes] = await Promise.all([
    supabase
      .from("course_schedules")
      .select("study_plan_courses!inner(course_id, courses!inner(id, code, name)), semesters!inner(name, status)")
      .eq("instructor_id", profile.id)
      .eq("tenant_id", profile.tenant_id),
    supabase
      .from("attendance_sessions")
      .select("*, courses(code, name)")
      .eq("tenant_id", profile.tenant_id)
      .eq("created_by", profile.id)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(50),
  ]);

  // Deduplicate courses
  const seen = new Set<string>();
  const courses = (coursesRes.data || []).reduce((acc: any[], s: any) => {
    const c = s.study_plan_courses?.courses;
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      acc.push(c);
    }
    return acc;
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إدارة الحضور</h1>
        <p className="mt-1 text-sm text-text-secondary">إنشاء جلسات الحضور وتسجيل حضور الطلاب</p>
      </div>
      <AttendanceClient
        courses={courses}
        sessions={sessionsRes.data || []}
      />
    </div>
  );
}
