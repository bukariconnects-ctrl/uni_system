"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

/**
 * Get the student's study-plan courses for the current registration semester,
 * along with their enrollment status and course_schedules.
 */
export async function getMyCoursesForRegistration() {
  const { profile } = await requireRole(["student"]);
  const serviceClient = createServiceClient();
  const supabase = await createClient();

  // 1. Find the active registration semester
  const { data: semester } = await supabase
    .from("semesters")
    .select("id, name, status, self_reg_enabled, reg_start, reg_end, semester_type")
    .eq("tenant_id", profile.tenant_id)
    .in("status", ["registration", "active"])
    .eq("self_reg_enabled", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!semester) return { semester: null, courses: [], enrollments: [] };

  // 2. Find the student's primary major
  const { data: primaryMajor } = await serviceClient
    .from("student_majors")
    .select("major_id")
    .eq("student_id", profile.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (!primaryMajor) return { semester, courses: [], enrollments: [] };

  // 3. Find the student's current academic level.
  //    Use the most-recent enrollment's academic_level_id, or fall back to
  //    the first level in their major.
  let academicLevelId: string | null = null;

  const { data: recentEnrollment } = await serviceClient
    .from("enrollments")
    .select("academic_level_id")
    .eq("student_id", profile.id)
    .not("academic_level_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentEnrollment?.academic_level_id) {
    academicLevelId = recentEnrollment.academic_level_id;
  } else {
    // Fall back to first level of the student's major
    const { data: firstLevel } = await serviceClient
      .from("academic_levels")
      .select("id")
      .eq("major_id", primaryMajor.major_id)
      .order("level_number", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstLevel) academicLevelId = firstLevel.id;
  }

  if (!academicLevelId) return { semester, courses: [], enrollments: [] };

  // 4. Get study plan courses for this level + semester type
  const { data: spcRows } = await serviceClient
    .from("study_plan_courses")
    .select(`
      id, course_id, plan_course_type, min_grade_to_pass,
      courses(id, code, name, credit_hours, course_type)
    `)
    .eq("academic_level_id", academicLevelId)
    .eq("semester_type", semester.semester_type)
    .eq("courses.is_active", true);

  const studyPlanCourses = spcRows || [];
  const courseIds = studyPlanCourses.map((spc: any) => spc.course_id);

  if (courseIds.length === 0) return { semester, courses: [], enrollments: [] };

  // 5. Get existing enrollments for this semester
  const { data: enrollmentRows } = await serviceClient
    .from("enrollments")
    .select("course_id, status")
    .eq("student_id", profile.id)
    .eq("semester_id", semester.id)
    .in("course_id", courseIds);

  const enrolledCourseIds = new Set(
    (enrollmentRows || [])
      .filter((e: any) => e.status === "enrolled")
      .map((e: any) => e.course_id)
  );

  // 6. Get course_schedules for these courses + semester
  const { data: scheduleRows } = await serviceClient
    .from("course_schedules")
    .select(`
      study_plan_course_id,
      component_type, day_of_week, start_time, end_time,
      venues(name, code, venue_type),
      instructors:profiles!fk_course_schedules_instructor(first_name, last_name)
    `)
    .eq("semester_id", semester.id)
    .eq("status", "published")
    .in("study_plan_course_id", studyPlanCourses.map((spc: any) => spc.id));

  // Build a map: course_id → schedules
  const spcIdToCourseId = studyPlanCourses.reduce<Record<string, string>>((acc, spc: any) => {
    acc[spc.id] = spc.course_id;
    return acc;
  }, {});

  const scheduleMap: Record<string, any[]> = {};
  for (const sched of scheduleRows || []) {
    const cid = spcIdToCourseId[sched.study_plan_course_id];
    if (!cid) continue;
    if (!scheduleMap[cid]) scheduleMap[cid] = [];
    scheduleMap[cid].push(sched);
  }

  // 7. Build the final course list
  const courses = studyPlanCourses.map((spc: any) => ({
    ...spc,
    isEnrolled: enrolledCourseIds.has(spc.course_id),
    schedules: scheduleMap[spc.course_id] || [],
  }));

  return {
    semester,
    courses,
    enrollments: enrollmentRows || [],
  };
}

/**
 * Check prerequisites for a course (direct course_id join, no sections).
 */
export async function checkPrerequisites(courseId: string) {
  const { profile } = await requireRole(["student"]);
  const serviceClient = createServiceClient();

  const { data: prereqs } = await serviceClient
    .from("course_prerequisites")
    .select("prerequisite_id, min_grade, courses!course_prerequisites_prerequisite_id_fkey(code, name)")
    .eq("course_id", courseId);

  if (!prereqs || prereqs.length === 0) return { met: true, unmet: [] };

  const unmet: { code: string; name: string; minGrade: number }[] = [];

  for (const prereq of prereqs as any[]) {
    const minGrade = prereq.min_grade ?? 60;
    const prereqCourseId = prereq.prerequisite_id;

    // Direct course_id check — no sections join needed
    const { data: passed } = await serviceClient
      .from("enrollments")
      .select("id")
      .eq("student_id", profile.id)
      .eq("course_id", prereqCourseId)
      .eq("status", "completed")
      .gte("final_grade", minGrade);

    if (!passed || passed.length === 0) {
      const courseInfo = Array.isArray(prereq.courses) ? prereq.courses[0] : prereq.courses;
      unmet.push({
        code: courseInfo?.code || prereqCourseId,
        name: courseInfo?.name || "",
        minGrade,
      });
    }
  }

  return { met: unmet.length === 0, unmet };
}

/**
 * Self-enroll in a course (by course_id, no sections).
 */
export async function selfEnroll(courseId: string) {
  const { profile } = await requireRole(["student"]);
  const serviceClient = createServiceClient();

  // Find the active registration semester
  const { data: semester } = await serviceClient
    .from("semesters")
    .select("id, status, self_reg_enabled, semester_type")
    .eq("tenant_id", profile.tenant_id)
    .in("status", ["registration", "active"])
    .eq("self_reg_enabled", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!semester) throw new Error("لا يوجد فصل دراسي مفتوح للتسجيل الذاتي حالياً");
  if (!semester.self_reg_enabled) throw new Error("التسجيل الذاتي غير مفعّل في هذا الفصل");
  if (!["registration", "active"].includes(semester.status)) throw new Error("الفصل الدراسي غير مفتوح للتسجيل");

  // Verify the course exists and is active
  const { data: course } = await serviceClient
    .from("courses")
    .select("id, is_active")
    .eq("id", courseId)
    .single();

  if (!course || !course.is_active) throw new Error("المادة غير موجودة أو غير نشطة");

  // Check that this course is in the student's study plan for the current semester
  // First find the student's primary major and level
  const { data: primaryMajor } = await serviceClient
    .from("student_majors")
    .select("major_id")
    .eq("student_id", profile.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (!primaryMajor) throw new Error("ليس لديك تخصص رئيسي — يرجى مراجعة إدارة التسجيل");

  // Find academic level
  let academicLevelId: string | null = null;
  const { data: recentEnrollment } = await serviceClient
    .from("enrollments")
    .select("academic_level_id")
    .eq("student_id", profile.id)
    .not("academic_level_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentEnrollment?.academic_level_id) {
    academicLevelId = recentEnrollment.academic_level_id;
  } else {
    const { data: firstLevel } = await serviceClient
      .from("academic_levels")
      .select("id")
      .eq("major_id", primaryMajor.major_id)
      .order("level_number", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstLevel) academicLevelId = firstLevel.id;
  }

  if (!academicLevelId) throw new Error("لا يمكن تحديد مستواك الدراسي — يرجى مراجعة إدارة التسجيل");

  // Verify the course is in the study plan for this level + semester
  const { data: spc } = await serviceClient
    .from("study_plan_courses")
    .select("id")
    .eq("course_id", courseId)
    .eq("academic_level_id", academicLevelId)
    .eq("semester_type", semester.semester_type)
    .maybeSingle();

  if (!spc) throw new Error("هذه المادة ليست ضمن خطتك الدراسية لهذا الفصل");

  // Check already enrolled
  const { data: existing } = await serviceClient
    .from("enrollments")
    .select("id")
    .eq("student_id", profile.id)
    .eq("course_id", courseId)
    .eq("semester_id", semester.id)
    .eq("status", "enrolled")
    .maybeSingle();

  if (existing) throw new Error("أنت مسجل بالفعل في هذه المادة");

  // Check prerequisites
  const { met, unmet } = await checkPrerequisites(courseId);
  if (!met) {
    const codes = unmet.map((u) => `${u.code} (درجة ${u.minGrade}+)`).join("، ");
    throw new Error(`لا يمكنك التسجيل: المتطلبات السابقة غير مكتملة — ${codes}`);
  }

  // Enroll with course_id
  const { error: insertError } = await serviceClient.from("enrollments").insert({
    tenant_id: profile.tenant_id,
    student_id: profile.id,
    course_id: courseId,
    semester_id: semester.id,
    academic_level_id: academicLevelId,
    major_id: primaryMajor.major_id,
    status: "enrolled",
  });

  if (insertError) {
    if (insertError.message.includes("duplicate") || insertError.message.includes("unique"))
      throw new Error("أنت مسجل بالفعل في هذه المادة");
    if (insertError.message.includes("ENROLLMENT_BLOCKED"))
      throw new Error("التسجيل محظور: الفصل الدراسي ليس في مرحلة التسجيل");
    throw new Error(insertError.message);
  }

  revalidatePath("/student/register");
}
