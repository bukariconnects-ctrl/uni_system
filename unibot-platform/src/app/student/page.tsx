import { requireRole } from "@/lib/auth/get-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { StudentDashboardClient } from "./student-client";

export default async function StudentDashboard() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const [enrollmentsRes, profileRes] = await Promise.all([
    serviceClient
      .from("enrollments")
      .select("id, status, course_id, courses(code, name), semesters(name, status)")
      .eq("student_id", profile.id)
      .eq("status", "enrolled")
      .order("created_at", { ascending: false }),
    supabase
      .from("student_profiles")
      .select("cumulative_gpa, earned_credit_hours, total_credit_hours")
      .eq("profile_id", profile.id)
      .single(),
  ]);

  const enrollments = (enrollmentsRes.data || []) as any[];
  const studentProfile = profileRes.data;
  const courseIds = enrollments.map((e: any) => e.course_id).filter(Boolean);

  // Fetch upcoming assignments for enrolled courses
  const { data: upcomingAssignments } =
    courseIds.length > 0
      ? await supabase
          .from("assignments")
          .select("id, title, due_date, max_grade, is_published, course_id, courses(code, name)")
          .in("course_id", courseIds)
          .eq("is_published", true)
          .gte("due_date", new Date().toISOString())
          .order("due_date", { ascending: true })
          .limit(10)
      : { data: [] };

  // Fetch submissions with grades
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, assignment_id, grade, status, assignments(title, max_grade)")
    .eq("student_id", profile.id)
    .not("grade", "is", null)
    .order("created_at", { ascending: false })
    .limit(15);

  // Fetch attendance summaries
  const { data: attendanceSummaries } = await supabase
    .from("attendance_summaries")
    .select("attended_sessions, total_sessions, absence_percentage")
    .eq("student_id", profile.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">مرحباً، {profile.first_name} 👋</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <StudentDashboardClient
        data={{
          enrollments: enrollments as any,
          studentProfile,
          upcomingAssignments: (upcomingAssignments || []) as any,
          submissions: (submissions || []) as any,
          attendanceSummaries: (attendanceSummaries || []) as any,
        }}
      />
    </div>
  );
}
