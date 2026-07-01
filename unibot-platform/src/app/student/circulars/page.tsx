import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { StudentCircularsClient } from "./circulars-client";

export const dynamic = 'force-dynamic';

export default async function StudentCircularsPage() {
  const { profile } = await requireRole(["student"]);
  const supabase = createServiceClient();

  // Get courses the student is enrolled in — include major_id and academic_level_id for group matching
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, major_id, academic_level_id")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const enrollmentList = (enrollments || []) as any[];

  // Fetch published circulars
  const { data: allCirculars } = await supabase
    .from("circulars")
    .select("*, sender:profiles!circulars_created_by_fkey(first_name, last_name, role)")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const circulars = (allCirculars || []).filter((c: any) => {
    // Admin/global circulars
    if (c.target_type === "all" || c.target_type === "students") return true;

    // Course-specific circulars
    if (c.target_type === "section" && c.target_id) {
      const matchingEnrollments = enrollmentList.filter((e: any) => {
        if (e.course_id !== c.target_id) return false;
        // If the circular has a group filter, check student matches it
        if (c.major_id && e.major_id !== c.major_id) return false;
        if (c.academic_level_id && e.academic_level_id !== c.academic_level_id) return false;
        return true;
      });
      return matchingEnrollments.length > 0;
    }

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
