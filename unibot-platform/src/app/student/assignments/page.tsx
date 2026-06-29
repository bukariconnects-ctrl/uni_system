import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { StudentAssignmentsClient } from "./assignments-client";

export default async function StudentAssignmentsPage() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const courseIds = (enrollments || []).map((e: any) => e.course_id);

  let assignments: any[] = [];
  let submissions: any[] = [];

  if (courseIds.length > 0) {
    const [aRes, sRes] = await Promise.all([
      supabase
        .from("assignments")
        .select("*, attachment_url, courses(code, name)")
        .in("course_id", courseIds)
        .eq("is_published", true)
        .order("due_date", { ascending: true }),
      supabase
        .from("submissions")
        .select("*")
        .eq("student_id", profile.id)
        .order("submitted_at", { ascending: false }),
    ]);
    assignments = aRes.data || [];
    submissions = sRes.data || [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التكاليف والواجبات</h1>
        <p className="mt-1 text-sm text-text-secondary">عرض التكاليف وتسليم الواجبات</p>
      </div>
      <StudentAssignmentsClient
        assignments={assignments}
        submissions={submissions}
      />
    </div>
  );
}
