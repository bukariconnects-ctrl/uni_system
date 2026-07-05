"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

/**
 * Get study plan courses for a specific academic level and semester type.
 * Used for batch enrollment — shows all courses in the study plan that
 * students of that (major, level, semester) should be enrolled in.
 */
export async function getStudyPlanCoursesForEnrollment(
  academicLevelId: string,
  semesterType: string
) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("study_plan_courses")
    .select(`
      id,
      course_id,
      plan_course_type,
      min_grade_to_pass,
      courses(id, code, name, credit_hours, course_type)
    `)
    .eq("academic_level_id", academicLevelId)
    .eq("semester_type", semesterType)
    .eq("courses.is_active", true);

  if (error) throw new Error(error.message);
  return data || [];
}

/** Get active students for the tenant */
export async function getStudents() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, student_profiles(student_number)")
    .eq("tenant_id", profile.tenant_id)
    .eq("role", "student")
    .eq("account_status", "active")
    .order("first_name");

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Batch enroll students in a specific course.
 * Uses course_id directly (no sections).
 */
export async function batchEnroll(
  courseId: string,
  semesterId: string,
  studentIds: string[]
) {
  const { profile } = await requireRole(["academic_management"]);
  const serviceClient = createServiceClient();

  const results: { success: number; errors: string[] } = {
    success: 0,
    errors: [],
  };

  // Fetch course prerequisites
  type PrereqRow = { prerequisite_id: string; min_grade: number | null; courses: { code: string }[] };
  let prerequisites: PrereqRow[] = [];
  const { data: prereqRows } = await serviceClient
    .from("course_prerequisites")
    .select("prerequisite_id, min_grade, courses!course_prerequisites_prerequisite_id_fkey(code)")
    .eq("course_id", courseId);
  prerequisites = (prereqRows || []) as unknown as PrereqRow[];

  // Pre-fetch student names and majors for meaningful error messages and enrollment data
  const { data: studentProfiles } = await serviceClient
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", studentIds);
  const studentNameMap = (studentProfiles || []).reduce<Record<string, string>>((acc, p) => {
    acc[p.id] = `${p.first_name} ${p.last_name}`;
    return acc;
  }, {});

  const { data: studentMajorsList } = await serviceClient
    .from("student_majors")
    .select("student_id, major_id, academic_level_id")
    .in("student_id", studentIds)
    .eq("is_primary", true);
  const studentMajorMap = new Map((studentMajorsList || []).map((sm: any) => [sm.student_id, sm]));

  for (const studentId of studentIds) {
    const studentName = studentNameMap[studentId] || studentId;

    // Check prerequisites before enrolling
    let prereqBlocked = false;
    if (prerequisites.length > 0) {
      for (const prereq of prerequisites) {
        const minGrade = prereq.min_grade ?? 60;

        const { data: passed } = await serviceClient
          .from("enrollments")
          .select("id")
          .eq("student_id", studentId)
          .eq("course_id", prereq.prerequisite_id)
          .eq("status", "completed")
          .gte("final_grade", minGrade);

        if (!passed || passed.length === 0) {
          const courseCode = prereq.courses?.[0]?.code || prereq.prerequisite_id;
          results.errors.push(
            `${studentName}: لم يجتز المتطلب السابق (${courseCode}) بدرجة ${minGrade} على الأقل`
          );
          prereqBlocked = true;
          break;
        }
      }
    }
    if (prereqBlocked) continue;

    const sm = studentMajorMap.get(studentId);

    // Insert enrollment with course_id directly
    const { error: insertError } = await serviceClient.from("enrollments").insert({
      tenant_id: profile.tenant_id,
      student_id: studentId,
      course_id: courseId,
      semester_id: semesterId,
      major_id: sm?.major_id || null,
      academic_level_id: sm?.academic_level_id || null,
      status: "enrolled",
    });

    if (insertError) {
      if (insertError.message.includes("duplicate") || insertError.message.includes("unique")) {
        results.errors.push(`${studentName}: مسجل بالفعل في هذه المادة`);
      } else if (insertError.message.includes("ENROLLMENT_BLOCKED")) {
        results.errors.push(`${studentName}: التسجيل محظور — الفصل الدراسي ليس في مرحلة التسجيل`);
      } else {
        results.errors.push(`${studentName}: ${insertError.message}`);
      }
      continue;
    }

    results.success++;
  }

  revalidatePath("/academic-management/enrollments");
  return results;
}

/**
 * Get enrollments with course info (no longer through sections).
 * Optionally filter by course_id and/or semester_id.
 */
