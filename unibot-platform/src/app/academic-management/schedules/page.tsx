import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { SchedulesClient } from "./schedules-client";

export default async function SchedulesPage() {
  const { profile } = await requireRole(["academic_management", "head_of_department"]);
  const supabase = await createClient();

  // Fetch majors scoped to user's department
  const { data: amd } = await supabase
    .from("academic_management_departments")
    .select("department_id")
    .eq("profile_id", profile.id)
    .single();

  const majorsQuery = supabase
    .from("majors")
    .select("id, name, code, department_id")
    .eq("tenant_id", profile.tenant_id)
    .order("name");
  if (amd?.department_id) majorsQuery.eq("department_id", amd.department_id);

  const { data: majors } = await majorsQuery;
  const majorIds = (majors || []).map((m) => m.id);

  // Fetch related data
  const [semestersRes, venuesRes, facultyRes, levelsRes] = await Promise.all([
    supabase
      .from("semesters")
      .select("id, name, status, semester_type")
      .eq("tenant_id", profile.tenant_id)
      .in("status", ["planning", "registration", "active"])
      .order("created_at", { ascending: false }),
    supabase
      .from("venues")
      .select("id, name, code, venue_type, capacity")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("tenant_id", profile.tenant_id)
      .in("role", ["faculty", "lecturer"])
      .eq("account_status", "active")
      .order("first_name"),
    majorIds.length > 0
      ? supabase
          .from("academic_levels")
          .select("id, name, level_number, major_id")
          .eq("tenant_id", profile.tenant_id)
          .in("major_id", majorIds)
          .order("level_number")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">الجدول الدراسي</h1>
        <p className="mt-1 text-sm text-text-secondary">
          بناء الجدول الأسبوعي — يختار المستخدم التخصص والمستوى والفصل، ثم يحدد لكل مادة المحاضرة (نظري) والمعمل (عملي) مع كشف التعارضات تلقائياً
        </p>
      </div>
      <SchedulesClient
        majors={majors || []}
        semesters={semestersRes.data || []}
        venues={venuesRes.data || []}
        faculty={facultyRes.data || []}
        academicLevels={levelsRes.data || []}
      />
    </div>
  );
}
