"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function submitAttendanceByQr(token: string) {
  const { profile } = await requireRole(["student"]);
  const serviceClient = createServiceClient();

  // Find the session with this QR token
  const { data: session, error: sessionError } = await serviceClient
    .from("attendance_sessions")
    .select("id, course_id, tenant_id, is_open, qr_code, qr_expires_at")
    .eq("qr_code", token)
    .eq("is_open", true)
    .single();

  if (sessionError || !session) {
    throw new Error("رمز QR غير صالح أو منتهي الصلاحية");
  }

  // Check if QR is expired
  if (session.qr_expires_at && new Date(session.qr_expires_at) < new Date()) {
    throw new Error("انتهت صلاحية رمز QR — اطلب من المحاضر تحديثه");
  }

  // Check if student is enrolled in this course
  const { data: enrollment } = await serviceClient
    .from("enrollments")
    .select("id")
    .eq("student_id", profile.id)
    .eq("course_id", session.course_id)
    .eq("status", "enrolled")
    .single();

  if (!enrollment) {
    throw new Error("أنت غير مسجل في هذه المادة");
  }

  // Check if there's already a record for this student + session
  const { data: existing } = await serviceClient
    .from("attendance_records")
    .select("id, status")
    .eq("session_id", session.id)
    .eq("student_id", profile.id)
    .maybeSingle();

  if (existing) {
    // Already present — done
    if (existing.status === "present") {
      return { success: true, message: "تم تسجيل حضورك مسبقاً" };
    }
    // Update to present
    const { error: updateError } = await serviceClient
      .from("attendance_records")
      .update({
        status: "present",
        modified_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error("فشل تسجيل الحضور: " + updateError.message);
    }

    revalidatePath("/student/attendance");
    return { success: true, message: "تم تسجيل حضورك بنجاح ✓" };
  }

  // No record exists — create one (student checked in via QR before faculty pre-created records)
  const { error: insertError } = await serviceClient
    .from("attendance_records")
    .insert({
      tenant_id: session.tenant_id,
      session_id: session.id,
      student_id: profile.id,
      course_id: session.course_id,
      status: "present",
    });

  if (insertError) {
    throw new Error("فشل تسجيل الحضور: " + insertError.message);
  }

  revalidatePath("/student/attendance");
  return { success: true, message: "تم تسجيل حضورك بنجاح ✓" };
}

export async function getOpenSessionsForStudent() {
  const { profile } = await requireRole(["student"]);
  const serviceClient = createServiceClient();

  const { data: enrollments } = await serviceClient
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  if (!enrollments || enrollments.length === 0) {
    return [];
  }

  const courseIds = enrollments.map((e) => e.course_id);

  const { data: sessions } = await serviceClient
    .from("attendance_sessions")
    .select("id, course_id, session_date, start_time, is_open")
    .in("course_id", courseIds)
    .eq("is_open", true)
    .order("session_date", { ascending: false });

  const courseIds2 = [...new Set((sessions || []).map((s: any) => s.course_id).filter(Boolean))];
  const courseMap: Record<string, { code: string; name: string }> = {};
  if (courseIds2.length > 0) {
    const { data: courses } = await serviceClient
      .from("courses")
      .select("id, code, name")
      .in("id", courseIds2);
    if (courses) {
      for (const c of courses) {
        courseMap[c.id] = { code: c.code, name: c.name };
      }
    }
  }

  return (sessions || []).map((s) => ({
    ...s,
    courses: courseMap[s.course_id] || null,
  }));
}

