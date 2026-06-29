"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function getAttendanceSessions(courseId?: string) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  let query = supabase
    .from("attendance_sessions")
    .select("*, courses(code, name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("created_by", profile.id)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (courseId) query = query.eq("course_id", courseId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAttendanceSession(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const courseId = formData.get("course_id") as string;
  const sessionDate = formData.get("session_date") as string;
  const startTime = formData.get("start_time") as string;

  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .insert({
      tenant_id: profile.tenant_id,
      course_id: courseId,
      session_date: sessionDate,
      start_time: startTime,
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

  // Use service client to bypass RLS for fetching enrollments and inserting records
  const serviceClient = createServiceClient();

  const { data: enrolledStudents, error: enrollError } = await serviceClient
    .from("enrollments")
    .select("student_id")
    .eq("course_id", courseId)
    .eq("status", "enrolled");

  if (enrolledStudents && enrolledStudents.length > 0) {
    const records = enrolledStudents.map((e: any) => ({
      tenant_id: profile.tenant_id,
      session_id: session.id,
      student_id: e.student_id,
      course_id: courseId,
      status: "present" as const,
    }));

    const { error: insertError } = await serviceClient.from("attendance_records").insert(records);
    if (insertError) {
      console.error("Error inserting attendance records:", insertError);
    }
  }

  revalidatePath("/faculty/attendance");
}

export async function generateQrCode(sessionId: string) {
  const { profile } = await requireRole(["faculty"]);
  const supabase = await createClient();

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 10000).toISOString();

  const { error } = await supabase
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
  const supabase = await createClient();

  const { error } = await supabase
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
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  // First check if records exist
  let { data, error } = await serviceClient
    .from("attendance_records")
    .select("*, profiles!attendance_records_student_id_fkey(first_name, last_name, student_profiles(student_number))")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  // If no records exist, create them from enrollments
  if (!data || data.length === 0) {
    // Get session info
    const { data: session } = await serviceClient
      .from("attendance_sessions")
      .select("course_id, tenant_id")
      .eq("id", sessionId)
      .single();

    if (session) {
      // Get enrolled students
      const { data: enrolledStudents } = await serviceClient
        .from("enrollments")
        .select("student_id")
        .eq("course_id", session.course_id)
        .eq("status", "enrolled");

      if (enrolledStudents && enrolledStudents.length > 0) {
        const records = enrolledStudents.map((e: any) => ({
          tenant_id: session.tenant_id,
          session_id: sessionId,
          student_id: e.student_id,
          course_id: session.course_id,
          status: "present" as const,
        }));

        await serviceClient.from("attendance_records").insert(records);

        // Fetch the newly created records
        const { data: newData } = await serviceClient
          .from("attendance_records")
          .select("*, profiles!attendance_records_student_id_fkey(first_name, last_name, student_profiles(student_number))")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        return newData || [];
      }
    }
  }

  return data || [];
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
