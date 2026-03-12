import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { SchedulesClient } from "./schedules-client";

export default async function SchedulesPage() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const [schedulesRes, sectionsRes, venuesRes] = await Promise.all([
    supabase
      .from("schedules")
      .select("*, sections(section_code, courses(code, name), profiles!sections_instructor_id_fkey(first_name, last_name), semesters(name)), venues(name, code)")
      .eq("tenant_id", profile.tenant_id)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("sections")
      .select("id, section_code, course_id, semester_id, instructor_id, courses(code, name), semesters(name, status), profiles!sections_instructor_id_fkey(first_name, last_name)")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase
      .from("venues")
      .select("id, name, code, venue_type, capacity")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">الجدول الدراسي</h1>
        <p className="mt-1 text-sm text-text-secondary">
          بناء الجدول الأسبوعي مع كشف التعارضات تلقائياً
        </p>
      </div>
      <SchedulesClient
        initialSchedules={schedulesRes.data || []}
        sections={sectionsRes.data || []}
        venues={venuesRes.data || []}
      />
    </div>
  );
}
