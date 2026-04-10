import { requireRole } from "@/lib/auth/get-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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
      // Get academic_level_ids for these majors
      const { data: levelsData } = await supabase
        .from("academic_levels")
        .select("id")
        .in("major_id", majorIds);
      const levelIds = (levelsData || []).map((l) => l.id);

      if (levelIds.length > 0) {
        const { data: spcData } = await supabase
          .from("study_plan_courses")
          .select("course_id")
          .in("academic_level_id", levelIds);
        scopedCourseIds = [...new Set((spcData || []).map((s) => s.course_id))];
      }
    }
    
    // Fallback: if no courses from study_plan, get courses from the department directly
    if (!scopedCourseIds || scopedCourseIds.length === 0) {
      const { data: deptCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("department_id", departmentId)
        .eq("is_active", true);
      scopedCourseIds = (deptCourses || []).map((c) => c.id);
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
  }
  // If scopedCourseIds is null or empty, show all tenant sections (fallback)

  const serviceClient = createServiceClient();
  
  const [sectionsRes, studentsRes, enrollmentsRes] = await Promise.all([
    sectionsQuery,
    supabase
      .from("profiles")
      .select("id, first_name, last_name, student_profiles(student_number)")
      .eq("tenant_id", profile.tenant_id)
      .eq("role", "student")
      .eq("account_status", "active")
      .order("first_name"),
    serviceClient
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

  // Get actual enrollment counts using service client
  const sectionIds = (sectionsRes.data || []).map((s: any) => s.id);
  let enrollmentCounts: Record<string, number> = {};
  
  if (sectionIds.length > 0) {
    const { data: enrollments } = await serviceClient
      .from("enrollments")
      .select("section_id")
      .in("section_id", sectionIds)
      .eq("status", "enrolled");
    
    (enrollments || []).forEach((e: any) => {
      enrollmentCounts[e.section_id] = (enrollmentCounts[e.section_id] || 0) + 1;
    });
  }

  // Transform sections data to match SectionOption interface
  const transformedSections = (sectionsRes.data || []).map((s: any) => ({
    id: s.id,
    section_code: s.section_code,
    max_capacity: s.max_capacity,
    enrolled_count: enrollmentCounts[s.id] || 0,
    semester_id: s.semester_id,
    courses: Array.isArray(s.courses) ? s.courses[0] || null : s.courses,
    semesters: Array.isArray(s.semesters) ? s.semesters[0] || null : s.semesters,
  }));

  // Transform students data to match StudentOption interface
  const transformedStudents = (studentsRes.data || []).map((st: any) => ({
    id: st.id,
    first_name: st.first_name,
    last_name: st.last_name,
    student_profiles: Array.isArray(st.student_profiles) ? st.student_profiles[0] || null : st.student_profiles,
  }));

  // Transform enrollments data to match EnrollmentRow interface
  const transformedEnrollments = filteredEnrollments.map((e: any) => ({
    id: e.id,
    status: e.status,
    enrolled_at: e.enrolled_at,
    student_id: e.student_id,
    profiles: Array.isArray(e.profiles) ? e.profiles[0] || null : e.profiles,
    sections: Array.isArray(e.sections) ? e.sections[0] || null : e.sections,
    semesters: Array.isArray(e.semesters) ? e.semesters[0] || null : e.semesters,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التسجيل الجماعي</h1>
        <p className="mt-1 text-sm text-text-secondary">تسجيل الطلاب في الشعب الدراسية بالجملة</p>
      </div>
      <EnrollmentsClient
        sections={transformedSections}
        students={transformedStudents}
        enrollments={transformedEnrollments}
      />
    </div>
  );
}
