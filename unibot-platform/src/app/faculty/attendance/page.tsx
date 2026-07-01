import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { AttendanceClient } from "./attendance-client";

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
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
  let courses: any[] = [];

  if (spcIds.length > 0) {
    // Fetch study_plan_courses with academic_level, major, and course info
    const { data: spcData } = await supabase
      .from("study_plan_courses")
      .select("id, course_id, academic_level_id")
      .in("id", spcIds);

    const validSpc = spcData || [];

    // Get course ids and academic level ids
    const courseIds = [...new Set(validSpc.map((s: any) => s.course_id).filter(Boolean))];
    const acLevelIds = [...new Set(validSpc.map((s: any) => s.academic_level_id).filter(Boolean))];

    // Fetch courses
    if (courseIds.length > 0) {
      const { data: courseData } = await supabase
        .from("courses")
        .select("id, code, name")
        .in("id", courseIds);
      courses = courseData || [];
    }

    // Fetch academic levels with their majors
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

    // Fetch majors
    const majorLookup: Record<string, any> = {};
    if (majorIds.length > 0) {
      const uniqueMajorIds = [...new Set(majorIds)];
      const { data: majorData } = await supabase
        .from("majors")
        .select("id, name, code")
        .in("id", uniqueMajorIds);
      if (majorData) {
        for (const m of majorData) {
          majorLookup[m.id] = m;
        }
      }
    }

    // Build course groups
    const seen = new Set<string>();
    for (const spc of validSpc) {
      const al = spc.academic_level_id ? acLevelLookup[spc.academic_level_id] : null;
      const major = al?.major_id ? majorLookup[al.major_id] : null;

      const key = `${spc.course_id}-${al?.id || 'none'}`;
      if (!seen.has(key)) {
        seen.add(key);
        courseGroups.push({
          study_plan_course_id: spc.id,
          course_id: spc.course_id,
          academic_level_id: spc.academic_level_id,
          academic_level_name: al?.name || null,
          level_number: al?.level_number || null,
          major_id: al?.major_id || null,
          major_name: major?.name || null,
          major_code: major?.code || null,
        });
      }
    }
  }

  // Fetch sessions for this faculty
  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("id, tenant_id, course_id, major_id, academic_level_id, session_date, start_time, title, is_open, created_by, created_at")
    .eq("tenant_id", profile.tenant_id)
    .eq("created_by", profile.id)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(50);

  // Build course lookup
  const courseLookup: Record<string, { code: string; name: string }> = {};
  for (const c of courses) {
    courseLookup[c.id] = { code: c.code, name: c.name };
  }

  // Enrich sessions with course and group info
  const { data: allLevels } = await supabase
    .from("academic_levels")
    .select("id, name, level_number, major_id");

  const levelLookup: Record<string, any> = {};
  const allMajorIds: string[] = [];
  if (allLevels) {
    for (const l of allLevels) {
      levelLookup[l.id] = l;
      if (l.major_id) allMajorIds.push(l.major_id);
    }
  }

  const { data: allMajors } = await supabase
    .from("majors")
    .select("id, name")
    .in("id", [...new Set(allMajorIds)]);

  const majorNameLookup: Record<string, string> = {};
  if (allMajors) {
    for (const m of allMajors) {
      majorNameLookup[m.id] = m.name;
    }
  }

  const enrichedSessions = (sessions || []).map((s: any) => {
    const al = s.academic_level_id ? levelLookup[s.academic_level_id] : null;
    return {
      ...s,
      courses: s.course_id ? courseLookup[s.course_id] || null : null,
      major_name: s.major_id ? majorNameLookup[s.major_id] || null : null,
      academic_level_name: al?.name || null,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إدارة الحضور</h1>
        <p className="mt-1 text-sm text-text-secondary">إنشاء جلسات الحضور وتسجيل حضور الطلاب</p>
      </div>
      <AttendanceClient
        courses={courses}
        courseGroups={courseGroups}
        sessions={enrichedSessions}
      />
    </div>
  );
}
