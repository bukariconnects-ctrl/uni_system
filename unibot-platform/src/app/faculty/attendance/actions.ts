"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function getAttendanceSessions(courseId?: string) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  let query = serviceClient
    .from("attendance_sessions")
    .select("id, tenant_id, course_id, major_id, academic_level_id, session_date, start_time, title, is_open, created_by, created_at")
    .eq("tenant_id", profile.tenant_id)
    .eq("created_by", profile.id)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (courseId) query = query.eq("course_id", courseId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const sessions = data || [];

  // Enrich with course names
  const courseIds = [...new Set(sessions.map((s: any) => s.course_id).filter(Boolean))];
  const courseLookup: Record<string, { code: string; name: string }> = {};
  if (courseIds.length > 0) {
    const { data: courses } = await serviceClient
      .from("courses")
      .select("id, code, name")
      .in("id", courseIds);
    if (courses) {
      for (const c of courses) {
        courseLookup[c.id] = { code: c.code, name: c.name };
      }
    }
  }

  // Enrich with major/level names
  const levelIds = [...new Set(sessions.map((s: any) => s.academic_level_id).filter(Boolean))];
  const majorIds = [...new Set(sessions.map((s: any) => s.major_id).filter(Boolean))];

  const levelLookup: Record<string, any> = {};
  if (levelIds.length > 0) {
    const { data: levels } = await serviceClient
      .from("academic_levels")
      .select("id, name")
      .in("id", levelIds);
    if (levels) {
      for (const l of levels) levelLookup[l.id] = l;
    }
  }

  const majorNameLookup: Record<string, string> = {};
  if (majorIds.length > 0) {
    const { data: majors } = await serviceClient
      .from("majors")
      .select("id, name")
      .in("id", majorIds);
    if (majors) {
      for (const m of majors) majorNameLookup[m.id] = m.name;
    }
  }

  return sessions.map((s: any) => ({
    ...s,
    courses: s.course_id ? courseLookup[s.course_id] || null : null,
    major_name: s.major_id ? majorNameLookup[s.major_id] || null : null,
    academic_level_name: s.academic_level_id ? levelLookup[s.academic_level_id]?.name || null : null,
  }));
}

export async function createAttendanceSession(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);

  const courseId = formData.get("course_id") as string;
  const sessionDate = formData.get("session_date") as string;
  const startTime = formData.get("start_time") as string;
  const title = formData.get("title") as string;
  const groupId = formData.get("group_id") as string;

  const serviceClient = createServiceClient();

  let majorId: string | null = null;
  let academicLevelId: string | null = null;

  // Look up the study_plan_course to get major_id and academic_level_id
  if (groupId) {
    const { data: spc } = await serviceClient
      .from("study_plan_courses")
      .select("academic_level_id")
      .eq("id", groupId)
      .single();

    if (spc) {
      academicLevelId = spc.academic_level_id;
      // Get major_id from academic_levels
      const { data: al } = await serviceClient
        .from("academic_levels")
        .select("major_id")
        .eq("id", academicLevelId)
        .single();
      if (al) majorId = al.major_id;
    }
  }

  const { data: session, error } = await serviceClient
    .from("attendance_sessions")
    .insert({
      tenant_id: profile.tenant_id,
      course_id: courseId,
      major_id: majorId,
      academic_level_id: academicLevelId,
      session_date: sessionDate,
      start_time: startTime,
      title: title || null,
      is_open: false,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("توجد جلسة حضور لهذه المادة في نفس التاريخ والوقت");
    throw new Error(error.message);
  }

  // Create attendance records for enrolled students in this specific group
  let query = serviceClient
    .from("enrollments")
    .select("student_id")
    .eq("course_id", courseId)
    .eq("status", "enrolled");

  if (majorId && academicLevelId) {
    query = query.eq("major_id", majorId).eq("academic_level_id", academicLevelId);
  }

  const { data: enrolledStudents } = await query;

  if (enrolledStudents && enrolledStudents.length > 0) {
    const records = enrolledStudents.map((e: any) => ({
      tenant_id: profile.tenant_id,
      session_id: session.id,
      student_id: e.student_id,
      course_id: courseId,
      status: "absent" as const,
    }));

    const { error: insertError } = await serviceClient.from("attendance_records").insert(records);
    if (insertError) throw new Error("فشل إنشاء سجلات الحضور: " + insertError.message);
  }

  revalidatePath("/faculty/attendance");
}

