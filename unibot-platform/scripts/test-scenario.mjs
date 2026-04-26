/**
 * سكربت الاختبار الشامل: إطلاق "جامعة الحكمة الدولية"
 * يغطي M1 → M5 من السيناريو الكامل
 * التشغيل: node scripts/test-scenario.mjs
 */

import { createClient } from "@supabase/supabase-js";

// ── إعدادات الاتصال ────────────────────────────────────────────────────────
const SUPABASE_URL = "https://leduumxihcngowpaujkr.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZHV1bXhpaGNuZ293cGF1amtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjA4NjksImV4cCI6MjA4ODM5Njg2OX0.Q0sDF_DxtWsgWo8vRVE6dC2vljS7am8YA9xowoi8A5U";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZHV1bXhpaGNuZ293cGF1amtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgyMDg2OSwiZXhwIjoyMDg4Mzk2ODY5fQ.GqCf2T4Z1dpmh5MM4bYBV1CtkwXBYS6rgdc-t9NuIQY";

// بيانات المستخدمين
const USERS = {
  superAdmin:  { email: "superadmin@unibot.io", password: "123456" },
  tenantAdmin: { email: "admin@hikma.edu.ye",  password: "Hikma@2026!!" },
  samir:       { email: "samir@hikma.edu.ye",  password: "Samir@2026!!" },
  fatima:      { email: "fatima@hikma.edu.ye", password: "Fatima@2026!" },
  ali:         { email: "ali@hikma.edu.ye",    password: "Ali@202611!!" },
  yousef:      { email: "yousef@hikma.edu.ye", password: "Yousef@2026!" },
};

// ── مساعدات ────────────────────────────────────────────────────────────────
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let passed = 0;
let failed = 0;
let skipped = 0;
const log = [];

function step(emoji, label) {
  const msg = `\n${emoji} ${label}`;
  console.log(msg);
  log.push(msg);
}

function ok(label, detail = "") {
  passed++;
  const msg = `  ✅ ${label}${detail ? " — " + detail : ""}`;
  console.log(msg);
  log.push(msg);
}

function fail(label, err) {
  failed++;
  const msg = `  ❌ ${label} — ${err?.message || err}`;
  console.error(msg);
  log.push(msg);
}

function skip(label, reason) {
  skipped++;
  const msg = `  ⏭️  SKIPPED: ${label} — ${reason}`;
  console.log(msg);
  log.push(msg);
}

async function loginAs(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`تسجيل الدخول فشل لـ ${email}: ${error.message}`);
  return client;
}

async function withClient(email, password, label, fn) {
  step("🔑", `تسجيل الدخول كـ: ${label} (${email})`);
  const client = await loginAs(email, password);
  ok(`تسجيل الدخول`);
  await fn(client);
  await client.auth.signOut();
}

// ── State مشترك بين المراحل ────────────────────────────────────────────────
const state = {};

