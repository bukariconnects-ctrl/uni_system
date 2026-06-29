import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      !["academic_management", "tenant_admin", "super_admin"].includes(
        profile.role
      )
    ) {
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    }

    const adminClient = await createAdminClient();

    const body = await request.json();
    const { tenant_id, semester_id } = body;

    if (!tenant_id || !semester_id) {
      return NextResponse.json(
        { error: "tenant_id و semester_id مطلوبان" },
        { status: 400 }
      );
    }

    if (profile.role !== "super_admin" && profile.tenant_id !== tenant_id) {
      return NextResponse.json(
        { error: "لا يمكنك الوصول لبيانات مستأجر آخر" },
        { status: 403 }
      );
    }

    // Get enrollments by tenant + semester directly (no sections join needed)
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("id, student_id, course_id, tenant_id")
      .eq("tenant_id", tenant_id)
      .eq("semester_id", semester_id)
      .eq("status", "enrolled");

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ computed: 0 });
    }

    const studentCoursePairs = enrollments.map((e) => ({
      student_id: e.student_id,
      course_id: e.course_id,
      tenant_id: e.tenant_id,
    }));

    const studentIds = [...new Set(studentCoursePairs.map((p) => p.student_id))];
    const courseIds = [...new Set(studentCoursePairs.map((p) => p.course_id))];

    // For attendance: we still use section_id from enrollment to join with attendance_summaries (backward compat)
    const { data: allEnrollmentsForAtt } = await adminClient
      .from("enrollments")
      .select("id, student_id, course_id, section_id")
      .in("student_id", studentIds)
      .in("course_id", courseIds)
      .eq("status", "enrolled");

    const sectionIdsForSummaries = [
      ...new Set(
        (allEnrollmentsForAtt || [])
          .map((e: any) => e.section_id)
          .filter(Boolean)
      ),
    ];

    // Gradebook entries by course_id (table has course_id since migration 3)
    const { data: grades } = await adminClient
      .from("gradebook_entries")
      .select("student_id, course_id, total_grade")
      .in("student_id", studentIds)
      .in("course_id", courseIds);

    // Assignments by course_id (table has course_id since migration 3)
    const { data: allAssignments } = await adminClient
      .from("assignments")
      .select("id, course_id")
      .in("course_id", courseIds);

    // Submissions
    const { data: submissions } = await adminClient
      .from("submissions")
      .select("student_id, assignment_id")
      .in(
        "assignment_id",
        (allAssignments || []).map((a) => a.id)
      );

    // Attendance summaries by section_id (backward compat — no course_id column)
    const { data: summaries } = await adminClient
      .from("attendance_summaries")
      .select("student_id, section_id, absence_percentage")
      .in("student_id", studentIds)
      .in("section_id", sectionIdsForSummaries);

    // Build a lookup from enrollment (student_id + course_id) to section_id for attendance
    const enrollmentToSection = new Map<string, string>();
    (allEnrollmentsForAtt || []).forEach((e: any) => {
      if (e.section_id) {
        enrollmentToSection.set(`${e.student_id}-${e.course_id}`, e.section_id);
      }
    });

    const summaryMap = new Map<string, number>();
    (summaries || []).forEach((s) => {
      summaryMap.set(`${s.student_id}-${s.section_id}`, Number(s.absence_percentage));
    });

    const gradeMap = new Map<string, number>();
    (grades || []).forEach((g) => {
      gradeMap.set(`${g.student_id}-${g.course_id}`, Number(g.total_grade));
    });

    const assignmentsByCourse = new Map<string, string[]>();
    (allAssignments || []).forEach((a) => {
      const list = assignmentsByCourse.get(a.course_id) || [];
      list.push(a.id);
      assignmentsByCourse.set(a.course_id, list);
    });

    const submissionsByStudent = new Map<string, Set<string>>();
    (submissions || []).forEach((s) => {
      const set = submissionsByStudent.get(s.student_id) || new Set();
      set.add(s.assignment_id);
      submissionsByStudent.set(s.student_id, set);
    });

    const riskScores: {
      tenant_id: string;
      student_id: string;
      course_id: string;
      semester_id: string;
      risk_level: string;
      risk_score: number;
      absence_factor: number;
      grade_factor: number;
      engagement_factor: number;
      alert_sent: boolean;
      computed_at: string;
    }[] = [];

    for (const pair of studentCoursePairs) {
      const key = `${pair.student_id}-${pair.course_id}`;

      // Look up section_id for this enrollment to get attendance
      const sectionIdForAtt = enrollmentToSection.get(key);

      // Absence factor: use attendance_summaries via section_id (backward compat)
      let absenceFactor = 0;
      if (sectionIdForAtt) {
        const absencePct = summaryMap.get(`${pair.student_id}-${sectionIdForAtt}`) || 0;
        absenceFactor = Math.min(absencePct, 100);
      }

      // Grade factor
      const totalGrade = gradeMap.get(key);
      let gradeFactor = 0;
      if (totalGrade !== undefined && totalGrade !== null) {
        gradeFactor = Math.max(0, ((60 - totalGrade) / 60) * 100);
      }

      // Engagement factor
      const courseAssignments = assignmentsByCourse.get(pair.course_id) || [];
      const studentSubs = submissionsByStudent.get(pair.student_id) || new Set();
      let engagementFactor = 0;
      if (courseAssignments.length > 0) {
        const submitted = courseAssignments.filter((aId) =>
          studentSubs.has(aId)
        ).length;
        engagementFactor = (1 - submitted / courseAssignments.length) * 100;
      }

      const riskScore =
        absenceFactor * 0.4 + gradeFactor * 0.4 + engagementFactor * 0.2;

      let riskLevel: string;
      if (riskScore >= 75) riskLevel = "critical";
      else if (riskScore >= 50) riskLevel = "high";
      else if (riskScore >= 25) riskLevel = "medium";
      else riskLevel = "low";

      riskScores.push({
        tenant_id: pair.tenant_id,
        student_id: pair.student_id,
        course_id: pair.course_id,
        semester_id,
        risk_level: riskLevel,
        risk_score: Math.round(riskScore * 100) / 100,
        absence_factor: Math.round(absenceFactor * 100) / 100,
        grade_factor: Math.round(gradeFactor * 100) / 100,
        engagement_factor: Math.round(engagementFactor * 100) / 100,
        alert_sent: false,
        computed_at: new Date().toISOString(),
      });
    }

    // Batch upsert student_risk_scores
    const batchSize = 50;
    for (let i = 0; i < riskScores.length; i += batchSize) {
      const batch = riskScores.slice(i, i + batchSize);
      await adminClient.from("student_risk_scores").upsert(batch, {
        onConflict: "student_id,course_id,semester_id",
      });
    }

    // Aggregate by course for course-level flags
    const courseRiskMap = new Map<
      string,
      { scores: number[]; highCount: number; total: number; failCount: number }
    >();

    riskScores.forEach((rs) => {
      const existing = courseRiskMap.get(rs.course_id) || {
        scores: [],
        highCount: 0,
        total: 0,
        failCount: 0,
      };
      existing.scores.push(rs.risk_score);
      existing.total++;
      if (rs.risk_level === "high" || rs.risk_level === "critical") {
        existing.highCount++;
      }
      const grade = gradeMap.get(`${rs.student_id}-${rs.course_id}`);
      if (grade !== undefined && grade < 60) {
        existing.failCount++;
      }
      courseRiskMap.set(rs.course_id, existing);
    });

    const courseFlags: {
      tenant_id: string;
      course_id: string;
      semester_id: string;
      avg_risk_score: number;
      high_risk_count: number;
      failure_rate_pct: number;
      engagement_drop: boolean;
      flagged: boolean;
      alert_sent: boolean;
      computed_at: string;
    }[] = [];

    courseRiskMap.forEach((data, courseId) => {
      const avg =
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      const failureRate =
        data.total > 0 ? (data.failCount / data.total) * 100 : 0;
      const flagged =
        failureRate >= 30 || data.highCount / data.total >= 0.3;

      courseFlags.push({
        tenant_id: tenant_id,
        course_id: courseId,
        semester_id,
        avg_risk_score: Math.round(avg * 100) / 100,
        high_risk_count: data.highCount,
        failure_rate_pct: Math.round(failureRate * 100) / 100,
        engagement_drop: false,
        flagged,
        alert_sent: false,
        computed_at: new Date().toISOString(),
      });
    });

    if (courseFlags.length > 0) {
      await adminClient.from("course_risk_flags").upsert(courseFlags, {
        onConflict: "course_id,semester_id",
      });
    }

    return NextResponse.json({
      computed: riskScores.length,
      course_flags: courseFlags.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