export async function getEnrollments(courseId?: string, semesterId?: string) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  let query = supabase
    .from("enrollments")
    .select(`
      id, status, enrolled_at, student_id, course_id,
      profiles!enrollments_student_id_fkey(
        first_name, last_name, student_profiles(student_number)
      ),
      courses(code, name, credit_hours),
      semesters(name)
    `)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (courseId) query = query.eq("course_id", courseId);
  if (semesterId) query = query.eq("semester_id", semesterId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Update enrollment status (enrolled / dropped).
 */
export async function updateEnrollmentStatus(
  id: string,
  status: "enrolled" | "dropped"
) {
  await requireRole(["academic_management"]);
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "dropped") {
    updateData.dropped_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("enrollments")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/enrollments");
}

/**
 * Auto-enroll a student in all courses of their study plan.
 * Finds the student's primary major → academic level → study plan courses
 * for the given semester type, then enrolls in each.
 */
export async function autoEnrollStudent(
  studentId: string,
  semesterId: string,
  semesterType: "first" | "second" | "summer"
) {
  const { profile } = await requireRole(["academic_management"]);
  const serviceClient = createServiceClient();

  // Fetch the student's tenant_id
  const { data: studentProfile } = await serviceClient
    .from("profiles")
    .select("tenant_id, first_name, last_name")
    .eq("id", studentId)
    .single();

  if (!studentProfile) {
    throw new Error("الطالب غير موجود");
  }

  const tenantId = studentProfile.tenant_id;

  // Find the student's primary major
  const { data: primaryMajor } = await serviceClient
    .from("student_majors")
    .select("major_id")
    .eq("student_id", studentId)
    .eq("is_primary", true)
    .single();

  if (!primaryMajor) {
    throw new Error("الطالب ليس لديه تخصص رئيسي — يرجى تعيين تخصص أولاً");
  }

  // Find the student's current academic level
  // We use the highest-level enrollments or the first available level for their major
  const { data: academicLevel } = await serviceClient
    .from("academic_levels")
    .select("id")
    .eq("major_id", primaryMajor.major_id)
    .order("level_number", { ascending: true })
    .limit(1)
    .single();

  if (!academicLevel) {
    throw new Error("لا توجد مستويات دراسية لهذا التخصص");
  }

  // Fetch all study plan courses for this major + level + semester type
  const { data: spcData } = await serviceClient
    .from("study_plan_courses")
    .select("id, course_id")
    .eq("academic_level_id", academicLevel.id)
    .eq("semester_type", semesterType);

  const studyPlanCourses = spcData || [];

  if (studyPlanCourses.length === 0) {
    throw new Error("لا توجد مواد في الخطة الدراسية لهذا المستوى والفصل");
  }

  const results: { success: number; errors: string[] } = {
    success: 0,
    errors: [],
  };

  const studentName = `${studentProfile.first_name} ${studentProfile.last_name}`;

  // Check prerequisites and enroll
  for (const spc of studyPlanCourses) {
    // Skip if already enrolled in this course this semester
    const { data: existing } = await serviceClient
      .from("enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", spc.course_id)
      .eq("semester_id", semesterId)
      .maybeSingle();

    if (existing) {
      results.errors.push(`${studentName}: مسجل بالفعل في المادة`);
      continue;
    }

    // Check prerequisites for this course
    type PrereqRow = { prerequisite_id: string; min_grade: number | null; courses: { code: string }[] };
    const { data: prereqRows } = await serviceClient
      .from("course_prerequisites")
      .select("prerequisite_id, min_grade, courses!course_prerequisites_prerequisite_id_fkey(code)")
      .eq("course_id", spc.course_id);
    const prerequisites = (prereqRows || []) as unknown as PrereqRow[];

    let prereqBlocked = false;
    for (const prereq of prerequisites) {
      const minGrade = prereq.min_grade ?? 60;
      const { data: passed } = await serviceClient
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId)
        .eq("course_id", prereq.prerequisite_id)
        .eq("status", "completed")
        .gte("final_grade", minGrade);

      if (!passed || passed.length === 0) {
        const courseCode = prereq.courses?.[0]?.code || prereq.prerequisite_id;
        results.errors.push(
          `${studentName}: لم يجتز المتطلب السابق (${courseCode}) — تخطي مادة`
        );
        prereqBlocked = true;
        break;
      }
    }
    if (prereqBlocked) continue;

    // Enroll
    const { error: insertError } = await serviceClient.from("enrollments").insert({
      tenant_id: tenantId,
      student_id: studentId,
      course_id: spc.course_id,
      semester_id: semesterId,
      major_id: primaryMajor.major_id,
      academic_level_id: academicLevel.id,
      status: "enrolled",
    });

    if (insertError) {
      if (!insertError.message.includes("duplicate")) {
        results.errors.push(`${studentName}: ${insertError.message}`);
      }
      continue;
    }

    results.success++;
  }

  revalidatePath("/academic-management/enrollments");
  return results;
}

