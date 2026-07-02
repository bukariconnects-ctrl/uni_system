import { requireRole } from "@/lib/auth/get-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { FacultyDashboardClient } from "./faculty-client";

export default async function FacultyDashboard() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const [schedulesRes, assignmentsRes] = await Promise.all([
    serviceClient
      .from("course_schedules")
      .select("id, day_of_week, start_time, end_time, component_type, venue_id, venues(name, code), semesters!inner(name, status), study_plan_courses!inner(course_id, academic_level_id, courses!inner(id, code, name), academic_levels!inner(level_number, name, majors!inner(name)))")
      .eq("tenant_id", profile.tenant_id)
      .eq("instructor_id", profile.id)
      .eq("status", "published"),
    supabase
      .from("assignments")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("created_by", profile.id),
  ]);

  const rawSchedules = (schedulesRes.data || []) as any[];

  // Deduplicate courses from schedules
  const seen = new Set<string>();
  const courses = rawSchedules.reduce((acc: any[], s: any) => {
    const c = s.study_plan_courses?.courses;
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      acc.push({
        ...c,
        semester: s.semesters,
      });
    }
    return acc;
  }, []);

  const courseIds = courses.map((c: any) => c.id);

  // Get enrollment counts
  let enrollmentCounts: Record<string, number> = {};
  if (courseIds.length > 0) {
    const { data: enrollments } = await serviceClient
      .from("enrollments")
      .select("course_id")
      .in("course_id", courseIds)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "enrolled");

    (enrollments || []).forEach((e: any) => {
      enrollmentCounts[e.course_id] = (enrollmentCounts[e.course_id] || 0) + 1;
    });
  }

  const coursesWithCount = courses.map((c: any) => ({
    ...c,
    enrolled_count: enrollmentCounts[c.id] || 0,
  }));

  const totalStudents = coursesWithCount.reduce(
    (sum: number, c: any) => sum + c.enrolled_count,
    0
  );

  // Get pending submissions for faculty's assignments
  const assignmentIds = (assignmentsRes.data || []).map((a: any) => a.id);
  let pendingSubmissions: any[] = [];
  if (assignmentIds.length > 0) {
    const { data: subs } = await serviceClient
      .from("submissions")
      .select(
        "id, assignment_id, student_id, submitted_at, status, grade, assignments(title, max_grade), profiles!submissions_student_id_fkey(first_name, last_name)"
      )
      .in("assignment_id", assignmentIds)
      .neq("status", "graded")
      .order("submitted_at", { ascending: false });
    pendingSubmissions = subs || [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">مرحباً، {profile.first_name}</h1>
        <p className="mt-1 text-sm text-text-secondary">لوحة تحكم عضو هيئة التدريس</p>
      </div>

      <FacultyDashboardClient
        data={{
          courses: coursesWithCount as any,
          totalStudents,
          pendingSubmissions: (pendingSubmissions || []) as any,
          assignmentsCount: (assignmentsRes.data || []).length,
          schedules: rawSchedules as any,
        }}
      />
    </div>
  );
}
