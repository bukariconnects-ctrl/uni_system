import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { FacultyCircularsClient } from "./circulars-client";

export default async function FacultyCircularsPage() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  // Courses taught by this faculty member
  const { data: taughtSchedules } = await supabase
    .from("course_schedules")
    .select("study_plan_courses!inner(course_id, courses!inner(id, code, name)), semesters!inner(name, status)")
    .eq("instructor_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  const seen = new Set<string>();
  const taughtCourses = (taughtSchedules || []).reduce((acc: any[], s: any) => {
    const c = s.study_plan_courses?.courses;
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      acc.push({
        id: c.id,
        label: `${c.code} — ${c.name}`,
      });
    }
    return acc;
  }, []);

  const taughtCourseIds = taughtCourses.map((c: any) => c.id);

  // Circulars RECEIVED by this faculty (published, from academic management)
  const { data: allPublished } = await supabase
    .from("circulars")
    .select("*, sender:profiles!circulars_created_by_fkey(first_name, last_name, role)")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_published", true)
    .neq("created_by", profile.id)   // not self-created
    .order("created_at", { ascending: false });

  const receivedCirculars = (allPublished || []).filter((c: any) => {
    if (c.target_type === "all" || c.target_type === "faculty") return true;
    if (c.target_type === "section" && taughtCourseIds.includes(c.target_id)) return true;
    return false;
  });

  // Circulars SENT by this faculty (own circulars, any status)
  const { data: sentCirculars } = await supabase
    .from("circulars")
    .select("*, sender:profiles!circulars_created_by_fkey(first_name, last_name, role)")
    .eq("tenant_id", profile.tenant_id)
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">التعاميم</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إنشاء ومتابعة التعاميم الخاصة بشعبك وطلابك
        </p>
      </div>
      <FacultyCircularsClient
        receivedCirculars={receivedCirculars}
        sentCirculars={sentCirculars || []}
        userId={profile.id}
        tenantId={profile.tenant_id!}
        taughtCourses={taughtCourses}
      />
    </div>
  );
}
