import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { AttendanceClient } from "./attendance-client";

export default async function AttendancePage() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const [sectionsRes, sessionsRes] = await Promise.all([
    supabase
      .from("sections")
      .select("id, section_code, courses(code, name), semesters(name, status)")
      .eq("tenant_id", profile.tenant_id)
      .eq("instructor_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("attendance_sessions")
      .select("*, sections(section_code, courses(code, name))")
      .eq("tenant_id", profile.tenant_id)
      .eq("created_by", profile.id)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(50),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إدارة الحضور</h1>
        <p className="mt-1 text-sm text-text-secondary">إنشاء جلسات الحضور وتسجيل حضور الطلاب</p>
      </div>
      <AttendanceClient
        sections={sectionsRes.data || []}
        sessions={sessionsRes.data || []}
      />
    </div>
  );
}