export async function fetchStudentSummaries() {
  const { profile } = await requireRole(["student"]);
  const serviceClient = createServiceClient();

  const { data: enrollments } = await serviceClient
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const courseIds = (enrollments || []).map((e: any) => e.course_id).filter(Boolean);

  if (courseIds.length === 0) {
    return { summaries: [] };
  }

  const { data: summariesData } = await serviceClient
    .from("attendance_summaries")
    .select("*")
    .eq("student_id", profile.id)
    .in("course_id", courseIds);

  const seenEnrollment = new Set<string>();
  const summaries = (summariesData || []).filter((s: any) => {
    if (seenEnrollment.has(s.enrollment_id)) return false;
    seenEnrollment.add(s.enrollment_id);
    return true;
  });

  // Enrich with course name
  const summaryCourseIds = [...new Set(summaries.map((s: any) => s.course_id).filter(Boolean))];
  const summaryCourseLookup: Record<string, { code: string; name: string }> = {};
  if (summaryCourseIds.length > 0) {
    const { data: courseData } = await serviceClient
      .from("courses")
      .select("id, code, name")
      .in("id", summaryCourseIds);
    if (courseData) {
      for (const c of courseData) {
        summaryCourseLookup[c.id] = { code: c.code, name: c.name };
      }
    }
  }

  // Get tenant-level absence_limit_count
  const { data: tenant } = await serviceClient
    .from("tenants")
    .select("absence_limit_count")
    .eq("id", profile.tenant_id)
    .single();

  const defaultLimit = tenant?.absence_limit_count ?? 5;

  // Build college-level absence_limit_count lookup per course
  const collegeLimitMap: Record<string, number> = {};
  if (summaryCourseIds.length > 0) {
    const { data: courseDepts } = await serviceClient
      .from("courses")
      .select("id, departments(college_id)")
      .in("id", summaryCourseIds);

    const collegeIds = [...new Set((courseDepts || []).map((cd: any) => cd.departments?.college_id).filter(Boolean))];
    if (collegeIds.length > 0) {
      const { data: colleges } = await serviceClient
        .from("colleges")
        .select("id, absence_limit_count")
        .in("id", collegeIds);
      if (colleges) {
        const collegeMap: Record<string, number | null> = {};
        for (const c of colleges) {
          collegeMap[c.id] = c.absence_limit_count;
        }
        for (const cd of (courseDepts || [])) {
          const collegeId = (cd as any).departments?.college_id;
          if (collegeId && collegeMap[collegeId] != null) {
            collegeLimitMap[cd.id] = collegeMap[collegeId]!;
          }
        }
      }
    }
  }

  const enrichedSummaries = summaries.map((s: any) => ({
    ...s,
    course_name: s.course_id ? summaryCourseLookup[s.course_id]?.name || null : null,
    absence_limit_count: collegeLimitMap[s.course_id] || defaultLimit,
  }));

  return { summaries: enrichedSummaries };
}

export async function fetchStudentRecords() {
  const { profile } = await requireRole(["student"]);
  const serviceClient = createServiceClient();

  const { data: enrollments } = await serviceClient
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const courseIds = (enrollments || []).map((e: any) => e.course_id).filter(Boolean);

  const { data: records } = await serviceClient
    .from("attendance_records")
    .select("id, session_id, student_id, status, created_at")
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch session details
  const sessionIds = (records || []).map((r: any) => r.session_id).filter(Boolean);
  const sessionLookup: Record<string, any> = {};
  if (sessionIds.length > 0) {
    const { data: sessions } = await serviceClient
      .from("attendance_sessions")
      .select("id, session_date, start_time, course_id, title")
      .in("id", sessionIds);
    if (sessions) {
      for (const s of sessions) {
        sessionLookup[s.id] = s;
      }
    }
  }

  // Build course lookup
  const courseLookup: Record<string, { code: string; name: string }> = {};
  if (courseIds.length > 0) {
    const { data: courseData } = await serviceClient
      .from("courses")
      .select("id, code, name")
      .in("id", courseIds);
    if (courseData) {
      for (const c of courseData) {
        courseLookup[c.id] = { code: c.code, name: c.name };
      }
    }
  }

  const enriched = (records || []).map((r: any) => {
    const session = r.session_id ? sessionLookup[r.session_id] : null;
    return {
      ...r,
      attendance_sessions: {
        ...(session || {}),
        courses: session?.course_id ? courseLookup[session.course_id] || null : null,
      },
    };
  });

  return { records: enriched };
}

export async function debugStudentData() {
  const { profile } = await requireRole(["student"]);
  const sc = createServiceClient();

  const { data: enrollments, error: e1 } = await sc
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  const { data: recs, error: e2 } = await sc
    .from("attendance_records")
    .select("id, session_id, student_id, status, created_at, course_id")
    .eq("student_id", profile.id)
    .limit(10);

  const { data: summaries, error: e3 } = await sc
    .from("attendance_summaries")
    .select("*")
    .eq("student_id", profile.id)
    .limit(10);

  return {
    profile_id: profile.id,
    enrollments: { data: enrollments, error: e1?.message },
    records: { data: recs, error: e2?.message },
    summaries: { data: summaries, error: e3?.message },
  };
}
