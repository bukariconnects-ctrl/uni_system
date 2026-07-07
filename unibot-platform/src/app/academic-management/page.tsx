import { requireRole } from "@/lib/auth/get-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AcademicManagementDashboardClient } from "./academic-management-client";

export default async function AcademicManagementDashboard() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data: activeSemester } = await supabase
    .from("semesters")
    .select("id, name")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "active")
    .single();

  const semesterId = activeSemester?.id;

  // Get departments managed by this academic manager
  const { data: managedDepts } = await supabase
    .from("academic_management_departments")
    .select("department_id")
    .eq("profile_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  const deptIds = managedDepts?.map((d) => d.department_id) || [];

  // Get course IDs in managed departments
  let courseIds: string[] = [];
  if (deptIds.length > 0) {
    const { data: courses } = await supabase
      .from("courses")
      .select("id")
      .in("department_id", deptIds)
      .eq("tenant_id", profile.tenant_id);
    courseIds = (courses || []).map((c) => c.id);
  }

  // Fetch courses in managed departments for active semester
  const { data: courseList } =
    semesterId && courseIds.length > 0
      ? await supabase
          .from("courses")
          .select("id, code, name, credit_hours")
          .in("id", courseIds)
          .eq("tenant_id", profile.tenant_id)
      : { data: [] };

  // Fetch enrollments for these courses
  const { data: enrollments } =
    courseIds.length > 0
      ? await supabase
          .from("enrollments")
          .select("id, student_id, course_id, section_id, status")
          .in("course_id", courseIds)
          .eq("status", "enrolled")
      : { data: [] };

  // Build section→course map for backward compat with attendance_summaries
  const enrollmentSectionToCourse: Record<string, string> = {};
  for (const e of (enrollments || [])) {
    if ((e as any).section_id && (e as any).course_id) {
      enrollmentSectionToCourse[(e as any).section_id] = (e as any).course_id;
    }
  }

  // Fetch section IDs from enrollments for backward-compat with attendance_summaries
  const enrolledSectionIds = Object.keys(enrollmentSectionToCourse);

  // Fetch attendance summaries — try via section_id first, then course_id fallback
  let attendanceSummaries: any[] = [];

  if (enrolledSectionIds.length > 0) {
    const { data: sectionData } = await supabase
      .from("attendance_summaries")
      .select("student_id, section_id, course_id, attended_sessions, total_sessions, unexcused_absences, is_dismissed")
      .in("section_id", enrolledSectionIds);
    attendanceSummaries = sectionData || [];
  }

  // If no results from section_id join, try using course_id directly
  if (attendanceSummaries.length === 0 && courseIds.length > 0) {
    const { data: courseData } = await supabase
      .from("attendance_summaries")
      .select("student_id, section_id, course_id, attended_sessions, total_sessions, unexcused_absences, is_dismissed")
      .in("course_id", courseIds);
    attendanceSummaries = courseData || [];
  }

  // Attach course_id to each summary
  const enrichedSummaries = (attendanceSummaries || []).map((s: any) => ({
    ...s,
    course_id: s.course_id || enrollmentSectionToCourse[s.section_id] || null,
  }));

  // Resolve absence_limit_count per course (college → tenant fallback)
  const courseLimitCache: Record<string, number> = {};
  for (const cid of courseIds) {
    if (courseLimitCache[cid] != null) continue;
    // Try college-level first
    const { data: cd } = await supabase
      .from("courses")
      .select("departments!inner(college_id)")
      .eq("id", cid)
      .single();
    const collegeId = (cd as any)?.departments?.college_id;
    if (collegeId) {
      const { data: coll } = await supabase
        .from("colleges")
        .select("absence_limit_count")
        .eq("id", collegeId)
        .single();
      if (coll?.absence_limit_count != null) {
        courseLimitCache[cid] = coll.absence_limit_count;
        continue;
      }
    }
    // Fall back to tenant
    const { data: tn } = await supabase
      .from("tenants")
      .select("absence_limit_count")
      .eq("id", profile.tenant_id)
      .single();
    courseLimitCache[cid] = tn?.absence_limit_count ?? 5;
  }

  // ── Risk Students ──────────────────────────────────────────
  // Priority: 1) student_risk_scores  2) student_profiles  3) v_academic_risk_students
  const studentIds = (enrollments || []).map((e: any) => e.student_id);
  let riskStudents: any[] = [];

  if (studentIds.length > 0 && courseIds.length > 0) {
    // 1. Try computed student_risk_scores first
    const query = supabase
      .from("student_risk_scores")
      .select("student_id, risk_level, risk_score, course_id, profiles!student_risk_scores_student_id_fkey(first_name, last_name)")
      .in("risk_level", ["high", "critical"])
      .in("course_id", courseIds);

    if (semesterId) {
      query.eq("semester_id", semesterId);
    }

    const { data: riskData } = await query;
    riskStudents = (riskData || []).map((r: any) => ({
      profile_id: r.student_id,
      risk_level: r.risk_level,
      risk_score: r.risk_score,
      cumulative_gpa: null,
      student_number: "",
      profiles: r.profiles ? [r.profiles] : [],
    }));
  }

  // 2. Fallback to student_profiles
  if (riskStudents.length === 0 && studentIds.length > 0) {
    const { data: profileData } = await supabase
      .from("student_profiles")
      .select("profile_id, risk_level, risk_score, cumulative_gpa, student_number, profiles(first_name, last_name)")
      .in("profile_id", studentIds)
      .in("risk_level", ["high", "critical"]);
    riskStudents = (profileData || []) as any[];
  }

  // 3. Fallback to real-time v_academic_risk_students view
  if (riskStudents.length === 0 && courseIds.length > 0) {
    const serviceClient = createServiceClient();
    const { data: viewData } = await serviceClient
      .from("v_academic_risk_students")
      .select("student_id, first_name, last_name, course_id, course_code, course_name, risk_status, absence_percentage, is_dismissed")
      .eq("tenant_id", profile.tenant_id)
      .in("course_id", courseIds)
      .in("risk_status", ["at_risk", "dismissed"])
      .order("absence_percentage", { ascending: false });

    riskStudents = (viewData || []).map((r: any) => ({
      profile_id: r.student_id,
      risk_level: r.is_dismissed ? "critical" : "high",
      risk_score: Math.min(Math.round(r.absence_percentage || 0), 100),
      cumulative_gpa: null,
      student_number: "",
      profiles: [{ first_name: r.first_name, last_name: r.last_name }],
    }));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">مرحباً، {profile.first_name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {activeSemester ? `الفصل الحالي: ${activeSemester.name}` : "لا يوجد فصل دراسي نشط"}
        </p>
      </div>

      <AcademicManagementDashboardClient
        data={{
          courses: (courseList || []) as any,
          enrollments: (enrollments || []) as any,
          attendanceSummaries: enrichedSummaries as any,
          riskStudents: riskStudents as any,
          courseLimitCache,
        }}
      />
    </div>
  );
}
