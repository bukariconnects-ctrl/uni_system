import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentsClient } from "./enrollments-client";

export default async function EnrollmentsPage() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data: amdRow } = await supabase
    .from("academic_management_departments")
    .select("department_id")
    .eq("profile_id", profile.id)
    .single();

  const departmentId = amdRow?.department_id;

  let scopedCourseIds: string[] | null = null;
  if (departmentId) {
    const { data: majorsData } = await supabase
      .from("majors")
      .select("id")
      .eq("department_id", departmentId);
    const majorIds = (majorsData || []).map((m) => m.id);

    if (majorIds.length > 0) {
      const { data: spcData } = await supabase
        .from("study_plan_courses")
        .select("course_id")
        .in("major_id", majorIds);
      scopedCourseIds = [...new Set((spcData || []).map((s) => s.course_id))];
    } else {
      scopedCourseIds = [];
    }
  }

  const sectionsQuery = supabase
    .from("sections")
    .select("id, section_code, max_capacity, enrolled_count, semester_id, course_id, courses(code, name), semesters(name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (scopedCourseIds !== null && scopedCourseIds.length > 0) {
    sectionsQuery.in("course_id", scopedCourseIds);
  } else if (scopedCourseIds !== null && scopedCourseIds.length === 0) {
    sectionsQuery.in("course_id", ["00000000-0000-0000-0000-000000000000"]);
  }

  const [sectionsRes, studentsRes, enrollmentsRes] = await Promise.all([
    sectionsQuery,
    supabase
      .from("profiles")
      .select("id, first_name, last_name, student_profiles(student_number)")
      .eq("tenant_id", profile.tenant_id)
      .eq("role", "student")
      .eq("account_status", "active")
      .order("first_name"),
    supabase
      .from("enrollments")
      .select("id, status, enrolled_at, student_id, section_id, profiles!enrollments_student_id_fkey(first_name, last_name, student_profiles(student_number)), sections(section_code, course_id, courses(code, name)), semesters(name)")
      .eq("tenant_id", profile.tenant_id)
      .order("enrolled_at", { ascending: false })
      .limit(200),
  ]);

  let filteredEnrollments = enrollmentsRes.data || [];
  if (scopedCourseIds !== null) {
    filteredEnrollments = filteredEnrollments.filter((e: any) =>
      e.sections?.course_id && scopedCourseIds.includes(e.sections.course_id)
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التسجيل الجماعي</h1>
        <p className="mt-1 text-sm text-text-secondary">تسجيل الطلاب في الشعب الدراسية بالجملة</p>
      </div>
      <EnrollmentsClient
        sections={sectionsRes.data || []}
        students={studentsRes.data || []}
        enrollments={filteredEnrollments as never[]}
      />
    </div>
  );
}
