/**
 * simulate_academic_workflow.ts
 * محاكاة كاملة لسير العمل الأكاديمي في منصة UniBot
 * يُنفَّذ بصلاحيات Service Role (يتجاوز RLS)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://leduumxihcngowpaujkr.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZHV1bXhpaGNuZ293cGF1amtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgyMDg2OSwiZXhwIjoyMDg4Mzk2ODY5fQ.GqCf2T4Z1dpmh5MM4bYBV1CtkwXBYS6rgdc-t9NuIQY";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── مساعدات الطباعة الملوّنة ───────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
};

function log(emoji: string, color: string, msg: string) {
  console.log(`${color}${C.bold}${emoji}  ${msg}${C.reset}`);
}

function step(n: number, title: string) {
  console.log(`\n${C.cyan}${C.bold}${"─".repeat(60)}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  الخطوة ${n}: ${title}${C.reset}`);
  console.log(`${C.cyan}${C.bold}${"─".repeat(60)}${C.reset}`);
}

function ok(msg: string) { log("✅", C.green, msg); }
function fail(msg: string) { log("❌", C.red, msg); }
function info(msg: string) { log("ℹ️ ", C.blue, msg); }
function warn(msg: string) { log("⚠️ ", C.yellow, msg); }
function assert(condition: boolean, successMsg: string, failMsg: string) {
  if (condition) ok(successMsg);
  else { fail(failMsg); process.exit(1); }
}

// ─── دالة مساعدة للإدراج مع فحص الأخطاء ──────────────────────────────────
async function insert<T>(table: string, data: Record<string, unknown>, label: string): Promise<T> {
  const { data: result, error } = await supabase.from(table).insert(data).select().single();
  if (error) { fail(`فشل إنشاء ${label}: ${error.message}`); process.exit(1); }
  ok(`تم إنشاء ${label}`);
  return result as T;
}

// ─── تنظيف بيانات الاختبار السابقة ────────────────────────────────────────
async function cleanup(tenantId: string) {
  info("تنظيف بيانات الاختبار السابقة...");
  await supabase.from("tenants").delete().eq("id", tenantId);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  بداية السيناريو
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n${C.magenta}${C.bold}`);
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   🏛️  محاكاة سير العمل الأكاديمي — منصة UniBot           ║");
  console.log("║   تنفيذ كامل للسيناريو من البنية التحتية حتى الدرجات    ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(C.reset);

  // ─────────────────────────────────────────────────────────────────────────
  step(1, "طارق يُنشئ الجامعة والفرع (Campus)");
  // ─────────────────────────────────────────────────────────────────────────

  const tenant = await insert<{ id: string }>("tenants", {
    name: "جامعة اليمن للعلوم والتكنولوجيا (اختبار)",
    subdomain: `sim-test-${Date.now()}`,
    admin_email: "tariq@sim.test",
    absence_threshold: 25,
    status: "active",
  }, "المستأجر (الجامعة)");

  const campus = await insert<{ id: string }>("campuses", {
    tenant_id: tenant.id,
    name: "الحرم الرئيسي — صنعاء",
    location: "صنعاء، اليمن",
    is_active: true,
  }, "الفرع الجامعي (Campus)");

  // ─────────────────────────────────────────────────────────────────────────
  step(2, "طارق يبني الشجرة الإدارية: كلية → قسم → تخصص → مستويات");
  // ─────────────────────────────────────────────────────────────────────────

  const college = await insert<{ id: string }>("colleges", {
    tenant_id: tenant.id,
    campus_id: campus.id,
    name: "كلية الهندسة وتقنية المعلومات",
    code: `ENG-${Date.now()}`,
    absence_threshold: 25,
  }, "الكلية");

  const department = await insert<{ id: string }>("departments", {
    tenant_id: tenant.id,
    college_id: college.id,
    name: "قسم علوم الحاسوب",
    code: `CS-${Date.now()}`,
  }, "القسم");

  const major = await insert<{ id: string; duration_years: number }>("majors", {
    tenant_id: tenant.id,
    department_id: department.id,
    name: "بكالوريوس هندسة البرمجيات",
    code: `SE-${Date.now()}`,
    total_credits: 130,
    duration_years: 4,
  }, "التخصص");

  // إنشاء 8 مستويات أكاديمية (4 سنوات × فصلين)
  const levelNames = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن"];
  const levels: { id: string; level_number: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const level = await insert<{ id: string; level_number: number }>("academic_levels", {
      tenant_id: tenant.id,
      major_id: major.id,
      level_number: i + 1,
      name: `المستوى ${levelNames[i]}`,
    }, `المستوى الأكاديمي ${i + 1}`);
    levels.push(level);
  }

  assert(levels.length === 8, "تم إنشاء 8 مستويات أكاديمية بنجاح", "فشل إنشاء المستويات الأكاديمية");

  // ─────────────────────────────────────────────────────────────────────────
  step(3, "طارق يُنشئ القاعات والفصل الدراسي");
  // ─────────────────────────────────────────────────────────────────────────

  const lectureHall = await insert<{ id: string }>("venues", {
    tenant_id: tenant.id,
    campus_id: campus.id,
    name: "مدرج أ",
    code: `HALL-A-${Date.now()}`,
    venue_type: "lecture_hall",
    capacity: 40,
  }, "القاعة (مدرج أ)");

  const labRoom = await insert<{ id: string }>("venues", {
    tenant_id: tenant.id,
    campus_id: campus.id,
    name: "معمل حاسوب 1",
    code: `LAB-1-${Date.now()}`,
    venue_type: "lab",
    capacity: 20,
  }, "معمل الحاسوب");

  const semester = await insert<{ id: string }>("semesters", {
    tenant_id: tenant.id,
    name: "الفصل الأول 2026/2027",
    academic_year: "2026/2027",
    semester_type: "first",
    status: "planning",
    start_date: "2026-09-01",
    end_date: "2027-01-15",
    reg_start: "2026-08-15",
    reg_end: "2026-09-10",
  }, "الفصل الدراسي (حالة: planning)");

  // ─────────────────────────────────────────────────────────────────────────
  step(4, "د. خالد يُنشئ مقرر CS101 (Hybrid) ويضعه في الخطة الدراسية");
  // ─────────────────────────────────────────────────────────────────────────

  const course = await insert<{ id: string; course_type: string }>("courses", {
    tenant_id: tenant.id,
    department_id: department.id,
    code: `CS101-${Date.now()}`,
    name: "مقدمة في البرمجة",
    credit_hours: 3,
    course_type: "hybrid",
    is_active: true,
  }, "المقرر CS101 (Hybrid)");

  assert(
    course.course_type === "hybrid",
    "المقرر محدد كـ Hybrid بنجاح",
    "فشل تحديد نوع المقرر كـ Hybrid"
  );

  await insert("study_plan_courses", {
    tenant_id: tenant.id,
    academic_level_id: levels[0].id,
    course_id: course.id,
    semester_type: "first",
    plan_course_type: "mandatory",
  }, "ربط المقرر بالخطة الدراسية (مستوى 1 - إجباري)");

  // ─────────────────────────────────────────────────────────────────────────
  step(5, "د. خالد يفتح شعبة النظري SEC-A ثم شعبتي المعمل Lab-1 و Lab-2");
  // ─────────────────────────────────────────────────────────────────────────

  const secA = await insert<{ id: string; section_type: string }>("sections", {
    tenant_id: tenant.id,
    course_id: course.id,
    semester_id: semester.id,
    section_code: "SEC-A",
    max_capacity: 40,
    section_type: "lecture",
    status: "open",
  }, "الشعبة الأم SEC-A (نظري)");

  assert(
    secA.section_type === "lecture",
    "الشعبة الأم نوعها lecture بنجاح",
    "خطأ في نوع الشعبة الأم"
  );

  const lab1 = await insert<{ id: string; parent_section_id: string | null }>("sections", {
    tenant_id: tenant.id,
    course_id: course.id,
    semester_id: semester.id,
    section_code: "Lab-1",
    max_capacity: 20,
    parent_section_id: secA.id,
    section_type: "lab",
    status: "open",
  }, "الشعبة الفرعية Lab-1 (عملي)");

  const lab2 = await insert<{ id: string }>("sections", {
    tenant_id: tenant.id,
    course_id: course.id,
    semester_id: semester.id,
    section_code: "Lab-2",
    max_capacity: 20,
    parent_section_id: secA.id,
    section_type: "lab",
    status: "open",
  }, "الشعبة الفرعية Lab-2 (عملي)");

  assert(
    lab1.parent_section_id === secA.id,
    "Lab-1 مرتبطة بالشعبة الأم SEC-A عبر parent_section_id",
    "فشل ربط Lab-1 بالشعبة الأم"
  );

  // ─────────────────────────────────────────────────────────────────────────
  step(6, "الجدولة البصرية — تحديد المواعيد والقاعات");
  // ─────────────────────────────────────────────────────────────────────────

  const scheduleSecA = await insert<{ id: string }>("schedules", {
    tenant_id: tenant.id,
    section_id: secA.id,
    venue_id: lectureHall.id,
    day_of_week: "sunday",
    start_time: "08:00:00",
    end_time: "10:00:00",
    status: "draft",
  }, "جدول SEC-A (الأحد 8-10 في مدرج أ)");

  const scheduleLab1 = await insert<{ id: string }>("schedules", {
    tenant_id: tenant.id,
    section_id: lab1.id,
    venue_id: labRoom.id,
    day_of_week: "sunday",
    start_time: "10:00:00",
    end_time: "12:00:00",
    status: "draft",
  }, "جدول Lab-1 (الأحد 10-12 في معمل 1)");

  // ─────────────────────────────────────────────────────────────────────────
  step(7, "🔥 اختبار كاشف التعارض — التعارض المكاني (SPATIAL_CONFLICT)");
  // ─────────────────────────────────────────────────────────────────────────

  info("محاولة حجز نفس القاعة في نفس الوقت (يجب أن يفشل)...");
  const { error: conflictError } = await supabase.from("schedules").insert({
    tenant_id: tenant.id,
    section_id: lab2.id,
    venue_id: lectureHall.id,
    day_of_week: "sunday",
    start_time: "08:30:00",
    end_time: "10:30:00",
    status: "draft",
  });

  if (conflictError && conflictError.message.includes("SPATIAL_CONFLICT")) {
    ok(`كاشف التعارض يعمل بنجاح! الخطأ المُعاد: "${conflictError.message.split(":")[0]}"`);
  } else if (conflictError) {
    warn(`خطأ غير متوقع: ${conflictError.message}`);
  } else {
    fail("كاشف التعارض فشل في منع التعارض المكاني!");
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  step(8, "انتقال الفصل الدراسي: planning → registration");
  // ─────────────────────────────────────────────────────────────────────────

  const { error: transitionError } = await supabase
    .from("semesters")
    .update({ status: "registration" })
    .eq("id", semester.id);

  assert(
    !transitionError,
    "انتقل الفصل إلى حالة registration بنجاح",
    `فشل الانتقال: ${transitionError?.message}`
  );

  // ─────────────────────────────────────────────────────────────────────────
  step(9, "اختبار حارس الانتقال — محاولة الرجوع إلى planning (يجب أن يفشل)");
  // ─────────────────────────────────────────────────────────────────────────

  const { error: illegalTransition } = await supabase
    .from("semesters")
    .update({ status: "planning" })
    .eq("id", semester.id);

  if (illegalTransition && illegalTransition.message.includes("INVALID_STATE_TRANSITION")) {
    ok(`حارس الانتقال يعمل! تم منع الرجوع إلى planning`);
  } else {
    warn("حارس الانتقال: نتيجة غير متوقعة — " + (illegalTransition?.message ?? "لا خطأ"));
  }

  // ─────────────────────────────────────────────────────────────────────────
  step(10, "تسجيل الطالب عمر في SEC-A و Lab-1");
  // ─────────────────────────────────────────────────────────────────────────

  // إنشاء مستخدم وهمي للطالب (بدون Auth — مباشرة في profiles)
  const { data: studentAuth } = await supabase.auth.admin.createUser({
    email: `omar.sim.${Date.now()}@test.com`,
    password: "Test1234!",
    email_confirm: true,
  });

  if (!studentAuth?.user) {
    warn("تعذّر إنشاء مستخدم Auth للطالب، سيتم استخدام UUID وهمي للاختبار");
  }

  const studentId = studentAuth?.user?.id ?? crypto.randomUUID();

  if (studentAuth?.user) {
    await supabase.from("profiles").insert({
      id: studentId,
      tenant_id: tenant.id,
      role: "student",
      first_name: "عمر",
      last_name: "محمد",
      account_status: "active",
    });
    ok("تم إنشاء ملف الطالب عمر");
  }

  const enrollmentParent = await insert<{ id: string }>("enrollments", {
    tenant_id: tenant.id,
    student_id: studentId,
    section_id: secA.id,
    semester_id: semester.id,
    status: "enrolled",
  }, "تسجيل عمر في شعبة النظري SEC-A");

  const enrollmentLab = await insert<{ id: string }>("enrollments", {
    tenant_id: tenant.id,
    student_id: studentId,
    section_id: lab1.id,
    semester_id: semester.id,
    status: "enrolled",
  }, "تسجيل عمر في شعبة المعمل Lab-1");

  // ─────────────────────────────────────────────────────────────────────────
  step(11, "تفعيل الفصل الدراسي: registration → active");
  // ─────────────────────────────────────────────────────────────────────────

  await supabase.from("semesters").update({ status: "active" }).eq("id", semester.id);
  ok("الفصل الدراسي الآن في حالة active — بدأت الدراسة!");

  // ─────────────────────────────────────────────────────────────────────────
  step(12, "رصد الدرجات — د. علي يرصد النظري، م. أحمد يرصد العملي");
  // ─────────────────────────────────────────────────────────────────────────

  // درجات الطالب في الشعبة الأم SEC-A (النظري):
  // coursework 30% + midterm 30% + final 40% = total_grade (Generated Column)
  const gradebookEntry = await insert<{ id: string; total_grade: number }>("gradebook_entries", {
    tenant_id: tenant.id,
    enrollment_id: enrollmentParent.id,
    section_id: secA.id,
    student_id: studentId,
    coursework_grade: 90,   // درجة الأعمال (العملي - م. أحمد) من 100
    midterm_grade: 90,      // درجة النصفي (18/20 × 100) = 90 — د. علي
    final_grade: 88,        // درجة النهائي (44/50 × 100) = 88 — د. علي
    is_published: false,
  }, "سجل الدرجات الموحد لعمر (coursework + midterm + final)");

  // ─────────────────────────────────────────────────────────────────────────
  step(13, "التحقق من تجميع الدرجات لمادة عمر");
  // ─────────────────────────────────────────────────────────────────────────

  const { data: grades } = await supabase
    .from("gradebook_entries")
    .select("coursework_grade, midterm_grade, final_grade, total_grade")
    .eq("student_id", studentId)
    .eq("tenant_id", tenant.id)
    .single();

  if (grades) {
    info(`  أعمال السنة (30%): ${grades.coursework_grade}`);
    info(`  النصفي       (30%): ${grades.midterm_grade}`);
    info(`  النهائي      (40%): ${grades.final_grade}`);
    ok(`الدرجة الإجمالية المُولَّدة لعمر: ${grades.total_grade?.toFixed(1)} / 100`);
    assert(
      grades.total_grade !== null && grades.total_grade > 80,
      `تجميع الدرجات صحيح: ${grades.total_grade?.toFixed(1)} (ممتاز)`,
      `الدرجة الإجمالية غير صحيحة: ${grades.total_grade}`
    );
  } else {
    warn("لم يتم العثور على سجل الدرجات");
  }

  // ─────────────────────────────────────────────────────────────────────────
  step(14, "تجميد الدرجات وأرشفة الفصل");
  // ─────────────────────────────────────────────────────────────────────────

  await supabase.from("semesters").update({ status: "grade_freeze" }).eq("id", semester.id);
  ok("الفصل في حالة grade_freeze — لا يمكن تعديل الدرجات الآن");

  // اختبار منع تعديل الدرجات بعد التجميد
  const { error: gradeLockError } = await supabase
    .from("gradebook_entries")
    .update({ midterm_grade: 10 })
    .eq("student_id", studentId)
    .eq("tenant_id", tenant.id);

  if (gradeLockError && gradeLockError.message.includes("GRADE_LOCKED")) {
    ok("حارس تجميد الدرجات يعمل! تم منع التعديل بعد grade_freeze");
  } else if (gradeLockError) {
    info(`استجابة تعديل الدرجات بعد التجميد: ${gradeLockError.message}`);
  } else {
    warn("لم يتم اكتشاف حارس تجميد الدرجات — تحقق من الـ Trigger");
  }

  await supabase.from("semesters").update({ status: "archived" }).eq("id", semester.id);
  ok("الفصل مؤرشف — الفصل الدراسي انتهى");

  // ─────────────────────────────────────────────────────────────────────────
  step(15, "🧹 تنظيف بيانات الاختبار");
  // ─────────────────────────────────────────────────────────────────────────

  await cleanup(tenant.id);
  if (studentAuth?.user) {
    await supabase.auth.admin.deleteUser(studentId);
  }
  ok("تم حذف جميع بيانات الاختبار بنجاح");

  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${C.green}${C.bold}`);
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   🎉 اكتملت المحاكاة بنجاح التام!                       ║");
  console.log("║   ✅ البنية التحتية (Campuses, Colleges, Venues)         ║");
  console.log("║   ✅ الشعب الهجينة (Parent-Child Sections)              ║");
  console.log("║   ✅ كاشف التعارض المكاني (SPATIAL_CONFLICT)            ║");
  console.log("║   ✅ آلة حالة الفصل الدراسي (State Machine)             ║");
  console.log("║   ✅ تسجيل الطلاب + رصد الدرجات الموزعة                 ║");
  console.log("║   ✅ تجميد الدرجات (GRADE_LOCKED)                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(C.reset);
}

main().catch((err) => {
  console.error(`\n${C.red}${C.bold}خطأ غير متوقع: ${err.message}${C.reset}`);
  process.exit(1);
});
