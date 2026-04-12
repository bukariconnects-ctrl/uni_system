import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { StudentCircularsClient } from "./circulars-client";

export default async function StudentCircularsPage() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  // Get sections the student is enrolled in
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("section_id, sections(course_id, courses(major_id: study_plan_courses(academic_level_id)))")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const enrolledSectionIds = (enrollments || []).map((e: any) => e.section_id);

  // Fetch circulars that apply to this student
  // Conditions: is_published = true AND (target_type = 'all' OR target_type = 'students' OR (target_type = 'section' AND target_id IN enrolled sections))
  const { data: allCirculars } = await supabase
    .from("circulars")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  // Filter circulars relevant to this student
  // Covers admin circulars (all, students, section) + faculty circulars (students=my students, section=specific section)
  const circulars = (allCirculars || []).filter((c: any) => {
    if (c.target_type === "all" || c.target_type === "students") return true;
    if (c.target_type === "section" && enrolledSectionIds.includes(c.target_id)) return true;
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
