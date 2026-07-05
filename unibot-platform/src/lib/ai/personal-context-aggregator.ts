import { createServiceClient } from "@/lib/supabase/server";

export async function getStudentPersonalSnapshot(
  userId: string,
  tenantId: string
): Promise<string> {
  const db = createServiceClient();

  // Fetch enrollments with group info
  const enrollmentsRes = await db
    .from("enrollments")
    .select("id, course_id, major_id, academic_level_id, courses!inner(id, code, name, credit_hours)")
    .eq("student_id", userId)
    .eq("tenant_id", tenantId)
    .eq("status", "enrolled");

  const enrollments = enrollmentsRes.data ?? [];
  const courseIds = enrollments.map((e: any) => e.course_id).filter(Boolean) as string[];
  const enrollmentIds = enrollments.map((e: any) => e.id).filter(Boolean) as string[];

  // Build map: course_id → course info
  const courseMap = new Map<string, { code: string; name: string; credit_hours: number }>();
  for (const e of enrollments) {
    const course = Array.isArray(e.courses) ? e.courses[0] : e.courses;
    if (course) {
      courseMap.set(e.course_id, course);
    }
  }

  // Helper: check if an item (with optional major_id/academic_level_id) matches the student
  function matchesGroup(item: { course_id: string; major_id?: string | null; academic_level_id?: string | null }): boolean {
    if (!item.major_id && !item.academic_level_id) return true;
    return enrollments.some(
      (e: any) =>
        e.course_id === item.course_id &&
        (item.major_id === null || item.major_id === e.major_id) &&
        (item.academic_level_id === null || item.academic_level_id === e.academic_level_id)
    );
  }

  const [
    nameRes,
    profileRes,
    majorRes,
    allAssignmentsRes,
    submissionsRes,
    gradesRes,
    schedulesRes,
    circularsRes,
    notificationsRes,
    materialsRes,
  ] = await Promise.all([
    db
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single(),

    db
      .from("student_profiles")
      .select("student_number, enrollment_year, cumulative_gpa, earned_credit_hours, total_credit_hours")
      .eq("profile_id", userId)
      .single(),

    db
      .from("student_majors")
      .select("major_id, majors(name, code, departments(name)), academic_levels(level_number, name)")
      .eq("student_id", userId)
      .eq("is_primary", true)
      .maybeSingle(),

    courseIds.length > 0
      ? db
          .from("assignments")
          .select("id, title, due_date, max_grade, is_published, course_id, major_id, academic_level_id, created_by, courses!inner(code, name)")
          .in("course_id", courseIds)
          .eq("is_published", true)
          .eq("tenant_id", tenantId)
          .order("due_date", { ascending: true })
      : Promise.resolve({ data: [] }),

    db
      .from("submissions")
      .select("assignment_id, status, grade, feedback, submitted_at, graded_at")
      .eq("student_id", userId)
      .eq("tenant_id", tenantId),

    courseIds.length > 0
      ? db
          .from("gradebook_entries")
          .select("coursework_grade, midterm_grade, final_grade, total_grade, course_id, enrollments!inner(letter_grade)")
          .eq("student_id", userId)
          .in("course_id", courseIds)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),

    courseIds.length > 0
      ? db
          .from("course_schedules")
          .select("day_of_week, start_time, end_time, component_type, venue_id, venues!inner(name), study_plan_courses!inner(course_id, academic_level_id, courses!inner(code, name))")
          .in("study_plan_courses.course_id", courseIds)
          .order("day_of_week")
          .order("start_time")
      : Promise.resolve({ data: [] }),

    db
      .from("circulars")
      .select("title, body, target_type, target_id, created_at, created_by, sender:profiles!circulars_created_by_fkey(first_name, last_name)")
      .eq("tenant_id", tenantId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(20),

    db
      .from("notifications")
      .select("title, body, notification_type, created_at, is_read")
      .eq("recipient_id", userId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5),

    courseIds.length > 0
      ? db
          .from("course_materials")
          .select("id, title, content_type, week_number, description, course_id, major_id, academic_level_id, courses!inner(code, name)")
          .in("course_id", courseIds)
          .eq("is_published", true)
          .order("week_number", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const parts: string[] = [];

  const sp = profileRes.data;
  const studentName = nameRes.data;
  const majorData = (majorRes.data?.majors as any);
  const levelData = (majorRes.data?.academic_levels as any);

  parts.push("## الملف الأكاديمي للطالب");
  parts.push(`- اسم الطالب: ${studentName?.first_name ?? ""} ${studentName?.last_name ?? ""}`);
  parts.push(`- رقم الطالب: ${sp?.student_number ?? "غير محدد"}`);
  parts.push(`- التخصص: ${majorData?.name ?? "غير محدد"} (${majorData?.code ?? ""})`);
  parts.push(`- القسم: ${majorData?.departments?.name ?? "غير محدد"}`);
  parts.push(`- المستوى الدراسي: ${levelData ? `المستوى ${levelData.level_number}${levelData.name ? ` — ${levelData.name}` : ""}` : "غير محدد"}`);
  parts.push(`- المعدل التراكمي (GPA): ${sp?.cumulative_gpa?.toFixed(2) ?? "غير متاح"}`);
  parts.push(`- الساعات المعتمدة المكتسبة: ${sp?.earned_credit_hours ?? 0} من أصل ${sp?.total_credit_hours ?? 0}`);
  parts.push(`- سنة الالتحاق: ${sp?.enrollment_year ?? "غير محدد"}`);
  parts.push("");

  if (enrollments.length > 0) {
    parts.push("## المقررات المسجلة حالياً");
    for (const e of enrollments) {
      const course = Array.isArray(e.courses) ? e.courses[0] : e.courses;
      parts.push(`- ${course?.code ?? ""} — ${course?.name ?? ""} (${course?.credit_hours ?? ""} ساعات)`);
    }
    parts.push("");
  } else {
    parts.push("## المقررات المسجلة حالياً");
    parts.push("- لا توجد مقررات مسجلة حالياً.");
    parts.push("");
  }

  const dayNames: Record<string, string> = {
    sunday: "الأحد", monday: "الإثنين", tuesday: "الثلاثاء",
    wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت",
  };
  const schedules = schedulesRes.data ?? [];
  // Filter schedules: only include those matching the student's academic level
  const filteredSchedules = schedules.filter((s: any) => {
    const spc = s.study_plan_courses as any;
    const scheduleLevel = spc?.academic_level_id;
    if (!scheduleLevel) return true;
    return enrollments.some(
      (e: any) => e.course_id === spc?.course_id && e.academic_level_id === scheduleLevel
    );
  });
  if (filteredSchedules.length > 0) {
    parts.push("## الجدول الدراسي الأسبوعي");
    for (const s of filteredSchedules) {
      const spc = s.study_plan_courses as any;
      const course = Array.isArray(spc?.courses) ? spc.courses[0] : spc?.courses;
      const compLabel = s.component_type === "practical" ? " (عملي)" : "";
      const venue = s.venues ? (Array.isArray(s.venues) ? s.venues[0] : s.venues) : null;
      const venueLabel = venue?.name ? ` | القاعة: ${venue.name}` : "";
      parts.push(`- ${dayNames[s.day_of_week] ?? s.day_of_week} | ${s.start_time?.slice(0, 5) ?? ""} – ${s.end_time?.slice(0, 5) ?? ""} | ${course?.code ?? ""} — ${course?.name ?? ""}${compLabel}${venueLabel}`);
    }
    parts.push("");
  }

  // Attendance: use enrollment_id (each enrollment = unique course+group)
  const attendanceRes = enrollmentIds.length > 0
    ? await db
        .from("attendance_summaries")
        .select("*, enrollments!inner(course_id, courses!inner(code, name))")
        .eq("student_id", userId)
        .eq("tenant_id", tenantId)
        .in("enrollment_id", enrollmentIds)
    : { data: [] };

  const summaries = attendanceRes.data ?? [];
  if (summaries.length > 0) {
    // Resolve absence limit per course: college.absence_limit_count → tenant.absence_limit_count → 5
    const { data: tenantData } = await db
      .from("tenants")
      .select("absence_limit_count")
      .eq("id", tenantId)
      .single();
    const tenantLimit = tenantData?.absence_limit_count ?? 5;

    // Build per-course college-level limit lookup
    const courseCollegeLimitMap: Record<string, number> = {};
    if (courseIds.length > 0) {
      const { data: courseDepts } = await db
        .from("courses")
        .select("id, departments!inner(college_id)")
        .in("id", courseIds);

      const collegeIds = [...new Set((courseDepts || []).map((cd: any) => cd.departments?.college_id).filter(Boolean))] as string[];
      if (collegeIds.length > 0) {
        const { data: colleges } = await db
          .from("colleges")
          .select("id, absence_limit_count")
          .in("id", collegeIds);
        if (colleges) {
          const collegeMap: Record<string, number | null> = {};
          for (const c of colleges) collegeMap[c.id] = c.absence_limit_count;
          for (const cd of (courseDepts || [])) {
            const cId = (cd as any).departments?.college_id;
            if (cId && collegeMap[cId] != null) courseCollegeLimitMap[cd.id] = collegeMap[cId]!;
          }
        }
      }
    }

    parts.push("## سجل الحضور والغياب");
    for (const s of summaries) {
      const enr = Array.isArray(s.enrollments) ? s.enrollments[0] : s.enrollments;
      const course = enr?.courses ? (Array.isArray(enr.courses) ? enr.courses[0] : enr.courses) : null;
      const courseId = s.course_id;
      const absenceLimit = courseCollegeLimitMap[courseId] ?? tenantLimit;
      const total = s.total_sessions ?? 0;
      const attended = s.attended_sessions ?? 0;
      const unexcused = s.unexcused_absences ?? 0;
      const remaining = Math.max(0, absenceLimit - unexcused);
      const risk = unexcused >= absenceLimit ? "🔴 محروم" : remaining <= 1 ? "🔴 خطر الحرمان" : remaining <= 2 ? "🟡 تحذير" : "🟢 آمن";
      parts.push(
        `- ${course?.code ?? "مادة"}: إجمالي ${total} محاضرة | حضور ${attended} | غياب بدون عذر ${unexcused} من ${absenceLimit} مسموح | غياب بعذر ${s.excused_absences ?? 0} | تأخر ${s.late_count ?? 0} | متبقي ${remaining} غياب | الوضع: ${risk}${s.is_dismissed ? " — ⚠️ محروم من هذا المقرر" : ""}`
      );
    }
    parts.push("");
  } else {
    parts.push("## سجل الحضور والغياب");
    parts.push("- لا تتوفر سجلات حضور بعد.");
    parts.push("");
  }

  // Filter grades by group — gradebook_entries links to enrollments (unique per student+course+group)
  const allGrades = gradesRes.data ?? [];
  const grades = allGrades.filter((g: any) => !g.course_id || matchesGroup(g));
  if (grades.length > 0) {
    parts.push("## الدرجات والنتائج المنشورة (سجل المقررات)");
    for (const g of grades) {
      const course = g.course_id ? courseMap.get(g.course_id) : null;
      const enrollment = Array.isArray(g.enrollments) ? g.enrollments[0] : g.enrollments;
      parts.push(
        `- ${course?.code ?? "مادة"} — ${course?.name ?? ""}: أعمال سنة ${g.coursework_grade ?? "—"} | منتصف الفصل ${g.midterm_grade ?? "—"} | نهائي ${g.final_grade ?? "—"} | المجموع ${g.total_grade ?? "—"} | التقدير ${enrollment?.letter_grade ?? "—"}`
      );
    }
    parts.push("");
  } else {
    parts.push("## الدرجات والنتائج المنشورة (سجل المقررات)");
    parts.push("- لا توجد درجات مقررات منشورة بعد.");
    parts.push("");
  }

  // Filter assignments by group
  const allAssignments = allAssignmentsRes.data ?? [];
  const groupedAssignments = allAssignments.filter((a: any) => matchesGroup(a));
  const submissions = submissionsRes.data ?? [];
  const submissionMap = new Map(submissions.map((s: any) => [s.assignment_id, s]));

  const pendingAssignments = groupedAssignments.filter((a: any) => !submissionMap.has(a.id));
  const submittedAssignments = groupedAssignments.filter((a: any) => submissionMap.has(a.id));

  if (pendingAssignments.length > 0) {
    parts.push("## التكاليف غير المسلَّمة (مطلوب منك تسليمها)");
    for (const a of pendingAssignments) {
      const course = a.course_id ? courseMap.get(a.course_id) : null;
      const courseInfo = course
        ? `${course.code} — ${course.name}`
        : (Array.isArray(a.courses) ? a.courses[0] : a.courses)
          ? `${(Array.isArray(a.courses) ? a.courses[0] : a.courses).code}`
          : "مادة";
      const dueDate = new Date(a.due_date).toLocaleDateString("ar-SA", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      const now = new Date();
      const isOverdue = new Date(a.due_date) < now;
      parts.push(`- "${a.title}" | المقرر: ${courseInfo} | موعد التسليم: ${dueDate}${isOverdue ? " ⚠️ انتهى الموعد" : ""} | الدرجة القصوى: ${a.max_grade ?? "—"}`);
    }
    parts.push("");
  } else {
    parts.push("## التكاليف غير المسلَّمة");
    parts.push("- ✅ لقد سلَّمت جميع التكاليف المنشورة.");
    parts.push("");
  }

  if (submittedAssignments.length > 0) {
    parts.push("## التكاليف المسلَّمة ودرجاتها");
    for (const a of submittedAssignments) {
      const course = a.course_id ? courseMap.get(a.course_id) : null;
      const courseInfo = course
        ? `${course.code} — ${course.name}`
        : (Array.isArray(a.courses) ? a.courses[0] : a.courses)
          ? `${(Array.isArray(a.courses) ? a.courses[0] : a.courses).code}`
          : "مادة";
      const sub = submissionMap.get(a.id) as any;
      const statusLabel =
        sub.status === "graded" ? "✅ مصحَّح" :
        sub.status === "late" ? "⚠️ مسلَّم متأخر (في انتظار التصحيح)" :
        sub.status === "resubmit_requested" ? "🔄 مطلوب إعادة التسليم" :
        "📤 مسلَّم (في انتظار التصحيح)";
      const gradeInfo = sub.grade !== null && sub.grade !== undefined
        ? `درجتك: ${sub.grade} / ${a.max_grade ?? "—"}`
        : "لم تُصحَّح بعد";
      const feedbackInfo = sub.feedback ? ` | ملاحظات المصحح: ${sub.feedback}` : "";
      const submittedDate = sub.submitted_at
        ? new Date(sub.submitted_at).toLocaleDateString("ar-SA")
        : "—";
      parts.push(`- "${a.title}" | المقرر: ${courseInfo} | الحالة: ${statusLabel} | ${gradeInfo}${feedbackInfo} | تاريخ التسليم: ${submittedDate}`);
    }
    parts.push("");
  }

  const allCirculars = circularsRes.data ?? [];
  const relevantCirculars = allCirculars.filter((c: any) => {
    if (c.target_type === "all") return true;
    return false;
  });
  if (relevantCirculars.length > 0) {
    parts.push("## التعاميم والإعلانات الموجهة إليك");
    for (const c of relevantCirculars.slice(0, 8)) {
      const sender = c.sender as any;
      const date = new Date(c.created_at).toLocaleDateString("ar-SA");
      const senderName = sender ? `${sender.first_name ?? ""} ${sender.last_name ?? ""}`.trim() : "الإدارة";
      parts.push(`- [${date}] من: ${senderName} | العنوان: ${c.title} | ${c.body ? `المحتوى: ${c.body.substring(0, 200)}` : ""}`);
    }
    parts.push("");
  } else {
    parts.push("## التعاميم والإعلانات");
    parts.push("- لا توجد تعاميم موجهة إليك حالياً.");
    parts.push("");
  }

  const notifications = notificationsRes.data ?? [];
  if (notifications.length > 0) {
    parts.push("## آخر الإشعارات");
    for (const n of notifications) {
      const date = new Date(n.created_at).toLocaleDateString("ar-SA");
      parts.push(`- [${date}${!n.is_read ? " — غير مقروء" : ""}] ${n.title}: ${n.body ?? ""}`);
    }
    parts.push("");
  }

  // Filter materials by group
  const allMaterials = materialsRes.data ?? [];
  const materials = allMaterials.filter((m: any) => matchesGroup(m));
  if (materials.length > 0) {
    const byCourse: Record<string, { courseName: string; items: any[] }> = {};
    for (const m of materials) {
      const course = m.course_id ? courseMap.get(m.course_id) : null;
      const courseName = course
        ? `${course.code} — ${course.name}`
        : (Array.isArray(m.courses) ? m.courses[0] : m.courses)
          ? `${(Array.isArray(m.courses) ? m.courses[0] : m.courses).code} — ${(Array.isArray(m.courses) ? m.courses[0] : m.courses).name}`
          : "مادة";
      const courseKey = course?.code ?? m.course_id ?? "unknown";
      if (!byCourse[courseKey]) {
        byCourse[courseKey] = { courseName, items: [] };
      }
      byCourse[courseKey].items.push(m);
    }

    parts.push("## المحتوى التعليمي المتاح لك (المحاضرات والمواد)");
    for (const [, course] of Object.entries(byCourse)) {
      parts.push(`### مقرر: ${course.courseName}`);
      for (const m of course.items) {
        const typeLabel =
          m.content_type === "pdf" ? "PDF — محاضرة" :
          m.content_type === "video" ? "فيديو" :
          m.content_type === "link" ? "رابط" :
          m.content_type === "lab" ? "تجربة عملية" :
          m.content_type ?? "مادة";
        const week = m.week_number ? ` | الأسبوع ${m.week_number}` : "";
        const desc = m.description ? ` | ${m.description.slice(0, 120)}` : "";
        parts.push(`  - [${typeLabel}${week}] ${m.title}${desc}`);
      }
    }
    parts.push("");
  } else {
    parts.push("## المحتوى التعليمي المتاح");
    parts.push("- لم يُرفع محتوى تعليمي بعد لمقرراتك الحالية.");
    parts.push("");
  }

  return parts.join("\n");
}
