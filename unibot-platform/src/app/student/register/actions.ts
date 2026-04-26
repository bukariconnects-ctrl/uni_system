"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getAvailableSections() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // Find the active registration semester with self_reg_enabled
  const { data: semester } = await supabase
    .from("semesters")
    .select("id, name, status, self_reg_enabled, reg_start, reg_end")
    .eq("tenant_id", profile.tenant_id)
    .in("status", ["registration", "active"])
    .eq("self_reg_enabled", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!semester) return { semester: null, sections: [], labSections: [] };

  // Get student's already-enrolled section IDs to exclude them
  const { data: existingEnrollments } = await serviceClient
    .from("enrollments")
    .select("section_id")
    .eq("student_id", profile.id)
    .eq("semester_id", semester.id)
    .eq("status", "enrolled");

  const enrolledSectionIds = new Set((existingEnrollments || []).map((e: any) => e.section_id));

  // Get open parent (lecture) sections for this semester
  const { data: sections } = await serviceClient
    .from("sections")
    .select("id, section_code, max_capacity, enrolled_count, section_type, course_id, courses(code, name, course_type, credit_hours)")
    .eq("tenant_id", profile.tenant_id)
    .eq("semester_id", semester.id)
    .eq("status", "open")
    .is("parent_section_id", null)
    .order("created_at", { ascending: false });

  // Filter out already-enrolled sections
  const availableSections = (sections || []).filter((s: any) => !enrolledSectionIds.has(s.id));

  // Get all open lab sections for this semester (children)
  const { data: labSections } = await serviceClient
    .from("sections")
    .select("id, section_code, max_capacity, enrolled_count, parent_section_id, profiles!sections_instructor_id_fkey(first_name, last_name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("semester_id", semester.id)
    .eq("status", "open")
    .eq("section_type", "lab")
    .order("section_code");

  return {
    semester,
    sections: availableSections,
    labSections: labSections || [],
  };
}

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

    const { data: passedByCourse } = await serviceClient
      .from("enrollments")
      .select("id, final_grade, sections!enrollments_section_id_fkey(course_id)")
      .eq("student_id", profile.id)
      .eq("status", "completed")
      .gte("final_grade", minGrade);

    const met = (passedByCourse || []).some((e: any) => e.sections?.course_id === prereqCourseId);

    if (!met) {
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

export async function selfEnroll(sectionId: string, labSectionId?: string) {
  const { profile } = await requireRole(["student"]);
  const serviceClient = createServiceClient();

  // Get section info
  const { data: section } = await serviceClient
    .from("sections")
    .select("semester_id, tenant_id, section_type, course_id, courses(course_type), semesters(self_reg_enabled, status)")
    .eq("id", sectionId)
    .single();

  if (!section) throw new Error("الشعبة غير موجودة");

  const semRaw = section.semesters as any;
  const sem = Array.isArray(semRaw) ? semRaw[0] : semRaw;
  if (!sem?.self_reg_enabled) throw new Error("التسجيل الذاتي غير مفعّل في هذا الفصل");
  if (!["registration", "active"].includes(sem?.status)) throw new Error("الفصل الدراسي غير مفتوح للتسجيل");

  const coursesRaw = section.courses as any;
  const courseType = (Array.isArray(coursesRaw) ? coursesRaw[0] : coursesRaw)?.course_type;
  const isHybrid = section.section_type === "lecture" && courseType === "hybrid";
  if (isHybrid && !labSectionId) throw new Error("هذا المقرر هجين — يجب اختيار شعبة معمل");

  // Check prerequisites
  const { met, unmet } = await checkPrerequisites(section.course_id);
  if (!met) {
    const codes = unmet.map((u) => `${u.code} (درجة ${u.minGrade}+)`).join("، ");
    throw new Error(`لا يمكنك التسجيل: المتطلبات السابقة غير مكتملة — ${codes}`);
  }

  // Enroll in lecture section
  const { error: lectureError } = await serviceClient.from("enrollments").insert({
    tenant_id: section.tenant_id,
    student_id: profile.id,
    section_id: sectionId,
    semester_id: section.semester_id,
    status: "enrolled",
  });

  if (lectureError) {
    if (lectureError.message.includes("duplicate") || lectureError.message.includes("unique"))
      throw new Error("أنت مسجل بالفعل في هذه الشعبة");
    if (lectureError.message.includes("ENROLLMENT_BLOCKED"))
      throw new Error("التسجيل محظور: الفصل الدراسي ليس في مرحلة التسجيل");
    throw new Error(lectureError.message);
  }

  // Enroll in lab section if hybrid
  if (isHybrid && labSectionId) {
    const { error: labError } = await serviceClient.from("enrollments").insert({
      tenant_id: section.tenant_id,
      student_id: profile.id,
      section_id: labSectionId,
      semester_id: section.semester_id,
      status: "enrolled",
    });
    if (labError && !labError.message.includes("duplicate")) {
      throw new Error(`تم التسجيل في النظري لكن فشل تسجيل المعمل: ${labError.message}`);
    }
  }

  revalidatePath("/student/register");
}
