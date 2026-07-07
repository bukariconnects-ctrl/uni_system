import { requireRole } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/server";
import { StudentReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function StudentReportsPage() {
  const { profile } = await requireRole(["student"]);
  const supabase = createServiceClient();
  const tenantId = profile.tenant_id!;

  // ── 1. Transcript: published gradebook entries ──
  const { data: entries } = await supabase
    .from("gradebook_entries")
    .select(
      "*, courses!inner(code, name, credit_hours), enrollments!inner(semester_id, final_grade, letter_grade)"
    )
    .eq("student_id", profile.id)
    .eq("is_published", true);

  const gradeEntries = (entries || []) as any[];

  // Collect all semester IDs
  const semesterIds = [
    ...new Set(gradeEntries.map((e: any) => e.enrollments?.semester_id).filter(Boolean)),
  ] as string[];

  // Fetch semesters
  const { data: semesters } = await supabase
    .from("semesters")
    .select("id, name, academic_year, start_date, end_date, status")
    .in("id", semesterIds)
    .order("start_date", { ascending: true });

  const semesterList = (semesters || []) as any[];

  // ── 2. Attendance summaries ──
  const { data: summaries } = await supabase
    .from("attendance_summaries")
    .select(
      "*, courses(code, name, credit_hours), enrollments!inner(semester_id)"
    )
    .eq("student_id", profile.id);

  const attendanceSummaries = (summaries || []) as any[];

  // Fetch tenant absence limit
  const { data: tenant } = await supabase
    .from("tenants")
    .select("absence_limit_count")
    .eq("id", tenantId)
    .single();

  const absenceLimit = tenant?.absence_limit_count ?? 5;

  // Fetch college limits for each course
  const allCourseIds = [
    ...new Set([
      ...gradeEntries.map((e: any) => e.course_id),
      ...attendanceSummaries.map((s: any) => s.course_id),
    ].filter(Boolean)),
  ] as string[];

  const collegeLimitMap: Record<string, number> = {};
  if (allCourseIds.length > 0) {
    const { data: courseDepts } = await supabase
      .from("courses")
      .select("id, departments!inner(college_id)")
      .in("id", allCourseIds);

    const collegeIds = [
      ...new Set(
        (courseDepts || []).map((cd: any) => cd.departments?.college_id).filter(Boolean)
      ),
    ] as string[];

    if (collegeIds.length > 0) {
      const { data: colleges } = await supabase
        .from("colleges")
        .select("id, absence_limit_count")
        .in("id", collegeIds);

      if (colleges) {
        const collegeMap: Record<string, number | null> = {};
        for (const c of colleges) collegeMap[c.id] = c.absence_limit_count;
        for (const cd of courseDepts || []) {
          const cId = (cd as any).departments?.college_id;
          if (cId && collegeMap[cId] != null) collegeLimitMap[cd.id] = collegeMap[cId]!;
        }
      }
    }
  }

  // Enrich attendance summaries with limit and semester
  const enrichedSummaries = attendanceSummaries.map((s: any) => ({
    ...s,
    course_name: s.courses?.name || null,
    course_code: s.courses?.code || null,
    credit_hours: s.courses?.credit_hours || 0,
    semester_id: s.enrollments?.semester_id || null,
    absence_limit_count: collegeLimitMap[s.course_id] ?? absenceLimit,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">تقاريري</h1>
        <p className="mt-1 text-sm text-text-secondary">
          السجل الأكاديمي وملخص الحضور
        </p>
      </div>

      <StudentReportsClient
        entries={gradeEntries}
        semesters={semesterList}
        attendanceSummaries={enrichedSummaries}
      />
    </div>
  );
}