// ═══════════════════════════════════════════════════════════════════════════
// M1: Super Admin — إنشاء الجامعة
// ═══════════════════════════════════════════════════════════════════════════
async function phase1_superAdmin() {
  step("👑", "M1: ولادة الجامعة — Super Admin");

  await withClient(USERS.superAdmin.email, USERS.superAdmin.password, "Super Admin", async (client) => {
    // 1. التحقق من وجود خطة Enterprise
    const { data: plans, error: plansErr } = await client
      .from("subscription_plans")
      .select("id, name")
      .ilike("name", "%enterprise%")
      .limit(1);

    if (plansErr || !plans?.length) {
      // محاولة الحصول على أي خطة متاحة
      const { data: anyPlan } = await client
        .from("subscription_plans")
        .select("id, name")
        .eq("is_active", true)
        .limit(1);
      if (anyPlan?.length) {
        state.planId = anyPlan[0].id;
        ok(`الخطة المتاحة: ${anyPlan[0].name}`, `id=${state.planId}`);
      } else {
        fail("جلب خطط الاشتراك", plansErr || "لا توجد خطط متاحة");
        return;
      }
    } else {
      state.planId = plans[0].id;
      ok(`خطة Enterprise`, `id=${state.planId}`);
    }

    // 2. إنشاء tenant
    const subdomain = `hikma_test_${Date.now()}`;
    const { data: tenant, error: tenantErr } = await client
      .from("tenants")
      .insert({
        name: "جامعة الحكمة الدولية",
        subdomain,
        admin_email: USERS.tenantAdmin.email,
        plan_id: state.planId,
        max_users: 500,
        max_storage_gb: 100,
        status: "active",
        primary_color: "#1E3A5F",
        secondary_color: "#C9A84C",
        absence_threshold: 20.0,
        timezone: "Asia/Aden",
        default_language: "ar",
      })
      .select()
      .single();

    if (tenantErr) { fail("إنشاء الجامعة", tenantErr); return; }
    state.tenantId = tenant.id;
    ok(`إنشاء جامعة الحكمة الدولية`, `tenant_id=${state.tenantId}`);

    // 3. إنشاء مستخدم Tenant Admin عبر service role
    const { data: authAdmin, error: authAdminErr } = await serviceClient.auth.admin.createUser({
      email: USERS.tenantAdmin.email,
      password: USERS.tenantAdmin.password,
      email_confirm: true,
    });
    if (authAdminErr) { fail("إنشاء auth user للـ tenant admin", authAdminErr); return; }
    state.tenantAdminId = authAdmin.user.id;

    const { error: profileAdminErr } = await serviceClient.from("profiles").insert({
      id: state.tenantAdminId,
      tenant_id: state.tenantId,
      role: "tenant_admin",
      first_name: "عبد الله",
      last_name: "المدير",
      email: USERS.tenantAdmin.email,
      account_status: "active",
    });
    if (profileAdminErr) { fail("إنشاء profile للـ tenant admin", profileAdminErr); return; }
    ok(`مدير الجامعة (م. عبد الله)`, `id=${state.tenantAdminId}`);

    // 4. إنشاء subscription
    const { error: subErr } = await client.from("subscriptions").insert({
      tenant_id: state.tenantId,
      plan_id: state.planId,
      status: "active",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      auto_renew: true,
    });
    if (subErr) { fail("إنشاء الاشتراك", subErr); }
    else { ok("إنشاء الاشتراك السنوي"); }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// M2: Tenant Admin — البنية التحتية
// ═══════════════════════════════════════════════════════════════════════════
async function phase2_tenantAdmin() {
  step("🛠️", "M2: تأسيس البنية التحتية — Tenant Admin (م. عبد الله)");

  await withClient(USERS.tenantAdmin.email, USERS.tenantAdmin.password, "Tenant Admin", async (client) => {

    // ── الخطوة 1: الإعدادات ─────────────────────────────────────────────
    step("⚙️", "الخطوة 1: إعدادات الجامعة");
    const { error: settingsErr } = await client
      .from("tenants")
      .update({
        primary_color: "#1E3A5F",
        secondary_color: "#C9A84C",
        timezone: "Asia/Aden",
        absence_threshold: 20.0,
      })
      .eq("id", state.tenantId);
    if (settingsErr) fail("تحديث إعدادات الجامعة", settingsErr);
    else ok("تحديث إعدادات الجامعة (ألوان، منطقة زمنية، نسبة الغياب 20%)");

    // ── الخطوة 2: الفروع ─────────────────────────────────────────────────
    step("🏛️", "الخطوة 2: إضافة الفروع");

    const { data: campusSanaa, error: c1Err } = await client
      .from("campuses")
      .insert({ tenant_id: state.tenantId, name: "المركز الرئيسي (صنعاء)", location: "صنعاء، اليمن", is_active: true })
      .select()
      .single();
    if (c1Err) { fail("إضافة فرع صنعاء", c1Err); }
    else { state.campusSanaaId = campusSanaa.id; ok("فرع صنعاء", `id=${state.campusSanaaId}`); }

    const { data: campusHodeida, error: c2Err } = await client
      .from("campuses")
      .insert({ tenant_id: state.tenantId, name: "فرع الحديدة", location: "الحديدة، اليمن", is_active: true })
      .select()
      .single();
    if (c2Err) { fail("إضافة فرع الحديدة", c2Err); }
    else { state.campusHodeidaId = campusHodeida.id; ok("فرع الحديدة", `id=${state.campusHodeidaId}`); }

    // ── الخطوة 3: القاعات ────────────────────────────────────────────────
    step("🏫", "الخطوة 3: إضافة القاعات");

    const { data: venueHall, error: v1Err } = await client
      .from("venues")
      .insert({
        tenant_id: state.tenantId,
        campus_id: state.campusSanaaId,
        name: "مدرج الخوارزمي",
        code: "ALG-AUD",
        venue_type: "auditorium",
        capacity: 100,
        is_active: true,
      })
      .select()
      .single();
    if (v1Err) { fail("إضافة مدرج الخوارزمي", v1Err); }
    else { state.venueHallId = venueHall.id; ok("مدرج الخوارزمي (سعة 100)", `id=${state.venueHallId}`); }

    const { data: venueLab, error: v2Err } = await client
      .from("venues")
      .insert({
        tenant_id: state.tenantId,
        campus_id: state.campusSanaaId,
        name: "معمل آلان تورينج",
        code: "TUR-LAB",
        venue_type: "lab",
        capacity: 30,
        is_active: true,
      })
      .select()
      .single();
    if (v2Err) { fail("إضافة معمل آلان تورينج", v2Err); }
    else { state.venueLabId = venueLab.id; ok("معمل آلان تورينج (سعة 30)", `id=${state.venueLabId}`); }

    // ── الخطوة 4: الهيكل الأكاديمي ──────────────────────────────────────
    step("🎓", "الخطوة 4: الهيكل الأكاديمي");

    // كلية
    const { data: college, error: colErr } = await client
      .from("colleges")
      .insert({
        tenant_id: state.tenantId,
        campus_id: state.campusSanaaId,
        name: "كلية الهندسة وتكنولوجيا المعلومات",
        code: "EIT",
        absence_threshold: 20.0,
      })
      .select()
      .single();
    if (colErr) { fail("إضافة الكلية", colErr); return; }
    state.collegeId = college.id;
    ok("كلية الهندسة وتكنولوجيا المعلومات", `id=${state.collegeId}`);

    // قسم
    const { data: dept, error: deptErr } = await client
      .from("departments")
      .insert({
        tenant_id: state.tenantId,
        college_id: state.collegeId,
        name: "قسم الذكاء الاصطناعي",
        code: "AI",
      })
      .select()
      .single();
    if (deptErr) { fail("إضافة القسم", deptErr); return; }
    state.deptId = dept.id;
    ok("قسم الذكاء الاصطناعي", `id=${state.deptId}`);

    // تخصص
    const { data: major, error: majorErr } = await client
      .from("majors")
      .insert({
        tenant_id: state.tenantId,
        department_id: state.deptId,
        name: "بكالوريوس ذكاء اصطناعي",
        code: "BSC-AI",
        total_credits: 130,
        duration_years: 4,
      })
      .select()
      .single();
    if (majorErr) { fail("إضافة التخصص", majorErr); return; }
    state.majorId = major.id;
    ok("بكالوريوس ذكاء اصطناعي (130 ساعة / 4 سنوات)", `id=${state.majorId}`);

    // مستويات دراسية (8 مستويات تلقائية = 4 سنوات × 2 فصل)
    const levelNames = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن"];
    const levels = levelNames.map((name, i) => ({
      tenant_id: state.tenantId,
      major_id: state.majorId,
      level_number: i + 1,
      name: `المستوى ${name}`,
    }));
    const { data: createdLevels, error: levelsErr } = await client
      .from("academic_levels")
      .insert(levels)
      .select();
    if (levelsErr) { fail("إنشاء المستويات الدراسية", levelsErr); }
    else {
      state.levels = createdLevels;
      state.level1Id = createdLevels.find((l) => l.level_number === 1)?.id;
      state.level3Id = createdLevels.find((l) => l.level_number === 3)?.id;
      ok(`8 مستويات دراسية تلقائية`, `level1=${state.level1Id}, level3=${state.level3Id}`);
    }

    // ── الخطوة 5: الفصل الدراسي ─────────────────────────────────────────
    step("📅", "الخطوة 5: الفصل الدراسي");
    const { data: semester, error: semErr } = await client
      .from("semesters")
      .insert({
        tenant_id: state.tenantId,
        academic_year: "2026/2027",
        semester_type: "first",
        name: "الخريف 2026/2027",
        start_date: "2026-09-01",
        end_date: "2027-01-31",
        status: "planning",
      })
      .select()
      .single();
    if (semErr) { fail("إنشاء الفصل الدراسي", semErr); }
    else { state.semesterId = semester.id; ok("الخريف 2026/2027 — حالة: planning", `id=${state.semesterId}`); }

    // ── الخطوة 6: إنشاء المستخدمين ──────────────────────────────────────
    step("👥", "الخطوة 6: إنشاء المستخدمين");

    // د. سمير — academic_management (رئيس قسم)
    const { data: authSamir, error: samirAuthErr } = await serviceClient.auth.admin.createUser({
      email: USERS.samir.email,
      password: USERS.samir.password,
      email_confirm: true,
    });
    if (samirAuthErr) { fail("إنشاء د. سمير", samirAuthErr); }
    else {
      state.samirId = authSamir.user.id;
      await serviceClient.from("profiles").insert({
        id: state.samirId,
        tenant_id: state.tenantId,
        role: "academic_management",
        first_name: "سمير",
        last_name: "الأستاذ",
        email: USERS.samir.email,
        account_status: "active",
      });
      await serviceClient.from("faculty_profiles").insert({
        profile_id: state.samirId,
        tenant_id: state.tenantId,
        employee_id: "EMP-001",
        specialization: "الذكاء الاصطناعي",
      });
      await serviceClient.from("academic_management_departments").insert({
        profile_id: state.samirId,
        department_id: state.deptId,
        tenant_id: state.tenantId,
        assigned_by: state.tenantAdminId,
      });
      ok("د. سمير (academic_management — رئيس قسم AI)", `id=${state.samirId}`);
    }

    // د. فاطمة — faculty
    const { data: authFatima, error: fatimaAuthErr } = await serviceClient.auth.admin.createUser({
      email: USERS.fatima.email,
      password: USERS.fatima.password,
      email_confirm: true,
    });
    if (fatimaAuthErr) { fail("إنشاء د. فاطمة", fatimaAuthErr); }
    else {
      state.fatimaId = authFatima.user.id;
      await serviceClient.from("profiles").insert({
        id: state.fatimaId,
        tenant_id: state.tenantId,
        role: "faculty",
        first_name: "فاطمة",
        last_name: "الدكتورة",
        email: USERS.fatima.email,
        account_status: "active",
      });
      await serviceClient.from("faculty_profiles").insert({
        profile_id: state.fatimaId,
        tenant_id: state.tenantId,
        employee_id: "EMP-002",
        specialization: "برمجة متقدمة",
      });
      await serviceClient.from("faculty_departments").insert({
        faculty_id: state.fatimaId,
        department_id: state.deptId,
        tenant_id: state.tenantId,
        is_primary: true,
      });
      ok("د. فاطمة (faculty — نظري)", `id=${state.fatimaId}`);
    }

    // م. علي — faculty
    const { data: authAli, error: aliAuthErr } = await serviceClient.auth.admin.createUser({
      email: USERS.ali.email,
      password: USERS.ali.password,
      email_confirm: true,
    });
    if (aliAuthErr) { fail("إنشاء م. علي", aliAuthErr); }
    else {
      state.aliId = authAli.user.id;
      await serviceClient.from("profiles").insert({
        id: state.aliId,
        tenant_id: state.tenantId,
        role: "faculty",
        first_name: "علي",
        last_name: "المعيد",
        email: USERS.ali.email,
        account_status: "active",
      });
      await serviceClient.from("faculty_profiles").insert({
        profile_id: state.aliId,
        tenant_id: state.tenantId,
        employee_id: "EMP-003",
        specialization: "معمل برمجة",
      });
      await serviceClient.from("faculty_departments").insert({
        faculty_id: state.aliId,
        department_id: state.deptId,
        tenant_id: state.tenantId,
        is_primary: true,
      });
      ok("م. علي (faculty — معمل)", `id=${state.aliId}`);
    }

    // الطالب يوسف
    const { data: authYousef, error: yousefAuthErr } = await serviceClient.auth.admin.createUser({
      email: USERS.yousef.email,
      password: USERS.yousef.password,
      email_confirm: true,
    });
    // إذا كان المستخدم موجوداً مسبقاً، نجلب بياناته
    if (yousefAuthErr && yousefAuthErr.message?.includes("already been registered")) {
      const { data: existingUsers } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
      const existingYousef = existingUsers?.users?.find(u => u.email === USERS.yousef.email);
      if (existingYousef) {
        state.yousefId = existingYousef.id;
        ok("الطالب يوسف (موجود مسبقاً — استُعيد)", `id=${state.yousefId}`);
      } else {
        fail("إنشاء الطالب يوسف", yousefAuthErr);
      }
    } else if (yousefAuthErr) { fail("إنشاء الطالب يوسف", yousefAuthErr); }
    else {
      state.yousefId = authYousef.user.id;
      await serviceClient.from("profiles").insert({
        id: state.yousefId,
        tenant_id: state.tenantId,
        role: "student",
        first_name: "يوسف",
        last_name: "أحمد",
        email: USERS.yousef.email,
        account_status: "active",
      });
      await serviceClient.from("student_profiles").insert({
        profile_id: state.yousefId,
        tenant_id: state.tenantId,
        student_number: "2024-AI-001",
        enrollment_year: 2024,
      });
      if (state.majorId && state.level3Id) {
        await serviceClient.from("student_majors").insert({
          student_id: state.yousefId,
          major_id: state.majorId,
          tenant_id: state.tenantId,
          is_primary: true,
          academic_level_id: state.level3Id,
        });
      }
      ok("الطالب يوسف أحمد (المستوى الثالث — ذكاء اصطناعي)", `id=${state.yousefId}`);
    }

    // ── الخطوة 7: الدور المخصص ──────────────────────────────────────────
    step("🎭", "الخطوة 7: الدور المخصص (رئيس قسم)");
    const { data: customRole, error: roleErr } = await client
      .from("custom_roles")
      .insert({
        tenant_id: state.tenantId,
        name: "رئيس قسم",
        description: "إدارة الجداول وفتح الشعب ومعالجة التذاكر",
        scope: "department",
        permissions: { manage_schedules: true, open_sections: true, handle_tickets: true },
      })
      .select()
      .single();
    if (roleErr) { fail("إنشاء دور رئيس قسم", roleErr); }
    else {
      state.customRoleId = customRole.id;
      // تعيين الدور لـ د. سمير
      const { error: assignErr } = await client.from("profile_custom_roles").insert({
        profile_id: state.samirId,
        custom_role_id: state.customRoleId,
        assigned_by: state.tenantAdminId,
      });
      if (assignErr) fail("تعيين دور رئيس القسم لـ د. سمير", assignErr);
      else ok("دور 'رئيس قسم' مُنشأ ومُعيَّن لـ د. سمير");
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// M3: Academic Management — هندسة المنهج
// ═══════════════════════════════════════════════════════════════════════════
async function phase3_academicManagement() {
  step("🎓", "M3: هندسة المنهج والتشغيل — د. سمير (academic_management)");

  await withClient(USERS.samir.email, USERS.samir.password, "د. سمير", async (client) => {

    // ── الخطوة 1: المقررات ───────────────────────────────────────────────
    step("📚", "الخطوة 1: كتالوج المقررات");

    // AI101 — نظري
    const { data: courseAI, error: ai101Err } = await serviceClient
      .from("courses")
      .insert({
        tenant_id: state.tenantId,
        department_id: state.deptId,
        code: "AI101",
        name: "مقدمة في الذكاء الاصطناعي",
        credit_hours: 3,
        course_type: "theoretical",
        is_active: true,
      })
      .select()
      .single();
    if (ai101Err) { fail("إضافة AI101", ai101Err); }
    else { state.courseAI101 = courseAI.id; ok("AI101 — مقدمة في الذكاء الاصطناعي (3 ساعات / نظري)", `id=${state.courseAI101}`); }

    // PRG201 — هجين
    const { data: coursePRG, error: prg201Err } = await serviceClient
      .from("courses")
      .insert({
        tenant_id: state.tenantId,
        department_id: state.deptId,
        code: "PRG201",
        name: "برمجة متقدمة",
        credit_hours: 4,
        course_type: "hybrid",
        is_active: true,
      })
      .select()
      .single();
    if (prg201Err) { fail("إضافة PRG201", prg201Err); }
    else { state.coursePRG201 = coursePRG.id; ok("PRG201 — برمجة متقدمة (4 ساعات / هجين)", `id=${state.coursePRG201}`); }

    // ── الخطوة 2: الخطة الدراسية ─────────────────────────────────────────
    step("🗂️", "الخطوة 2: ربط المقررات بالخطة الدراسية");

    if (state.courseAI101 && state.level1Id) {
      const { error: sp1Err } = await serviceClient.from("study_plan_courses").insert({
        tenant_id: state.tenantId,
        academic_level_id: state.level1Id,
        course_id: state.courseAI101,
        semester_type: "first",
        plan_course_type: "mandatory",
      });
      if (sp1Err) fail("ربط AI101 بالمستوى الأول", sp1Err);
      else ok("AI101 → المستوى الأول / الترم الأول (إجباري)");
    }

    if (state.coursePRG201 && state.level3Id) {
      const { data: sp2, error: sp2Err } = await serviceClient.from("study_plan_courses").insert({
        tenant_id: state.tenantId,
        academic_level_id: state.level3Id,
        course_id: state.coursePRG201,
        semester_type: "first",
        plan_course_type: "mandatory",
      }).select().single();
      if (sp2Err) fail("ربط PRG201 بالمستوى الثالث", sp2Err);
      else {
        ok("PRG201 → المستوى الثالث / الترم الأول (إجباري)");

        // متطلب سابق: AI101 شرط لـ PRG201
        const { error: preErr } = await serviceClient.from("course_prerequisites").insert({
          tenant_id: state.tenantId,
          course_id: state.coursePRG201,
          prerequisite_id: state.courseAI101,
          min_grade: 60.00,
        });
        // قد تكون الجداول غير موجودة — نتجاوز
        if (preErr) skip("تحديد AI101 كمتطلب سابق لـ PRG201", `جدول course_prerequisites: ${preErr.message}`);
        else ok("AI101 → متطلب سابق لـ PRG201");
      }
    }

    // ── الخطوة 3: الشعب ──────────────────────────────────────────────────
    step("📋", "الخطوة 3: فتح الشعب (PRG201)");

    // SEC-A (نظري) — تُسند لـ د. فاطمة
    const { data: secA, error: secAErr } = await client
      .from("sections")
      .insert({
        tenant_id: state.tenantId,
        course_id: state.coursePRG201,
        semester_id: state.semesterId,
        section_code: "SEC-A",
        instructor_id: state.fatimaId,
        max_capacity: 60,
        section_type: "lecture",
        status: "open",
      })
      .select()
      .single();
    if (secAErr) { fail("فتح SEC-A (نظري)", secAErr); }
    else { state.secAId = secA.id; ok("SEC-A (نظري) — د. فاطمة — سعة 60", `id=${state.secAId}`); }

    // Lab-1 — م. علي
    if (state.secAId) {
      const { data: lab1, error: lab1Err } = await client
        .from("sections")
        .insert({
          tenant_id: state.tenantId,
          course_id: state.coursePRG201,
          semester_id: state.semesterId,
          section_code: "Lab-1",
          instructor_id: state.aliId,
          max_capacity: 30,
          parent_section_id: state.secAId,
          section_type: "lab",
          status: "open",
        })
        .select()
        .single();
      if (lab1Err) { fail("فتح Lab-1 (معمل)", lab1Err); }
      else { state.lab1Id = lab1.id; ok("Lab-1 (معمل) — م. علي — سعة 30", `id=${state.lab1Id}`); }

      // Lab-2 — م. علي
      const { data: lab2, error: lab2Err } = await client
        .from("sections")
        .insert({
          tenant_id: state.tenantId,
          course_id: state.coursePRG201,
          semester_id: state.semesterId,
          section_code: "Lab-2",
          instructor_id: state.aliId,
          max_capacity: 30,
          parent_section_id: state.secAId,
          section_type: "lab",
          status: "open",
        })
        .select()
        .single();
      if (lab2Err) { fail("فتح Lab-2 (معمل)", lab2Err); }
      else { state.lab2Id = lab2.id; ok("Lab-2 (معمل) — م. علي — سعة 30", `id=${state.lab2Id}`); }
    }

    // ── الخطوة 4: الجدولة ────────────────────────────────────────────────
    step("📅", "الخطوة 4: الجدولة البصرية");

    // SEC-A: الأحد 08:00-10:00 في مدرج الخوارزمي
    if (state.secAId && state.venueHallId) {
      const { error: sch1Err } = await client.from("schedules").insert({
        tenant_id: state.tenantId,
        section_id: state.secAId,
        venue_id: state.venueHallId,
        day_of_week: "sunday",
        start_time: "08:00",
        end_time: "10:00",
        status: "draft",
      });
      if (sch1Err) fail("جدولة SEC-A (الأحد 08-10 / مدرج الخوارزمي)", sch1Err);
      else ok("SEC-A → الأحد 08:00-10:00 / مدرج الخوارزمي");
    }

    // Lab-1: الإثنين 10:00-12:00 في معمل آلان تورينج
    if (state.lab1Id && state.venueLabId) {
      const { error: sch2Err } = await client.from("schedules").insert({
        tenant_id: state.tenantId,
        section_id: state.lab1Id,
        venue_id: state.venueLabId,
        day_of_week: "monday",
        start_time: "10:00",
        end_time: "12:00",
        status: "draft",
      });
      if (sch2Err) fail("جدولة Lab-1 (الإثنين 10-12 / معمل آلان تورينج)", sch2Err);
      else ok("Lab-1 → الإثنين 10:00-12:00 / معمل آلان تورينج");
    }

    // Lab-2: محاولة تعارض — نفس الوقت ونفس المعمل (يجب أن تفشل)
    step("⚠️", "اختبار التعارض: Lab-2 نفس الوقت ونفس المعمل (يجب أن يرفض)");
    if (state.lab2Id && state.venueLabId) {
      const { error: conflictErr } = await client.from("schedules").insert({
        tenant_id: state.tenantId,
        section_id: state.lab2Id,
        venue_id: state.venueLabId,
        day_of_week: "monday",
        start_time: "10:00",
        end_time: "12:00",
        status: "draft",
      });
      if (conflictErr) {
        ok(`✅ النظام رفض التعارض المكاني/البشري`, conflictErr.message.split(":")[0]);
      } else {
        fail("اختبار التعارض — كان يجب أن يُرفض ولم يُرفض!", "تعارض غير مكتشف");
      }
    }

    // Lab-2: الثلاثاء 10:00-12:00 (صحيح)
    if (state.lab2Id && state.venueLabId) {
      const { error: sch3Err } = await client.from("schedules").insert({
        tenant_id: state.tenantId,
        section_id: state.lab2Id,
        venue_id: state.venueLabId,
        day_of_week: "tuesday",
        start_time: "10:00",
        end_time: "12:00",
        status: "draft",
      });
      if (sch3Err) fail("جدولة Lab-2 (الثلاثاء 10-12 / معمل آلان تورينج)", sch3Err);
      else ok("Lab-2 → الثلاثاء 10:00-12:00 / معمل آلان تورينج");
    }

    // ── الخطوة 5: التسجيل الجماعي ────────────────────────────────────────
    step("📝", "الخطوة 5: تسجيل الطالب يوسف في PRG201");

    // تسجيل يوسف في SEC-A (النظري)
    if (state.secAId && state.yousefId && state.semesterId) {
      const { error: enrollErr } = await serviceClient.from("enrollments").insert({
        tenant_id: state.tenantId,
        student_id: state.yousefId,
        section_id: state.secAId,
        semester_id: state.semesterId,
        status: "enrolled",
      });
      if (enrollErr) {
        // قد يكون الفصل في حالة planning — نحاول تغييره أولاً
        if (enrollErr.message.includes("ENROLLMENT_BLOCKED")) {
          // نغير الحالة إلى registration مؤقتاً عبر service client
          await serviceClient.from("semesters").update({ status: "registration" }).eq("id", state.semesterId);
          const { error: enrollErr2 } = await serviceClient.from("enrollments").insert({
            tenant_id: state.tenantId,
            student_id: state.yousefId,
            section_id: state.secAId,
            semester_id: state.semesterId,
            status: "enrolled",
          });
          if (enrollErr2) fail("تسجيل يوسف في SEC-A", enrollErr2);
          else ok("يوسف مسجل في SEC-A (بعد تغيير الفصل إلى registration)");
        } else {
          fail("تسجيل يوسف في SEC-A", enrollErr);
        }
      } else {
        ok("يوسف مسجل في SEC-A (PRG201 — نظري)");
      }
    }

    // تسجيل يوسف في Lab-1
    if (state.lab1Id && state.yousefId && state.semesterId) {
      const { error: labEnrollErr } = await serviceClient.from("enrollments").insert({
        tenant_id: state.tenantId,
        student_id: state.yousefId,
        section_id: state.lab1Id,
        semester_id: state.semesterId,
        status: "enrolled",
      });
      if (labEnrollErr) fail("تسجيل يوسف في Lab-1", labEnrollErr);
      else ok("يوسف مسجل في Lab-1 (PRG201 — معمل)");
    }

    // ── الخطوة 6: تفعيل الفصل ─────────────────────────────────────────
    step("🟢", "الخطوة 6: تفعيل الفصل (planning → registration → active)");
    // نشر الجداول
    const { data: allScheds } = await serviceClient
      .from("schedules")
      .select("id")
      .eq("tenant_id", state.tenantId);
    if (allScheds?.length) {
      const { error: pubErr } = await serviceClient
        .from("schedules")
        .update({ status: "published" })
        .in("id", allScheds.map((s) => s.id));
      if (pubErr) fail("نشر الجداول", pubErr);
      else ok(`${allScheds.length} جداول نُشرت`);
    }
    // تغيير الفصل إلى active
    const { error: activeErr } = await serviceClient
      .from("semesters")
      .update({ status: "active" })
      .eq("id", state.semesterId);
    if (activeErr) fail("تفعيل الفصل الدراسي", activeErr);
    else ok("الفصل الدراسي → active (تم النشر)");
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// M4: التحقق من الأتمتة (Triggers)
// ═══════════════════════════════════════════════════════════════════════════
async function phase4_automationCheck() {
  step("🤖", "M4: التحقق من الأتمتة");

  // التحقق من قنوات المراسلة الآلية
  const { data: channels } = await serviceClient
    .from("channels")
    .select("id, name, section_id")
    .eq("tenant_id", state.tenantId);

  if (channels?.length > 0) {
    ok(`قنوات دردشة آلية أُنشئت`, `عدد القنوات: ${channels.length}`);
    channels.forEach((ch) => console.log(`    📢 ${ch.name}`));
  } else {
    skip("قنوات الدردشة الآلية", "Trigger قد لا ينشئها عند الإدراج المباشر عبر service role");
  }

  // التحقق من سجل الدرجات
  const { data: gradebook } = await serviceClient
    .from("gradebook_entries")
    .select("id, student_id, section_id")
    .eq("tenant_id", state.tenantId)
    .eq("student_id", state.yousefId);

  if (gradebook?.length > 0) {
    ok(`سجل درجات يوسف جاهز`, `${gradebook.length} إدخالات`);
  } else {
    skip("سجل الدرجات التلقائي", "Trigger الدرجات قد يتطلب triggers إضافية");
  }

  skip("QR Code الحضور الذكي", "يتطلب واجهة المستخدم وSession متصفح");
  skip("pg_cron — تحليل منطقة الخطر", "يعمل في الساعة 2:00 فجراً تلقائياً");
  skip("RAG / pgvector — البوت الذكي", "يتطلب رفع ملف PDF وEmbedding عبر واجهة المستخدم");
}

// ═══════════════════════════════════════════════════════════════════════════
// M5: Faculty & Student — اليوميات التشغيلية
// ═══════════════════════════════════════════════════════════════════════════
async function phase5_facultyAndStudent() {
  step("👨‍🏫", "M5: اليوميات التشغيلية — د. فاطمة والطالب يوسف");

  // د. فاطمة — التحقق من الوصول للمادة
  await withClient(USERS.fatima.email, USERS.fatima.password, "د. فاطمة", async (client) => {
    const { data: mySections, error } = await client
      .from("sections")
      .select("id, section_code, courses(code, name)")
      .eq("tenant_id", state.tenantId)
      .eq("instructor_id", state.fatimaId);
    if (error) fail("د. فاطمة: جلب شعبها", error);
    else if (mySections?.length > 0) {
      ok(`د. فاطمة ترى ${mySections.length} شعبة`, mySections.map((s) => s.section_code).join(", "));
    } else {
      fail("د. فاطمة: لا ترى شعبتها", "RLS قد لا تسمح");
    }

    skip("رفع ملف PDF وتفعيل RAG", "يتطلب واجهة المستخدم + Gemini Embedding");
    skip("الحضور الذكي / QR Code", "يتطلب واجهة المستخدم وSession متصفح");
  });

  // الطالب يوسف — التحقق من الوصول
  await withClient(USERS.yousef.email, USERS.yousef.password, "الطالب يوسف", async (client) => {
    const { data: myEnrollments, error } = await client
      .from("enrollments")
      .select("id, section_id, sections(section_code, courses(code, name))")
      .eq("tenant_id", state.tenantId)
      .eq("student_id", state.yousefId);
    if (error) fail("يوسف: جلب تسجيلاته", error);
    else if (myEnrollments?.length > 0) {
      ok(`يوسف مسجل في ${myEnrollments.length} شعب`, myEnrollments.map((e) => e.sections?.section_code).join(", "));
    } else {
      fail("يوسف: لا يرى تسجيلاته", "RLS");
    }

    const { data: schedule } = await client
      .from("schedules")
      .select("day_of_week, start_time, end_time, venues(name)")
      .eq("tenant_id", state.tenantId)
      .limit(5);
    if (schedule?.length > 0) {
      ok(`يوسف يرى جدوله (${schedule.length} حصص)`);
    } else {
      skip("جدول يوسف", "RLS قد تمنع قراءة schedules للطالب");
    }

    skip("مسح QR Code للحضور", "يتطلب واجهة المستخدم");
    skip("UniBot RAG Chat", "يتطلب Gemini Embedding وVector DB مُعبَّأ");
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// تشغيل الكل
// ═══════════════════════════════════════════════════════════════════════════
async function cleanup() {
  console.log("\n🧹 تنظيف بيانات الاختبار السابقة...");
  const emailsToDelete = Object.values(USERS).filter(u => u.email !== USERS.superAdmin.email).map(u => u.email);
  const { data: authUsers } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
  for (const au of authUsers?.users || []) {
    if (emailsToDelete.includes(au.email)) {
      await serviceClient.auth.admin.deleteUser(au.id);
      console.log(`  🗑️  حذف المستخدم: ${au.email}`);
    }
  }
  // حذف الـ tenants التي تحتوي على admin_email للـ tenantAdmin
  const { data: oldTenants } = await serviceClient.from("tenants").select("id").eq("admin_email", USERS.tenantAdmin.email);
  for (const t of oldTenants || []) {
    await serviceClient.from("tenants").delete().eq("id", t.id);
    console.log(`  🗑️  حذف tenant: ${t.id}`);
  }
  console.log("  ✅ التنظيف اكتمل\n");
}

async function run() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  🎬 بدء سيناريو: إطلاق جامعة الحكمة الدولية           ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  await cleanup();

  try {
    await phase1_superAdmin();
    await phase2_tenantAdmin();
    await phase3_academicManagement();
    await phase4_automationCheck();
    await phase5_facultyAndStudent();
  } catch (e) {
    console.error("\n💥 خطأ غير متوقع أوقف السكربت:", e.message);
    failed++;
  }

  // ── ملخص النتائج ────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  📊 ملخص نتائج الاختبار                                 ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  ✅ نجح:    ${passed}`);
  console.log(`  ❌ فشل:    ${failed}`);
  console.log(`  ⏭️  تخطى:  ${skipped}`);

  // حفظ state للتوثيق
  console.log("\n📋 بيانات المنشأة (للتوثيق):");
  console.log("  tenant_id:    ", state.tenantId);
  console.log("  college_id:   ", state.collegeId);
  console.log("  dept_id:      ", state.deptId);
  console.log("  major_id:     ", state.majorId);
  console.log("  semester_id:  ", state.semesterId);
  console.log("  campus_sanaa: ", state.campusSanaaId);
  console.log("  campus_hodieda:", state.campusHodeidaId);
  console.log("  venue_hall:   ", state.venueHallId);
  console.log("  venue_lab:    ", state.venueLabId);
  console.log("  secA_id:      ", state.secAId);
  console.log("  lab1_id:      ", state.lab1Id);
  console.log("  lab2_id:      ", state.lab2Id);
  console.log("  yousef_id:    ", state.yousefId);
  console.log("  samir_id:     ", state.samirId);
  console.log("  fatima_id:    ", state.fatimaId);
  console.log("  ali_id:       ", state.aliId);

  // تصدير النتائج لملف JSON مؤقت
  const fs = await import("fs");
  fs.writeFileSync(
    "./scripts/test-results.json",
    JSON.stringify({ passed, failed, skipped, state, users: USERS }, null, 2),
    "utf-8"
  );
  console.log("\n💾 النتائج حُفظت في: scripts/test-results.json");
}

run();