/**
 * Repair channel memberships for existing enrollments that have NULL major_id or academic_level_id.
 * This fixes the issue where faculty and students are in different channels for the same course.
 * Call this after fixing enrollment flows to repair existing data.
 */
export async function repairChannelMemberships() {
  const { profile } = await requireRole(["academic_management", "tenant_admin"]);
  const serviceClient = createServiceClient();

  // 1. Pre-fetch all study_plan_courses to resolve course_id → academic_level_id by major
  const { data: allSpc } = await serviceClient
    .from("study_plan_courses")
    .select("course_id, academic_level_id, academic_levels!inner(major_id)");

  const courseLevelByMajor = new Map<string, string>();
  if (allSpc) {
    for (const spc of allSpc as any[]) {
      const al = spc.academic_levels as any;
      if (al?.major_id) {
        const key = `${spc.course_id}|${al.major_id}`;
        if (!courseLevelByMajor.has(key)) {
          courseLevelByMajor.set(key, spc.academic_level_id);
        }
      }
    }
  }

  // 2. Fix enrollments with NULL major_id/academic_level_id
  const { data: brokenEnrollments } = await serviceClient
    .from("enrollments")
    .select("id, student_id, course_id, tenant_id, major_id, academic_level_id")
    .or("major_id.is.null,academic_level_id.is.null")
    .eq("status", "enrolled");

  if (!brokenEnrollments || brokenEnrollments.length === 0) {
    return { message: "جميع التسجيلات سليمة", fixed: 0, cleaned: 0 };
  }

  const studentIds = [...new Set(brokenEnrollments.map((e: any) => e.student_id))];

  const { data: studentMajors } = await serviceClient
    .from("student_majors")
    .select("student_id, major_id, academic_level_id")
    .in("student_id", studentIds)
    .eq("is_primary", true);

  const studentMajorMap = new Map((studentMajors || []).map((sm: any) => [sm.student_id, sm]));

  let fixed = 0;
  let fixedStudentMajors = 0;
  for (const enrollment of brokenEnrollments) {
    const sm = studentMajorMap.get(enrollment.student_id);
    if (!sm || !sm.major_id) continue;

    const updates: Record<string, unknown> = {};
    if (!enrollment.major_id) updates.major_id = sm.major_id;

    // Resolve academic_level_id: from enrollment, student_majors, or study_plan_courses lookup
    let levelId = enrollment.academic_level_id || sm.academic_level_id;
    if (!levelId) {
      levelId = courseLevelByMajor.get(`${enrollment.course_id}|${sm.major_id}`) || null;
      if (levelId) {
        // Also fix student_majors for future lookups
        await serviceClient
          .from("student_majors")
          .update({ academic_level_id: levelId })
          .eq("student_id", enrollment.student_id)
          .eq("major_id", sm.major_id);
        fixedStudentMajors++;
      }
    }

    // Only update if we have both major_id and academic_level_id to prevent orphan channels
    if (!levelId) continue;
    updates.academic_level_id = levelId;

    const { error } = await serviceClient.from("enrollments").update(updates).eq("id", enrollment.id);
    if (!error) fixed++;
  }

  // 3. Clean up orphan channel memberships
  const { data: orphanChannels } = await serviceClient
    .from("channels")
    .select("id, course_id, semester_id")
    .eq("channel_type", "course")
    .is("major_id", null);

  let cleaned = 0;
  if (orphanChannels) {
    for (const channel of orphanChannels) {
      const { data: members } = await serviceClient
        .from("channel_members")
        .select("profile_id")
        .eq("channel_id", channel.id)
        .eq("is_admin", false);

      if (!members) continue;

      for (const member of members) {
        const { data: enrollment } = await serviceClient
          .from("enrollments")
          .select("id")
          .eq("student_id", member.profile_id)
          .eq("course_id", channel.course_id)
          .eq("semester_id", channel.semester_id)
          .eq("status", "enrolled")
          .not("major_id", "is", null)
          .maybeSingle();

        if (enrollment) {
          await serviceClient
            .from("channel_members")
            .delete()
            .eq("channel_id", channel.id)
            .eq("profile_id", member.profile_id);
          cleaned++;
        }
      }
    }
  }

  return {
    message: `تم إصلاح ${fixed} تسجيل وتحديث ${fixedStudentMajors} تخصص طالب وتنظيف ${cleaned} عضوية قناة غير صحيحة`,
    fixed,
    fixedStudentMajors,
    cleaned,
    total: brokenEnrollments.length,
  };
}

/** Get semesters for the enrollment filter */
export async function getSemestersForEnrollment() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("semesters")
    .select("id, name, status, semester_type")
    .eq("tenant_id", profile.tenant_id)
    .in("status", ["planning", "registration", "active"])
    .order("created_at", { ascending: false });

  return data || [];
}
