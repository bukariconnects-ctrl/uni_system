import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { StudentCircularsClient } from "./circulars-client";

export default async function StudentCircularsPage() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  // Get courses the student is enrolled in
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const enrolledCourseIds = (enrollments || []).map((e: any) => e.course_id).filter(Boolean);

  // Fetch circulars that apply to this student — include sender profile
  const { data: allCirculars } = await supabase
    .from("circulars")
    .select("*, sender:profiles!circulars_created_by_fkey(first_name, last_name, role)")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  // Filter circulars relevant to this student
  // Covers admin circulars (all, students) + faculty circulars (section = specific course)
  const circulars = (allCirculars || []).filter((c: any) => {
    if (c.target_type === "all" || c.target_type === "students") return true;
    if (c.target_type === "section" && enrolledCourseIds.includes(c.target_id)) return true;
    return false;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التعاميم</h1>
        <p className="mt-1 text-sm text-text-secondary">
          التعاميم والإعلانات الموجهة إليك
        </p>
      </div>
      <StudentCircularsClient circulars={circulars} userId={profile.id} tenantId={profile.tenant_id!} />
    </div>
  );
}
