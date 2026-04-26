import { requireRole } from "@/lib/auth/get-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { SectionsClient } from "./sections-client";

export default async function SectionsPage() {
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

  const coursesQuery = supabase
    .from("courses")
    .select("id, code, name")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("code");
  if (scopedCourseIds !== null && scopedCourseIds.length > 0) {
    coursesQuery.in("id", scopedCourseIds);
  } else if (scopedCourseIds !== null && scopedCourseIds.length === 0) {
    // No department assigned or no courses - show all tenant courses
    // This is a fallback for academic_management without department restriction
  }

  const sectionsQuery = supabase
    .from("sections")
    .select("id, section_code, status, max_capacity, enrolled_count, instructor_id, course_id, semester_id, merged_into_id, section_type, parent_section_id, courses(code, name, credit_hours), semesters(name, status), profiles!sections_instructor_id_fkey(first_name, last_name)")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });
  if (scopedCourseIds !== null && scopedCourseIds.length > 0) {
    sectionsQuery.in("course_id", scopedCourseIds);
  }
  // If scopedCourseIds is null or empty, show all tenant sections (fallback)

  const [sectionsRes, coursesRes, semestersRes, facultyRes] = await Promise.all([
    sectionsQuery,
    coursesQuery,
    supabase
      .from("semesters")
      .select("id, name, status")
      .eq("tenant_id", profile.tenant_id)
      .in("status", ["planning", "registration", "active"])
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("tenant_id", profile.tenant_id)
      .in("role", ["faculty", "academic_management"])
      .eq("account_status", "active")
      .order("first_name"),
  ]);

  // Get actual enrollment counts using service client
  const serviceClient = createServiceClient();
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
  
  // Update sections with actual enrollment counts
  const sectionsWithCount = (sectionsRes.data || []).map((s: any) => ({
    ...s,
    enrolled_count: enrollmentCounts[s.id] || 0
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إدارة الشعب</h1>
        <p className="mt-1 text-sm text-text-secondary">فتح وإغلاق ودمج الشعب الدراسية وتعيين المحاضرين</p>
      </div>
      <SectionsClient
        initialSections={sectionsWithCount}
        courses={coursesRes.data || []}
        semesters={semestersRes.data || []}
        faculty={facultyRes.data || []}
      />
    </div>
  );
}
