import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { FacultyCircularsClient } from "./circulars-client";

export const dynamic = 'force-dynamic';

export default async function FacultyCircularsPage() {
  const { profile } = await requireRole(["faculty"]);
  const supabase = createServiceClient();

  // Fetch course_schedules with study_plan_course -> academic_level -> major info
  const { data: schedules } = await supabase
    .from("course_schedules")
    .select("study_plan_course_id")
    .eq("instructor_id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  const spcIds = [...new Set((schedules || []).map((s: any) => s.study_plan_course_id).filter(Boolean))];

  let courseGroups: any[] = [];
  let taughtCourses: { id: string; label: string }[] = [];

  if (spcIds.length > 0) {
    const { data: spcData } = await supabase
      .from("study_plan_courses")
      .select("id, course_id, academic_level_id")
      .in("id", spcIds);

    const validSpc = spcData || [];
    const courseIds = [...new Set(validSpc.map((s: any) => s.course_id).filter(Boolean))];
    const acLevelIds = [...new Set(validSpc.map((s: any) => s.academic_level_id).filter(Boolean))];

    let courses: any[] = [];
    if (courseIds.length > 0) {
      const { data: courseData } = await supabase
        .from("courses")
        .select("id, code, name")
        .in("id", courseIds);
      courses = courseData || [];
    }

    const acLevelLookup: Record<string, any> = {};
    const majorIds: string[] = [];
    if (acLevelIds.length > 0) {
      const { data: acData } = await supabase
        .from("academic_levels")
        .select("id, name, level_number, major_id")
        .in("id", acLevelIds);
      if (acData) {
        for (const al of acData) {
          acLevelLookup[al.id] = al;
          if (al.major_id) majorIds.push(al.major_id);
        }
      }
    }

    const majorLookup: Record<string, any> = {};
    if (majorIds.length > 0) {
      const { data: majorData } = await supabase
        .from("majors")
        .select("id, name, code")
        .in("id", [...new Set(majorIds)]);
      if (majorData) {
        for (const m of majorData) majorLookup[m.id] = m;
      }
    }

    const courseLookup: Record<string, any> = {};
    for (const c of courses) courseLookup[c.id] = c;

    const seenGroup = new Set<string>();
    for (const spc of validSpc) {
      const al = spc.academic_level_id ? acLevelLookup[spc.academic_level_id] : null;
      const major = al?.major_id ? majorLookup[al.major_id] : null;

      const key = `${spc.course_id}-${al?.id || 'none'}`;
      if (!seenGroup.has(key)) {
        seenGroup.add(key);
        courseGroups.push({
          study_plan_course_id: spc.id,
          course_id: spc.course_id,
          academic_level_id: spc.academic_level_id,
          academic_level_name: al?.name || null,
          level_number: al?.level_number || null,
          major_id: al?.major_id || null,
          major_name: major?.name || null,
        });
      }
    }

    const seenCourse = new Set<string>();
    for (const c of courses) {
      if (!seenCourse.has(c.id)) {
        seenCourse.add(c.id);
        taughtCourses.push({
          id: c.id,
          label: `${c.code} — ${c.name}`,
        });
      }
    }
  }

  // Fetch received circulars
  const { data: allPublished } = await supabase
    .from("circulars")
    .select("*, sender:profiles!circulars_created_by_fkey(first_name, last_name, role)")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_published", true)
    .neq("created_by", profile.id)
    .order("created_at", { ascending: false });

  const taughtCourseIds = taughtCourses.map((c: any) => c.id);

  const receivedCirculars = (allPublished || []).filter((c: any) => {
    if (c.target_type === "all" || c.target_type === "faculty") return true;
    if (c.target_type === "section" && taughtCourseIds.includes(c.target_id)) return true;
    return false;
  });

  // Fetch sent circulars
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
        courseGroups={courseGroups}
      />
    </div>
  );
}