export async function generateQrCode(sessionId: string) {
  await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 10000).toISOString();

  const { error } = await serviceClient
    .from("attendance_sessions")
    .update({
      qr_code: token,
      qr_expires_at: expiresAt,
      is_open: true,
    })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/attendance");
  return { token, expiresAt };
}

export async function closeSession(sessionId: string) {
  await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("attendance_sessions")
    .update({ is_open: false, qr_code: null, qr_expires_at: null })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/attendance");
}

export async function reopenSession(sessionId: string) {
  await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("attendance_sessions")
    .update({ is_open: true })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/attendance");
}

export async function getSessionRecords(sessionId: string) {
  await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  // Fetch records for this session
  const { data: records, error } = await serviceClient
    .from("attendance_records")
    .select("id, session_id, student_id, status, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  // If no records exist, create them from enrollments
  if (!records || records.length === 0) {
    const { data: session } = await serviceClient
      .from("attendance_sessions")
      .select("course_id, tenant_id, major_id, academic_level_id")
      .eq("id", sessionId)
      .single();

    if (session) {
      let query = serviceClient
        .from("enrollments")
        .select("student_id")
        .eq("course_id", session.course_id)
        .eq("status", "enrolled");

      if (session.major_id && session.academic_level_id) {
        query = query.eq("major_id", session.major_id).eq("academic_level_id", session.academic_level_id);
      }

      const { data: enrolledStudents } = await query;

      if (enrolledStudents && enrolledStudents.length > 0) {
        const newRecords = enrolledStudents.map((e: any) => ({
          tenant_id: session.tenant_id,
          session_id: sessionId,
          student_id: e.student_id,
          course_id: session.course_id,
          status: "absent" as const,
        }));

        const { error: insertError } = await serviceClient.from("attendance_records").insert(newRecords);
        if (insertError) throw new Error("فشل إنشاء سجلات الحضور: " + insertError.message);

        const { data: newData, error: fetchError } = await serviceClient
          .from("attendance_records")
          .select("id, session_id, student_id, status, created_at")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (fetchError) throw new Error(fetchError.message);

        return await enrichWithStudentNames(serviceClient, newData || []);
      }
    }
    return [];
  }

  return await enrichWithStudentNames(serviceClient, records);
}

async function enrichWithStudentNames(serviceClient: any, records: any[]) {
  const studentIds = [...new Set(records.map((r: any) => r.student_id).filter(Boolean))];

  if (studentIds.length === 0) return records;

  const { data: profiles } = await serviceClient
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", studentIds);

  const { data: studentProfiles } = await serviceClient
    .from("student_profiles")
    .select("profile_id, student_number")
    .in("profile_id", studentIds);

  const profileMap: Record<string, any> = {};
  if (profiles) {
    for (const p of profiles) profileMap[p.id] = p;
  }

  const spMap: Record<string, any> = {};
  if (studentProfiles) {
    for (const sp of studentProfiles) spMap[sp.profile_id] = sp;
  }

  return records.map((r: any) => {
    const profile = profileMap[r.student_id];
    return {
      ...r,
      profiles: profile
        ? {
            ...profile,
            student_profiles: r.student_id && spMap[r.student_id]
              ? { student_number: spMap[r.student_id].student_number }
              : null,
          }
        : null,
    };
  });
}

export async function getAttendanceReportData(
  courseId: string,
  groupFilter?: { major_id?: string | null; academic_level_id?: string | null }
) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();
  const tenantId = profile.tenant_id!;

  // Tenant info
  const { data: tenant } = await serviceClient
    .from("tenants")
    .select("name, logo_url")
    .eq("id", tenantId)
    .single();

  // Course info
  const { data: course } = await serviceClient
    .from("courses")
    .select("code, name")
    .eq("id", courseId)
    .single();

  // Current semester
  const { data: semester } = await serviceClient
    .from("semesters")
    .select("id, name, academic_year")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "registration"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Build session query — filter by group if provided
  let sessionQuery = serviceClient
    .from("attendance_sessions")
    .select("id, title, session_date, start_time, major_id, academic_level_id")
    .eq("course_id", courseId)
    .eq("created_by", profile.id)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (groupFilter?.academic_level_id) {
    sessionQuery = sessionQuery.eq("academic_level_id", groupFilter.academic_level_id);
  }
  if (groupFilter?.major_id) {
    sessionQuery = sessionQuery.eq("major_id", groupFilter.major_id);
  }

  const { data: sessions } = await sessionQuery;
  const sessionIds = (sessions || []).map((s: any) => s.id);
  const totalSessions = sessionIds.length;

  // Get all attendance records for these sessions
  const attendanceMap: Record<string, { present: number; absent: number; excused: number; late: number }> = {};

  if (sessionIds.length > 0) {
    const { data: records } = await serviceClient
      .from("attendance_records")
      .select("student_id, status")
      .in("session_id", sessionIds);

    if (records) {
      for (const r of records) {
        if (!attendanceMap[r.student_id]) {
          attendanceMap[r.student_id] = { present: 0, absent: 0, excused: 0, late: 0 };
        }
        if (r.status === "present") attendanceMap[r.student_id].present++;
        else if (r.status === "absent") attendanceMap[r.student_id].absent++;
        else if (r.status === "excused") attendanceMap[r.student_id].excused++;
        else if (r.status === "late") attendanceMap[r.student_id].late++;
      }
    }
  }

  // Enrolled students — filter by group if provided
  let enrollQuery = serviceClient
    .from("enrollments")
    .select("student_id, major_id, academic_level_id")
    .eq("course_id", courseId)
    .eq("status", "enrolled");

  if (groupFilter?.academic_level_id) {
    enrollQuery = enrollQuery.eq("academic_level_id", groupFilter.academic_level_id);
  }
  if (groupFilter?.major_id) {
    enrollQuery = enrollQuery.eq("major_id", groupFilter.major_id);
  }

  const { data: enrollments } = await enrollQuery;
  const studentIds = [...new Set((enrollments || []).map((e: any) => e.student_id).filter(Boolean))];

  // Student profile info
  const studentMap: Record<string, any> = {};
  if (studentIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", studentIds);

    const { data: studentProfiles } = await serviceClient
      .from("student_profiles")
      .select("profile_id, student_number")
      .in("profile_id", studentIds);

    const spMap: Record<string, any> = {};
    if (studentProfiles) {
      for (const sp of studentProfiles) spMap[sp.profile_id] = sp;
    }

    if (profiles) {
      for (const p of profiles) {
        studentMap[p.id] = {
          first_name: p.first_name,
          last_name: p.last_name,
          student_number: spMap[p.id]?.student_number || "—",
        };
      }
    }
  }

  // Check dismissal status from attendance_summaries (for is_dismissed flag)
  const { data: summaries } = await serviceClient
    .from("attendance_summaries")
    .select("student_id, is_dismissed")
    .eq("course_id", courseId);

  const dismissedMap: Record<string, boolean> = {};
  if (summaries) {
    for (const s of summaries) {
      if (s.is_dismissed) dismissedMap[s.student_id] = true;
    }
  }

  // Build report rows from actual attendance data
  const rows = studentIds
    .filter((id) => studentMap[id])
    .map((studentId) => {
      const a = attendanceMap[studentId] || { present: 0, absent: 0, excused: 0, late: 0 };
      const totalAttended = a.present;
      const totalUnexcused = a.absent;
      const totalExcused = a.excused;
      const percentage = totalSessions > 0 ? Math.round((totalUnexcused / totalSessions) * 100) : 0;

      return {
        student_id: studentId,
        ...studentMap[studentId],
        total_sessions: totalSessions,
        attended: totalAttended,
        unexcused_absences: totalUnexcused,
        excused_absences: totalExcused,
        absence_percentage: percentage,
        is_dismissed: !!dismissedMap[studentId],
      };
    })
    .sort((a, b) => a.first_name.localeCompare(b.first_name));

  const dismissed = rows.filter((r) => r.is_dismissed);

  return {
    tenantName: tenant?.name || "الجامعة",
    tenantLogo: tenant?.logo_url || null,
    courseName: course?.name || "",
    courseCode: course?.code || "",
    semesterName: semester?.name || "",
    academicYear: semester?.academic_year || "",
    totalSessions,
    totalStudents: rows.length,
    totalDismissed: dismissed.length,
    rows,
    dismissed,
    generatedAt: new Date().toISOString(),
  };
}

export async function updateAttendanceRecord(
  recordId: string,
  status: "present" | "absent" | "late" | "excused",
  reason?: string
) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("attendance_records")
    .update({
      status,
      modified_by: profile.id,
      modified_at: new Date().toISOString(),
      modification_reason: reason || null,
    })
    .eq("id", recordId);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/attendance");
}
