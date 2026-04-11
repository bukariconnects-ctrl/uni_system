"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function submitAttendanceByQr(token: string) {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // Find the session with this QR token
  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select("id, section_id, is_open, qr_code, qr_expires_at")
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

  // Check if student is enrolled in this section
  const { data: enrollment } = await serviceClient
    .from("enrollments")
    .select("id")
    .eq("student_id", profile.id)
    .eq("section_id", session.section_id)
    .eq("status", "enrolled")
    .single();

  if (!enrollment) {
    throw new Error("أنت غير مسجل في هذه الشعبة");
  }

  // Find the attendance record for this student in this session
  const { data: record, error: recordError } = await serviceClient
    .from("attendance_records")
    .select("id, status")
    .eq("session_id", session.id)
    .eq("student_id", profile.id)
    .single();

  if (recordError || !record) {
    throw new Error("لم يتم العثور على سجل حضور لك في هذه الجلسة");
  }

  // Check if already marked present
  if (record.status === "present") {
    return { success: true, message: "تم تسجيل حضورك مسبقاً" };
  }

  // Update attendance record to present using serviceClient to bypass RLS
  const { error: updateError } = await serviceClient
    .from("attendance_records")
    .update({
      status: "present",
      modified_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  if (updateError) {
    throw new Error("فشل تسجيل الحضور: " + updateError.message);
  }

  revalidatePath("/student/attendance");
  return { success: true, message: "تم تسجيل حضورك بنجاح ✓" };
}

export async function getOpenSessionsForStudent() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  // Get student's enrolled sections
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("section_id")
    .eq("student_id", profile.id)
    .eq("status", "enrolled");

  if (!enrollments || enrollments.length === 0) {
    return [];
  }

  const sectionIds = enrollments.map((e) => e.section_id);

  // Get open sessions for these sections
  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("id, session_date, start_time, is_open, sections(section_code, courses(code, name))")
    .in("section_id", sectionIds)
    .eq("is_open", true)
    .order("session_date", { ascending: false });

  return sessions || [];
}
