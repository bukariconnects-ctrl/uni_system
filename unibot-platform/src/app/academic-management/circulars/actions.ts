"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getCirculars() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("circulars")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getCoursesForCircular() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("courses")
    .select("id, code, name")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("code");

  return (data || []).map((c: any) => ({
    id: c.id,
    label: `${c.code} — ${c.name}`,
  }));
}

export async function getMajorsForCircular() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("majors")
    .select("id, name")
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  return data || [];
}

export async function getLevelsForMajor(majorId: string) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("academic_levels")
    .select("id, level_number, name")
    .eq("major_id", majorId)
    .order("level_number");

  return data || [];
}

export async function getDepartmentsForCircular() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("departments")
    .select("id, name")
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  return data || [];
}

export async function createCircular(formData: FormData) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { error } = await supabase.from("circulars").insert({
    tenant_id: profile.tenant_id,
    created_by: profile.id,
    title: formData.get("title") as string,
    body: formData.get("body") as string,
    target_type: formData.get("target_type") as string,
    target_id: (formData.get("target_id") as string) || null,
    is_mandatory: formData.get("is_mandatory") === "true",
    is_published: false,
    expires_at: (formData.get("expires_at") as string) || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/circulars");
}

export async function publishCircular(id: string) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // 1. Mark circular as published
  const { data: circular, error } = await supabase
    .from("circulars")
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!circular) throw new Error("التعميم غير موجود");

  // 2. Find target users based on target_type
  const { target_type, target_id, title, body, tenant_id } = circular;
  let userIds: string[] = [];

  if (target_type === "all") {
    const { data: users } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenant_id)
      .in("role", ["student", "faculty"])
      .eq("account_status", "active");
    userIds = (users || []).map((u: any) => u.id);

  } else if (target_type === "students") {
    const { data: users } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("role", "student")
      .eq("account_status", "active");
    userIds = (users || []).map((u: any) => u.id);

  } else if (target_type === "faculty") {
    const { data: users } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("role", "faculty")
      .eq("account_status", "active");
    userIds = (users || []).map((u: any) => u.id);

  } else if (target_type === "section" && target_id) {
    // target_id now holds course_id (sections concept replaced by courses)
    // Get all students enrolled in this course
    const { data: enrollments } = await serviceClient
      .from("enrollments")
      .select("student_id")
      .eq("course_id", target_id)
      .eq("status", "enrolled");

    // Also get course instructors from course_schedules
    const { data: schedules } = await serviceClient
      .from("course_schedules")
      .select("instructor_id, study_plan_courses!inner(course_id)")
      .eq("study_plan_courses.course_id", target_id)
      .not("instructor_id", "is", null);

    const instructorIds = [...new Set((schedules || []).map((s: any) => s.instructor_id))];

    userIds = (enrollments || []).map((e: any) => e.student_id);
    userIds.push(...instructorIds);

  } else if (target_type === "major" && target_id) {
    // Students enrolled in courses of this major's levels
    const { data: levels } = await serviceClient
      .from("academic_levels")
      .select("id")
      .eq("major_id", target_id);
    const levelIds = (levels || []).map((l: any) => l.id);

    if (levelIds.length > 0) {
      const { data: planCourses } = await serviceClient
        .from("study_plan_courses")
        .select("course_id")
        .in("academic_level_id", levelIds);
      const courseIds = [...new Set((planCourses || []).map((pc: any) => pc.course_id))];

      if (courseIds.length > 0) {
        const { data: enrollments } = await serviceClient
          .from("enrollments")
          .select("student_id")
          .in("course_id", courseIds)
          .eq("status", "enrolled");
        userIds = [...new Set((enrollments || []).map((e: any) => e.student_id))];
      }
    }

  } else if (target_type === "level" && target_id) {
    // Students in courses of this academic level
    const { data: planCourses } = await serviceClient
      .from("study_plan_courses")
      .select("course_id")
      .eq("academic_level_id", target_id);
    const courseIds = (planCourses || []).map((pc: any) => pc.course_id);

    if (courseIds.length > 0) {
      const { data: enrollments } = await serviceClient
        .from("enrollments")
        .select("student_id")
        .in("course_id", courseIds)
        .eq("status", "enrolled");
      userIds = [...new Set((enrollments || []).map((e: any) => e.student_id))];
    }

  } else if (target_type === "department" && target_id) {
    // All faculty and students associated with this department
    const { data: majors } = await serviceClient
      .from("majors")
      .select("id")
      .eq("department_id", target_id);
    const majorIds = (majors || []).map((m: any) => m.id);

    if (majorIds.length > 0) {
      const { data: levels } = await serviceClient
        .from("academic_levels")
        .select("id")
        .in("major_id", majorIds);
      const levelIds = (levels || []).map((l: any) => l.id);

      if (levelIds.length > 0) {
        const { data: planCourses } = await serviceClient
          .from("study_plan_courses")
          .select("id, course_id")
          .in("academic_level_id", levelIds);
        const courseIds = [...new Set((planCourses || []).map((pc: any) => pc.course_id))];

        if (courseIds.length > 0) {
          const { data: enrollments } = await serviceClient
            .from("enrollments")
            .select("student_id")
            .in("course_id", courseIds)
            .eq("status", "enrolled");

          // Also get instructors for these courses
          const spcIds = (planCourses || []).map((pc: any) => pc.id);
          const { data: schedules } = await serviceClient
            .from("course_schedules")
            .select("instructor_id")
            .in("study_plan_course_id", spcIds)
            .not("instructor_id", "is", null);

          const instructorIds = [...new Set((schedules || []).map((s: any) => s.instructor_id))];
          const studentIds = (enrollments || []).map((e: any) => e.student_id);
          userIds = [...new Set([...studentIds, ...instructorIds])];
        }
      }
    }
  }

  // 3. Bulk insert notifications for all target users
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

    // Insert in batches of 100 to avoid payload limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
      await serviceClient
        .from("notifications")
        .insert(notifications.slice(i, i + BATCH_SIZE));
    }
  }

  revalidatePath("/academic-management/circulars");
}

export async function deleteCircular(id: string) {
  await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { error } = await supabase.from("circulars").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/circulars");
}
