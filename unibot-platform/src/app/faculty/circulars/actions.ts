"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

/** Creates a circular as a draft */
export async function createFacultyCircular(formData: FormData) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const targetType = formData.get("target_type") as string;
  const targetId = (formData.get("target_id") as string) || null;
  const groupId = formData.get("group_id") as string;

  // Verify faculty teaches the targeted course
  if (targetType === "section" && targetId) {
    const { data: mySchedules, error: schedErr } = await serviceClient
      .from("course_schedules")
      .select("study_plan_course_id")
      .eq("instructor_id", profile.id);

    if (schedErr) throw new Error("خطأ في التحقق من المواد المسندة");

    const spcIds = [...new Set((mySchedules || []).map((s: any) => s.study_plan_course_id).filter(Boolean))];

    if (spcIds.length === 0) {
      throw new Error("لا يمكنك إنشاء تعميم لمادة لا تدرّسها");
    }

    const { data: spcList } = await serviceClient
      .from("study_plan_courses")
      .select("course_id")
      .in("id", spcIds);

    const taughtCourseIds = [...new Set((spcList || []).map((s: any) => s.course_id).filter(Boolean))];

    if (!taughtCourseIds.includes(targetId)) {
      throw new Error("لا يمكنك إنشاء تعميم لمادة لا تدرّسها");
    }
  }

  // Resolve major_id and academic_level_id from group if provided
  let majorId: string | null = null;
  let academicLevelId: string | null = null;

  if (groupId) {
    const { data: spc } = await serviceClient
      .from("study_plan_courses")
      .select("academic_level_id")
      .eq("id", groupId)
      .single();

    if (spc) {
      academicLevelId = spc.academic_level_id;
      const { data: al } = await serviceClient
        .from("academic_levels")
        .select("major_id")
        .eq("id", academicLevelId)
        .single();
      if (al) majorId = al.major_id;
    }
  }

  const { error } = await serviceClient.from("circulars").insert({
    tenant_id: profile.tenant_id,
    created_by: profile.id,
    title: formData.get("title") as string,
    body: formData.get("body") as string,
    target_type: targetType,
    target_id: targetType === "section" ? targetId : null,
    major_id: majorId,
    academic_level_id: academicLevelId,
    is_mandatory: false,
    is_published: false,
    expires_at: (formData.get("expires_at") as string) || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/circulars");
}

/** Publishes a faculty circular and sends targeted notifications */
export async function publishFacultyCircular(id: string) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  // Mark as published
  const { data: circular, error } = await serviceClient
    .from("circulars")
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", profile.id)
    .select()
    .single();

  if (error || !circular) throw new Error("لا يمكن نشر هذا التعميم");

  const { target_type, target_id, major_id, academic_level_id, title, body, tenant_id } = circular;
  let userIds: string[] = [];

  if (target_type === "section" && target_id) {
    // Filter by course AND optionally by group (major + level)
    let query = serviceClient
      .from("enrollments")
      .select("student_id")
      .eq("course_id", target_id)
      .eq("status", "enrolled");

    if (major_id && academic_level_id) {
      query = query.eq("major_id", major_id).eq("academic_level_id", academic_level_id);
    }

    const { data: enrollments } = await query;
    userIds = (enrollments || []).map((e: any) => e.student_id);

  } else if (target_type === "students") {
    // Students enrolled in ANY course taught by this faculty
    const { data: mySchedules } = await serviceClient
      .from("course_schedules")
      .select("study_plan_course_id")
      .eq("instructor_id", profile.id)
      .eq("tenant_id", tenant_id);

    // Get course_ids from study_plan_courses
    const spcIds = [...new Set((mySchedules || []).map((s: any) => s.study_plan_course_id).filter(Boolean))];
    let courseIds: string[] = [];

    if (spcIds.length > 0) {
      const { data: spcData } = await serviceClient
        .from("study_plan_courses")
        .select("course_id")
        .in("id", spcIds);
      courseIds = [...new Set((spcData || []).map((s: any) => s.course_id).filter(Boolean))];
    }

    if (courseIds.length > 0) {
      const { data: enrollments } = await serviceClient
        .from("enrollments")
        .select("student_id")
        .in("course_id", courseIds)
        .eq("status", "enrolled");
      userIds = [...new Set((enrollments || []).map((e: any) => e.student_id))];
    }
  }

  // Bulk insert notifications in batches of 100
  if (userIds.length > 0) {
    const notifications = userIds.map((uid) => ({
      tenant_id,
      recipient_id: uid,
      notification_type: "circular",
      title: `📢 ${title}`,
      body: body?.substring(0, 150) || "",
      reference_table: "circulars",
      reference_id: id,
      is_read: false,
    }));

    const BATCH = 100;
    for (let i = 0; i < notifications.length; i += BATCH) {
      await serviceClient.from("notifications").insert(notifications.slice(i, i + BATCH));
    }
  }

  revalidatePath("/faculty/circulars");
}

/** Deletes a faculty's own circular */
export async function deleteFacultyCircular(id: string) {
  const { profile } = await requireRole(["faculty"]);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("circulars")
    .delete()
    .eq("id", id)
    .eq("created_by", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/faculty/circulars");
}
