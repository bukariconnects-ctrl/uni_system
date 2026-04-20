import { createServiceClient } from "@/lib/supabase/server";

export async function getStudentPersonalSnapshot(
  userId: string,
  tenantId: string
): Promise<string> {
  const db = createServiceClient();

  const enrollmentsRes = await db
    .from("enrollments")
    .select("section_id, sections(id, section_code, instructor_id, courses(code, name, credit_hours), semesters(name, status))")
    .eq("student_id", userId)
    .eq("tenant_id", tenantId)
    .eq("status", "enrolled");

  const enrollments = enrollmentsRes.data ?? [];
  const sectionIds = enrollments.map((e: any) => e.section_id).filter(Boolean);
  const instructorIds = [...new Set(
    enrollments.map((e: any) => (e.sections as any)?.instructor_id).filter(Boolean)
  )];

  const [
    profileRes,
    majorRes,
    attendanceRes,
    allAssignmentsRes,
    submissionsRes,
    gradesRes,
    schedulesRes,
    circularsRes,
    notificationsRes,
    materialsRes,
  ] = await Promise.all([
    db
      .from("student_profiles")
      .select("student_number, enrollment_year, cumulative_gpa, earned_credit_hours, total_credit_hours")
      .eq("profile_id", userId)
      .single(),

    db
      .from("student_majors")
      .select("majors(name, code, departments(name), academic_levels(level_number, name))")
      .eq("profile_id", userId)
      .limit(1)
      .single(),

    db
      .from("attendance_summaries")
      .select("total_sessions, attended_sessions, unexcused_absences, excused_absences, late_count, is_dismissed, sections(section_code, courses(code, name))")
      .eq("student_id", userId)
      .eq("tenant_id", tenantId),

    sectionIds.length > 0
      ? db
          .from("assignments")
          .select("id, title, due_date, max_grade, is_published, sections(section_code, courses(code, name))")
          .in("section_id", sectionIds)
          .eq("is_published", true)
          .eq("tenant_id", tenantId)
          .order("due_date", { ascending: true })
      : Promise.resolve({ data: [] }),

    db
      .from("submissions")
      .select("assignment_id, status, grade, feedback, submitted_at, graded_at")
      .eq("student_id", userId)
      .eq("tenant_id", tenantId),

    db
      .from("gradebook_entries")
      .select("coursework_grade, midterm_grade, final_grade, total_grade, sections(section_code, courses(code, name)), enrollments!inner(letter_grade)")
      .eq("student_id", userId)
      .eq("is_published", true)
      .order("created_at", { ascending: false }),

    sectionIds.length > 0
      ? db
          .from("schedules")
          .select("day_of_week, start_time, end_time, sections(section_code, courses(code, name))")
          .in("section_id", sectionIds)
          .eq("status", "published")
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
      .select("title, body, type, created_at, is_read")
      .eq("recipient_id", userId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5),

    // Course materials visible to the student
    sectionIds.length > 0
      ? db
          .from("course_materials")
          .select("id, title, content_type, week_number, description, section_id, sections(section_code, courses(code, name))")
          .in("section_id", sectionIds)
          .eq("is_published", true)
          .order("week_number", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const parts: string[] = [];

  const sp = profileRes.data;
  const majorData = (majorRes.data?.majors as any);
  const levelData = (majorData?.academic_levels as any[])?.[0];

  parts.push("## الملف الأكاديمي للطالب");
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
      const sec = e.sections as any;
      parts.push(`- ${sec?.courses?.code ?? ""} — ${sec?.courses?.name ?? ""} | الشعبة: ${sec?.section_code ?? ""} | الفصل: ${sec?.semesters?.name ?? ""}`);
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
  if (schedules.length > 0) {
    parts.push("## الجدول الدراسي الأسبوعي");
    for (const s of schedules) {
      const sec = s.sections as any;
      parts.push(`- ${dayNames[s.day_of_week] ?? s.day_of_week} | ${s.start_time?.slice(0, 5) ?? ""} – ${s.end_time?.slice(0, 5) ?? ""} | ${sec?.courses?.code ?? ""} — ${sec?.courses?.name ?? ""} (${sec?.section_code ?? ""})`);
    }
    parts.push("");
  }

  const summaries = attendanceRes.data ?? [];
  if (summaries.length > 0) {
    parts.push("## سجل الحضور والغياب");
    for (const s of summaries) {
      const sec = s.sections as any;
      const total = s.total_sessions ?? 0;
      const attended = s.attended_sessions ?? 0;
      const attendPct = total > 0 ? Math.round((attended / total) * 100) : 100;
      const absencePct = 100 - attendPct;
      const risk = absencePct >= 25 ? "🔴 خطر الحرمان" : absencePct >= 15 ? "🟡 تحذير" : "🟢 آمن";
      parts.push(
        `- ${sec?.courses?.code ?? ""} (${sec?.section_code ?? ""}): إجمالي ${total} محاضرة | حضور ${attended} (${attendPct}%) | غياب بعذر ${s.excused_absences ?? 0} | غياب بدون عذر ${s.unexcused_absences ?? 0} | تأخر ${s.late_count ?? 0} | الوضع: ${risk}${s.is_dismissed ? " — ⚠️ محروم من هذا المقرر" : ""}`
      );
    }
    parts.push("");
  } else {
    parts.push("## سجل الحضور والغياب");
    parts.push("- لا تتوفر سجلات حضور بعد.");
    parts.push("");
  }

  const grades = gradesRes.data ?? [];
  if (grades.length > 0) {
    parts.push("## الدرجات والنتائج المنشورة (سجل المقررات)");
    for (const g of grades) {
      const sec = g.sections as any;
      const enrollment = Array.isArray(g.enrollments) ? g.enrollments[0] : g.enrollments;
      parts.push(
        `- ${sec?.courses?.code ?? ""} — ${sec?.courses?.name ?? ""}: أعمال سنة ${g.coursework_grade ?? "—"} | منتصف الفصل ${g.midterm_grade ?? "—"} | نهائي ${g.final_grade ?? "—"} | المجموع ${g.total_grade ?? "—"} | التقدير ${enrollment?.letter_grade ?? "—"}`
      );
    }
    parts.push("");
  } else {
    parts.push("## الدرجات والنتائج المنشورة (سجل المقررات)");
    parts.push("- لا توجد درجات مقررات منشورة بعد.");
    parts.push("");
  }

  const allAssignments = allAssignmentsRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const submissionMap = new Map(submissions.map((s: any) => [s.assignment_id, s]));

  const pendingAssignments = allAssignments.filter((a: any) => !submissionMap.has(a.id));
  const submittedAssignments = allAssignments.filter((a: any) => submissionMap.has(a.id));

  if (pendingAssignments.length > 0) {
    parts.push("## التكاليف غير المسلَّمة (مطلوب منك تسليمها)");
    for (const a of pendingAssignments) {
      const sec = a.sections as any;
      const dueDate = new Date(a.due_date).toLocaleDateString("ar-SA", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      const now = new Date();
      const isOverdue = new Date(a.due_date) < now;
      parts.push(`- "${a.title}" | المقرر: ${sec?.courses?.code ?? ""} — ${sec?.courses?.name ?? ""} | الشعبة: ${sec?.section_code ?? ""} | موعد التسليم: ${dueDate}${isOverdue ? " ⚠️ انتهى الموعد" : ""} | الدرجة القصوى: ${a.max_grade ?? "—"}`);
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
      const sec = a.sections as any;
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
      parts.push(`- "${a.title}" | المقرر: ${sec?.courses?.code ?? ""} — ${sec?.courses?.name ?? ""} | الشعبة: ${sec?.section_code ?? ""} | الحالة: ${statusLabel} | ${gradeInfo}${feedbackInfo} | تاريخ التسليم: ${submittedDate}`);
    }
    parts.push("");
  }

  const allCirculars = circularsRes.data ?? [];
  const relevantCirculars = allCirculars.filter((c: any) => {
    if (c.target_type === "all") return true;
    if (c.target_type === "students" && instructorIds.includes(c.created_by)) return true;
    if (c.target_type === "section" && sectionIds.includes(c.target_id)) return true;
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

  // ── Course Materials ──────────────────────────────────
  const materials = materialsRes.data ?? [];
  if (materials.length > 0) {
    // Group by course
    const byCourse: Record<string, { courseName: string; items: any[] }> = {};
    for (const m of materials) {
      const sec = m.sections as any;
      const courseKey = `${sec?.courses?.code ?? "unknown"}`;
      if (!byCourse[courseKey]) {
        byCourse[courseKey] = { courseName: `${sec?.courses?.code ?? ""} — ${sec?.courses?.name ?? ""}`, items: [] };
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
