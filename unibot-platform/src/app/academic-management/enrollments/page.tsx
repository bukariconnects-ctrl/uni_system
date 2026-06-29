import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentsClient } from "./enrollments-client";

export default async function EnrollmentsPage() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  // Fetch department scope
  const { data: amd } = await supabase
    .from("academic_management_departments")
    .select("department_id")
    .eq("profile_id", profile.id)
    .single();

  // Fetch majors scoped to the user's department
  const majorsQuery = supabase
    .from("majors")
    .select("id, name, code, department_id")
    .eq("tenant_id", profile.tenant_id)
    .order("name");
  if (amd?.department_id) majorsQuery.eq("department_id", amd.department_id);
  const { data: majors } = await majorsQuery;
  const majorIds = (majors || []).map((m) => m.id);

  // Fetch related data
  const [semestersRes, studentsRes, levelsRes] = await Promise.all([
    supabase
      .from("semesters")
      .select("id, name, status, semester_type")
      .eq("tenant_id", profile.tenant_id)
      .in("status", ["planning", "registration", "active"])
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, student_profiles(student_number)")
      .eq("tenant_id", profile.tenant_id)
      .eq("role", "student")
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

  // Transform students data to match expected format
  const transformedStudents = (studentsRes.data || []).map((st: any) => ({
    id: st.id,
    first_name: st.first_name,
    last_name: st.last_name,
    student_profiles: Array.isArray(st.student_profiles)
      ? st.student_profiles[0] || null
      : st.student_profiles,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التسجيل الجماعي</h1>
        <p className="mt-1 text-sm text-text-secondary">
          تسجيل الطلاب في المقررات الدراسية — اختر التخصص والمستوى والفصل ثم المادة والطلاب
        </p>
      </div>
      <EnrollmentsClient
        majors={majors || []}
        semesters={semestersRes.data || []}
        academicLevels={levelsRes.data || []}
        students={transformedStudents}
      />
    </div>
  );
}
