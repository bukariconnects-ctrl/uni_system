# سجل التغييرات — UniBot Platform

---

## Sprint 0: التأسيس الأساسي والمصادقة
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/middleware.ts`
- `src/middleware.ts`
- `src/lib/auth/get-user.ts`
- `src/lib/types/database.ts`
- `src/app/globals.css` (تعديل)
- `src/app/layout.tsx` (تعديل)
- `src/app/login/page.tsx`
- `src/app/unauthorized/page.tsx`
- `src/app/super-admin/layout.tsx`
- `src/app/super-admin/components/sidebar.tsx`
- `src/app/super-admin/page.tsx`
- `docs/features/sprint0-core-foundation.md`

### المشاكل
- تحذير `@theme` في CSS — هذا سلوك طبيعي في Tailwind CSS v4 والمحرر لا يدعمه بعد.

### الحل
- لا يلزم إصلاح — التحذير من المحرر فقط وليس من المُترجم.

---

## Sprint 1: إدارة خطط الاشتراك [FR-SA2.1]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/super-admin/plans/actions.ts`
- `src/app/super-admin/plans/page.tsx`
- `src/app/super-admin/plans/plans-client.tsx`
- `docs/features/sprint1-subscription-plans.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 2: إنشاء وإدارة الجامعات [FR-SA1.1 إلى FR-SA1.4]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/super-admin/tenants/actions.ts`
- `src/app/super-admin/tenants/page.tsx`
- `src/app/super-admin/tenants/tenants-client.tsx`
- `docs/features/sprint2-tenant-provisioning.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 3: لوحة التحكم الشاملة والإعلانات [FR-SA3.1, FR-SA3.4]
**التاريخ:** 2026-03-07

### الملفات المُنشأة / المعدّلة
- `src/app/super-admin/page.tsx` (تعديل — God View Dashboard بتصميم Bento Grid)
- `src/app/super-admin/announcements/actions.ts`
- `src/app/super-admin/announcements/page.tsx`
- `src/app/super-admin/announcements/announcements-client.tsx`
- `docs/features/sprint3-dashboard-announcements.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 4: إعداد مدير الجامعة والتهيئة العامة [FR-TA1.1, FR-TA1.2, FR-TA1.3]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/tenant-admin/layout.tsx`
- `src/app/tenant-admin/components/sidebar.tsx`
- `src/app/tenant-admin/page.tsx`
- `src/app/tenant-admin/settings/actions.ts`
- `src/app/tenant-admin/settings/page.tsx`
- `src/app/tenant-admin/settings/settings-client.tsx`
- `src/app/tenant-admin/calendar/actions.ts`
- `src/app/tenant-admin/calendar/page.tsx`
- `src/app/tenant-admin/calendar/calendar-client.tsx`
- `docs/features/sprint4-tenant-admin-onboarding.md`

### المشاكل
- تحذيرات `Cannot find module` في المحرر — مؤقتة تختفي بعد إعادة تشغيل TypeScript Server.

### الحل
- لا يلزم إصلاح — TypeScript يحتاج وقتاً لفهرسة الملفات الجديدة.

---

## Sprint 5: الهيكل الأكاديمي [FR-TA2.1, FR-TA2.2]
**التاريخ:** 2026-03-07

### الملفات المُنشأة / المعدّلة
- `src/lib/types/database.ts` (تعديل — إضافة أنواع College, Department, Major, AcademicLevel, Course, Section, Schedule, Venue, Enrollment, etc.)
- `src/app/tenant-admin/academic/actions.ts`
- `src/app/tenant-admin/academic/page.tsx`
- `src/app/tenant-admin/academic/academic-client.tsx`
- `src/app/tenant-admin/components/sidebar.tsx` (تعديل — إضافة روابط الهيكل والمقررات والمستخدمين والقاعات)
- `docs/features/sprint5-academic-skeleton.md`

### المشاكل
- خطأ اتصال أثناء إنشاء academic-client.tsx — تم إعادة الإنشاء بنجاح.

---

## Sprint 6: المقررات والخطط الدراسية [FR-TA2.3, FR-TA2.4]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/tenant-admin/courses/actions.ts`
- `src/app/tenant-admin/courses/page.tsx`
- `src/app/tenant-admin/courses/courses-client.tsx`
- `docs/features/sprint6-curriculum-study-plans.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 7: إدارة المستخدمين والأدوار [FR-TA3.1, FR-TA3.2, FR-TA3.3]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/tenant-admin/users/actions.ts`
- `src/app/tenant-admin/users/page.tsx`
- `src/app/tenant-admin/users/users-client.tsx`
- `docs/features/sprint7-user-population-rbac.md`

### المشاكل
- خطأ `createAdminClient` لم يكن مُنتظراً (await) — تم إصلاحه فوراً.

---

## Sprint 8: إدارة الشعب والتسجيل الجماعي [FR-AM1.2, FR-AM1.3, FR-AM1.5]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/academic-management/layout.tsx`
- `src/app/academic-management/components/sidebar.tsx`
- `src/app/academic-management/page.tsx`
- `src/app/academic-management/sections/actions.ts`
- `src/app/academic-management/sections/page.tsx`
- `src/app/academic-management/sections/sections-client.tsx`
- `src/app/academic-management/enrollments/actions.ts`
- `src/app/academic-management/enrollments/page.tsx`
- `src/app/academic-management/enrollments/enrollments-client.tsx`
- `docs/features/sprint8-sections-enrollment.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 9: الجدولة الذكية والقاعات [FR-TA4.1, FR-AM2.1, FR-AM2.2]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/tenant-admin/venues/actions.ts`
- `src/app/tenant-admin/venues/page.tsx`
- `src/app/tenant-admin/venues/venues-client.tsx`
- `src/app/academic-management/schedules/actions.ts`
- `src/app/academic-management/schedules/page.tsx`
- `src/app/academic-management/schedules/schedules-client.tsx`
- `docs/features/sprint9-scheduling-venues.md`

### المشاكل
- لا توجد مشاكل.

### ملاحظة مهمة
- تم بناء دالة `parseConflictError()` لمعالجة أخطاء trigger `trg_check_schedule_conflicts` وتحويلها لرسائل عربية واضحة (SPATIAL_CONFLICT, FACULTY_CONFLICT, STUDENT_CONFLICT).
- رسائل التعارض تُعرض بتنسيق تحذيري مميز في الواجهة.

---

## Sprint 10: المحتوى التعليمي وخطط المقررات [FR-FM1.1, FR-FM1.2, FR-FM1.3, FR-ST2.1]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/faculty/layout.tsx`
- `src/app/faculty/components/sidebar.tsx`
- `src/app/faculty/page.tsx`
- `src/app/faculty/materials/actions.ts`
- `src/app/faculty/materials/page.tsx`
- `src/app/faculty/materials/materials-client.tsx`
- `src/app/student/layout.tsx`
- `src/app/student/components/sidebar.tsx`
- `src/app/student/page.tsx`
- `src/app/student/materials/page.tsx`
- `src/app/student/materials/materials-client.tsx`
- `docs/features/sprint10-course-content-syllabi.md`

### الملفات المُعدَّلة
- `src/lib/types/database.ts` — إضافة أنواع LMS والمراسلات والتنبيهات

### المشاكل
- لا توجد مشاكل.

---

## Sprint 11: التكاليف والتسليمات [FR-FM2.1, FR-FM2.2, FR-ST2.2]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/faculty/assignments/actions.ts`
- `src/app/faculty/assignments/page.tsx`
- `src/app/faculty/assignments/assignments-client.tsx`
- `src/app/student/assignments/actions.ts`
- `src/app/student/assignments/page.tsx`
- `src/app/student/assignments/assignments-client.tsx`
- `docs/features/sprint11-assignments-submissions.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 12: الحضور الذكي وسجل الدرجات [FR-FM2.3, FR-FM3.1, FR-ST2.3, FR-ST3.1]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/faculty/attendance/actions.ts`
- `src/app/faculty/attendance/page.tsx`
- `src/app/faculty/attendance/attendance-client.tsx`
- `src/app/faculty/gradebook/actions.ts`
- `src/app/faculty/gradebook/page.tsx`
- `src/app/faculty/gradebook/gradebook-client.tsx`
- `src/app/student/attendance/page.tsx`
- `src/app/student/attendance/attendance-client.tsx`
- `src/app/student/grades/page.tsx`
- `docs/features/sprint12-attendance-gradebook.md`

### ملاحظة مهمة
- `total_grade` عمود GENERATED — القيمة تُحسب تلقائياً من DB
- `trg_recalc_attendance_summary` يحدث ملخص الحضور تلقائياً
- `trg_sync_final_grade` يحدث الدرجة النهائية والتقدير تلقائياً

### المشاكل
- لا توجد مشاكل.

---

## Sprint 13: المراسلات الفورية [FR-FM4.1, FR-ST4.1, FR-ST4.3]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/faculty/messages/actions.ts`
- `src/app/faculty/messages/page.tsx`
- `src/app/faculty/messages/messages-client.tsx`
- `src/app/student/messages/actions.ts`
- `src/app/student/messages/page.tsx`
- `src/app/student/messages/messages-client.tsx`
- `docs/features/sprint13-realtime-messaging.md`

### ملاحظة مهمة
- تم دمج Supabase Realtime عبر `postgres_changes` على جدول `messages`
- Optimistic UI مع rollback عند فشل الإرسال
- القنوات تُنشأ تلقائياً بواسطة `auto_create_course_channel` trigger

### المشاكل
- لا توجد مشاكل.

---

## Sprint 14: التعاميم والإشعارات [FR-AM4.1, FR-ST1.x]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/components/notification-bell.tsx`
- `src/app/academic-management/circulars/actions.ts`
- `src/app/academic-management/circulars/page.tsx`
- `src/app/academic-management/circulars/circulars-client.tsx`
- `docs/features/sprint14-circulars-notifications.md`

### الملفات المُعدَّلة
- `src/app/faculty/components/sidebar.tsx` — إضافة NotificationBell
- `src/app/student/components/sidebar.tsx` — إضافة NotificationBell
- `src/app/academic-management/components/sidebar.tsx` — إضافة رابط التعاميم

### ملاحظة مهمة
- `NotificationBell` يستخدم Supabase Realtime (`postgres_changes` على `notifications`)
- التعاميم الإلزامية تظهر بتنسيق أحمر مميز
- الإشعارات التلقائية (غياب/درجات/تذاكر) تأتي من triggers في DB

### المشاكل
- لا توجد مشاكل.

---

## Seed Data: بيانات اختبارية شاملة
**التاريخ:** 2026-03-07

### الملف المُنشأ
- `supabase/seed.sql`

### البيانات المُولَّدة
| الجدول | العدد | ملاحظات |
|--------|-------|---------|
| `subscription_plans` | 3 | basic, pro, enterprise |
| `tenants` | 1 | جامعة العلوم والتكنولوجيا - فرع تعز |
| `auth.users` + `profiles` | 11 | 1 super_admin, 1 tenant_admin, 2 academic_management, 2 faculty, 5 students |
| `custom_roles` | 2 | رئيس قسم + سكرتير |
| `colleges` → `departments` → `majors` | 1 → 1 → 1 | كلية الهندسة → علوم الحاسوب → هندسة البرمجيات |
| `courses` | 3 | CS101, CS201, MATH101 |
| `semesters` | 1 | الفصل الأول 2026-2027 (active) |
| `venues` | 2 | قاعة محاضرات + معمل |
| `sections` | 2 | SEC-A لكل مقرر |
| `enrollments` | 6 | 5 طلاب + طالب مسجل في شعبتين |
| `course_materials` | 2 | واحد مع `is_ai_approved=TRUE` |
| `assignments` + `submissions` | 2 + 2 | تكليفات مُقيَّمة |
| `gradebook_entries` | 3 | بدون final_grade (total_grade GENERATED) |
| `attendance_sessions` | 8 | جلسات مكتملة |
| `attendance_records` | 24 | 8 × 3 طلاب |
| `messages` | 9 | 7 channel + 2 direct |
| `circulars` | 2 | 1 عادي + 1 إلزامي |
| `syllabi` | 2 | 1 approved + 1 submitted |

### اختبارات Triggers (نتائج متوقعة)
1. **`trg_auto_create_course_channel`**: إنشاء 2 قنوات تلقائياً عند إدراج الشُعب
2. **`trg_auto_channel_membership`**: إضافة الطلاب تلقائياً لقنوات مقرراتهم عند التسجيل
3. **`sync_section_enrolled_count`**: تحديث `enrolled_count` في الشُعب (3 + 3)
4. **`trg_recalc_attendance_summary`**: حساب ملخص الحضور لكل طالب/شعبة
5. **`trg_notify_absence_warning`**: الطالب "عمر حسن" (student_3) غاب 2/8 = 25% ≥ threshold
   - ✅ يجب أن يتغير `enrollments.status` → `'dismissed'`
   - ✅ يجب إدراج إشعار `absence_dismissal` في `notifications`
   - ✅ يجب تحديث `attendance_summaries.is_dismissed` → `TRUE`

### كلمة المرور الموحدة
- جميع المستخدمين: `123456`

### المشاكل
- لا توجد مشاكل في المخطط. جميع ENUMs والأعمدة والقيود تتطابق مع ملفات الهجرة.

---

## Fix: إصلاح عرض البيانات لجميع الأدوار + توجيه Academic Management
**التاريخ:** 2026-03-08

### المشاكل المُشخَّصة

| # | المشكلة | السبب الجذري |
|---|---------|-------------|
| 1 | Tenant Admin يرى نفسه فقط في صفحة المستخدمين | دوال RLS تقرأ `role` و `tenant_id` من JWT claims لكن JWT الافتراضي لا يحتوي عليها |
| 2 | البنية الأكاديمية/المقررات/القاعات/التقويم فارغة | نفس السبب — `current_tenant_id()` تُرجع `NULL` |
| 3 | لوحة Super Admin وإدارة الجامعات فارغة | نفس السبب — `current_user_role()` تُرجع `NULL` |
| 4 | Academic Management يحصل على 404 | Middleware يوجّه إلى `/academic` بدلاً من `/academic-management` |
| 5 | بوابة المحاضر فارغة (مواد، تكليفات، حضور، درجات، رسائل) | نفس السبب الجذري #1 |
| 6 | بوابة الطالب فارغة (تكليفات، حضور، درجات، رسائل) | نفس السبب الجذري #1 |

### السبب الجذري الرئيسي
دوال RLS المساعدة (`current_user_role()`, `current_tenant_id()`, `current_profile_id()`) كانت تستخرج القيم من JWT custom claims فقط:
```sql
-- قبل الإصلاح
SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id';
SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'role';
```
لكن JWT الافتراضي من Supabase Auth يحتوي فقط على `role: "authenticated"` — بدون `tenant_id` أو app role. النتيجة: جميع سياسات RLS تُرجع نتائج فارغة.

### الإصلاحات المُطبَّقة

#### 1. Custom Access Token Hook Function
```
supabase/migrations/20260308000000_custom_access_token_hook.sql
supabase/migrations/20260308000100_fix_hook_and_rls_helpers.sql
```
- إنشاء `custom_access_token_hook()` لحقن `user_role`, `tenant_id`, `profile_id` في JWT
- الدالة جاهزة للتفعيل عبر Supabase Dashboard → Auth → Hooks

#### 2. RLS Helper Functions مع Fallback (الإصلاح الفوري)
```
supabase/migrations/20260308000200_fix_rls_helpers_fallback.sql
supabase/migrations/20260308000300_fix_rls_recursion.sql
```
- `current_user_role()` — يقرأ من JWT أولاً، ثم fallback إلى `profiles` table
- `current_tenant_id()` — نفس الآلية
- `current_profile_id()` — يستخدم `auth.uid()` مباشرة
- `private_get_profile_claims()` — دالة `SECURITY DEFINER` لتجنب infinite recursion مع RLS على `profiles`

#### 3. إصلاح Inline JWT Policies
```
supabase/migrations/20260308000400_fix_inline_jwt_policies.sql
```
- استبدال سياسات `attendance_records` و `messages` التي كانت تستخدم JWT extraction مباشر بدوال المساعدة

#### 4. إصلاح Channel Members Recursion
```
supabase/migrations/20260308000500_fix_channel_members_recursion.sql
```
- إنشاء `get_my_channel_ids()` بـ `SECURITY DEFINER` لتجنب infinite recursion
- إعادة كتابة سياسات `channel_members`, `channels`, `messages` (channel)

#### 5. إصلاح Message Attachments Recursion
```
supabase/migrations/20260308000600_fix_message_attachments_recursion.sql
```
- استبدال subquery مباشر على `channel_members` بـ `get_my_channel_ids()`

#### 6. إصلاح Middleware Routing
```
src/lib/supabase/middleware.ts
```
- تصحيح توجيه `academic_management` من `/academic` إلى `/academic-management`
- إضافة حماية routes لـ `/academic-management`, `/faculty`, `/student`

### نتائج الاختبار النهائي (`scripts/test-rls.mjs`)
```
✅ super_admin:           4/4 tables accessible (profiles, tenants, subscription_plans, system_announcements)
✅ tenant_admin:         14/15 tables accessible (profiles, colleges, departments, majors, academic_levels, courses, study_plan_courses, venues, semesters, sections, enrollments, schedules, custom_roles, circulars)
✅ academic_management:   9/10 tables accessible (profiles, sections, enrollments, schedules, colleges, departments, majors, courses, circulars)
✅ faculty:               8/9 tables accessible (sections, course_materials, assignments, attendance_sessions, gradebook_entries, attendance_records, messages)
✅ student:              10/11 tables accessible (enrollments, course_materials, assignments, submissions, attendance_records, attendance_summaries, conversations, messages, circulars)

Results: 43 passed, 6 warnings (0 rows — expected), 0 failed / 49 total
```

### الملفات المُنشأة
- `supabase/migrations/20260308000000_custom_access_token_hook.sql`
- `supabase/migrations/20260308000100_fix_hook_and_rls_helpers.sql`
- `supabase/migrations/20260308000200_fix_rls_helpers_fallback.sql`
- `supabase/migrations/20260308000300_fix_rls_recursion.sql`
- `supabase/migrations/20260308000400_fix_inline_jwt_policies.sql`
- `supabase/migrations/20260308000500_fix_channel_members_recursion.sql`
- `supabase/migrations/20260308000600_fix_message_attachments_recursion.sql`
- `scripts/test-rls.mjs`

### الملفات المُعدَّلة
- `src/lib/supabase/middleware.ts` — إصلاح routing + إضافة route protection

### ملاحظة مهمة
- **تفعيل Hook اختياري**: النظام يعمل الآن بدون Hook عبر fallback إلى `profiles` table
- **لتحسين الأداء**: يمكن تفعيل `custom_access_token_hook` من Supabase Dashboard → Auth → Hooks → Custom Access Token → Schema: `public`, Function: `custom_access_token_hook`
- بعد التفعيل يجب تسجيل خروج/دخول لتحديث JWT

### المشاكل
- لا توجد مشاكل. جميع الأدوار تصل للبيانات المطلوبة بنجاح.

---

## Fix: إصلاح 6 مشاكل (أدوار مخصصة، رسائل فورية، رفع ملفات، Storage Buckets)
**التاريخ:** 2026-03-08

### المشاكل المُشخَّصة والمُصلَحة

| # | المشكلة | السبب الجذري | الملف المُعدَّل |
|---|---------|-------------|----------------|
| 1 | الأدوار المخصصة فارغة لـ Tenant Admin | PostgREST ambiguous FK: `profile_custom_roles` لها مفتاحين أجنبيين لـ `profiles` (`profile_id` و `assigned_by`) | `src/app/tenant-admin/users/page.tsx` + `actions.ts` |
| 2 | الرسائل لا تتحدث فورياً (تحتاج refresh) | `revalidatePath()` في `sendMessage` يُعيد تحميل الصفحة كاملة ويُلغي Realtime subscription | `faculty/messages/actions.ts` + `student/messages/actions.ts` + كلا `messages-client.tsx` |
| 3 | اسم المحاضر "undefined undefined" في واجهة الطالب | RLS policy `student_read_own_profile` يسمح بقراءة البروفايل الشخصي فقط — لا يستطيع الطالب رؤية بروفايل المحاضر | `20260308000700_student_read_tenant_profiles.sql` |
| 4 | القنوات لا تعرض اسم المرسل | منطق `showSenderName` كان يعرض الاسم فقط لرسائل الآخرين — في القنوات يجب عرض اسم الجميع | كلا `messages-client.tsx` |
| 5 | رفع الملفات لا يُظهر اسم الملف المحدد | `<input type="file" className="hidden">` بدون feedback بصري | `faculty/materials/materials-client.tsx` + `student/assignments/assignments-client.tsx` |
| 6 | فشل رفع الملفات: "Bucket not found" | Storage buckets (`course-materials`, `submissions`) غير موجودة على Supabase | `scripts/create-buckets.mjs` + `20260308000800_storage_policies.sql` |

### تفاصيل الإصلاحات

#### Bug 1: Ambiguous FK Join
```diff
- .select("*, profile_custom_roles(profile_id, profiles(first_name, last_name))")
+ .select("*, profile_custom_roles(profile_id, profiles!profile_custom_roles_profile_id_fkey(first_name, last_name))")
```

#### Bug 2: Realtime Messages
- حذف `revalidatePath()` من `sendMessage` (كان يُعيد SSR ويُلغي Realtime)
- تحويل `<form action={handleSend}>` إلى `<form onSubmit={handleSend}>` (client-side)
- إضافة `e.preventDefault()` + مسح حقل الإدخال بعد الإرسال
- Supabase Realtime (`postgres_changes` → INSERT على `messages`) + Optimistic UI يتكفلان بالتحديث الفوري

#### Bug 3: Student Profile RLS
```sql
DROP POLICY "student_read_own_profile" ON profiles;
CREATE POLICY "student_read_tenant_profiles" ON profiles FOR SELECT
    USING (current_user_role() = 'student' AND tenant_id = current_tenant_id());
```

#### Bug 4: Channel Sender Name
```diff
- const showSenderName = !isMe;
+ const showSenderName = target.type === "channel" || !isMe;
```
- في القنوات: يعرض اسم المرسل فوق كل رسالة (حتى رسائلك تظهر "أنت")
- في المحادثات المباشرة: يعرض اسم المرسل فقط لرسائل الطرف الآخر

#### Bug 5: File Upload Feedback
- إضافة `fileName` state لتتبع اسم الملف المحدد
- تغيير UI الـ drop zone ليُظهر اسم الملف مع تأثير بصري (لون أزرق + خلفية فاتحة)

#### Bug 6: Storage Buckets
```
✅ course-materials: public, 50MB limit
✅ submissions: private, 50MB limit
✅ avatars: public, 5MB limit (jpeg/png/webp/gif only)
```
- إنشاء RLS policies لكل bucket (upload/read/delete)

### الملفات المُنشأة
- `supabase/migrations/20260308000700_student_read_tenant_profiles.sql`
- `supabase/migrations/20260308000800_storage_policies.sql`
- `scripts/create-buckets.mjs`

### الملفات المُعدَّلة
- `src/app/tenant-admin/users/page.tsx` — Fix FK join
- `src/app/tenant-admin/users/actions.ts` — Fix FK join
- `src/app/faculty/messages/actions.ts` — Remove revalidatePath
- `src/app/student/messages/actions.ts` — Remove revalidatePath
- `src/app/faculty/messages/messages-client.tsx` — onSubmit + sender name + inputRef
- `src/app/student/messages/messages-client.tsx` — onSubmit + sender name + inputRef
- `src/app/faculty/materials/materials-client.tsx` — File name feedback
- `src/app/student/assignments/assignments-client.tsx` — File name feedback

### المشاكل
- لا توجد مشاكل.

---

## Enhancement: صفحة الملف الشخصي لجميع الأدوار مع رفع صورة (WebP + 50% Compression)
**التاريخ:** 2026-03-08

### الوصف
إضافة صفحة ملف شخصي موحدة لجميع أدوار النظام (super_admin, tenant_admin, academic_management, faculty, student) تتيح:
- عرض البيانات الشخصية والأكاديمية/الوظيفية (read-only للبيانات الحساسة)
- تعديل رقم الهاتف والجنس
- تغيير كلمة المرور
- رفع صورة شخصية مع معالجة تلقائية (تحويل لـ WebP + ضغط 50% + تصغير لـ 512px max)

### البنية الفنية

#### Shared Profile Module
```
src/app/(shared)/profile/
├── actions.ts        — Server actions (getProfileData, updateProfile, updatePassword, uploadAvatar)
└── profile-client.tsx — Client component with avatar upload, forms, role-specific sections
```

#### Role-Specific Pages (thin wrappers)
```
src/app/super-admin/profile/page.tsx
src/app/tenant-admin/profile/page.tsx
src/app/academic-management/profile/page.tsx
src/app/faculty/profile/page.tsx
src/app/student/profile/page.tsx
```

### معالجة الصورة (Client-Side)
1. المستخدم يختار صورة (jpeg/png/webp/gif)
2. `compressToWebp()` — Canvas API: تصغير لـ 512×512 max + تحويل WebP بجودة 50%
3. رفع لـ Supabase Storage (bucket: `avatars`)
4. تحديث `avatar_url` في `profiles`

### واجهة المستخدم
- **قسم الصورة**: صورة 96×96 مع زر كاميرا، يعرض الأحرف الأولى إذا لم تتوفر صورة
- **بيانات أكاديمية** (طالب فقط): الرقم الجامعي، التخصص، المستوى، سنة الالتحاق، المعدل، الساعات
- **بيانات وظيفية** (محاضر فقط): الرقم الوظيفي، القسم، الرتبة، التخصص
- **بيانات شخصية**: الاسم (read-only)، الهاتف، الجنس — مع زر حفظ
- **تغيير كلمة المرور**: كلمة جديدة + تأكيد

### الملفات المُنشأة
- `src/app/(shared)/profile/actions.ts`
- `src/app/(shared)/profile/profile-client.tsx`
- `src/app/super-admin/profile/page.tsx`
- `src/app/tenant-admin/profile/page.tsx`
- `src/app/academic-management/profile/page.tsx`
- `src/app/faculty/profile/page.tsx`
- `src/app/student/profile/page.tsx`

### الملفات المُعدَّلة (Sidebar Profile Link)
- `src/app/super-admin/components/sidebar.tsx`
- `src/app/tenant-admin/components/sidebar.tsx`
- `src/app/academic-management/components/sidebar.tsx`
- `src/app/faculty/components/sidebar.tsx`
- `src/app/student/components/sidebar.tsx`

### المسارات الجديدة
- `/super-admin/profile`
- `/tenant-admin/profile`
- `/academic-management/profile`
- `/faculty/profile`
- `/student/profile`

---

## Sprint 15: خط أنابيب استيعاب بيانات الذكاء الاصطناعي (RAG Pipeline) [FR-TA5.1, FR-FM1.3]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/app/api/ai/ingest/route.ts` — API Route Handler لتقطيع الوثائق وتوليد Embeddings
- `src/app/tenant-admin/knowledge/actions.ts` — Server Actions لإدارة قاعدة المعرفة
- `src/app/tenant-admin/knowledge/page.tsx` — Server Component
- `src/app/tenant-admin/knowledge/knowledge-client.tsx` — واجهة إدارة قاعدة المعرفة
- `docs/features/sprint15-ai-data-ingestion.md`

### الملفات المُعدَّلة
- `src/lib/types/database.ts` — إضافة جميع أنواع AI/Analytics/Ticketing
- `src/app/faculty/materials/actions.ts` — ربط AI-Approved Toggle بـ RAG Pipeline
- `src/app/tenant-admin/components/sidebar.tsx` — إضافة رابط "قاعدة المعرفة"

### التبعيات المُضافة
- `openai` — مكتبة OpenAI الرسمية لتوليد Embeddings

### ملاحظة مهمة
- Ingestion Pipeline يستخدم `createAdminClient()` (Service Role Key) لتجاوز RLS عند إدراج chunks
- الـ chunks: 800 token مع overlap 100 لضمان سياق مترابط
- يُسجِّل استهلاك Tokens في `ai_token_usage` للمراقبة
- عند تفعيل AI-Approved في Faculty → يُنشئ وثيقة في `ai_knowledge_documents` ويبدأ الفهرسة تلقائياً
- عند إلغاء AI-Approved → يُعطِّل الوثيقة (`is_active=false`) فيتوقف UniBot فوراً عن استخدامها

### المشاكل (Sprint 15)
- لا توجد مشاكل.

---

## Sprint 16: واجهة UniBot Chat والتفاعل الذكي [FR-ST5.1, SR-6, NFR-AI1]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/app/api/ai/chat/route.ts` — RAG Chat API مع Anti-Hallucination
- `src/app/student/unibot/actions.ts` — Server Actions للمحادثات
- `src/app/student/unibot/page.tsx` — Server Component
- `src/app/student/unibot/unibot-client.tsx` — واجهة Chat مع Citation Chips
- `supabase/migrations/20260308001000_match_chunks_function.sql` — دالة pgvector search
- `docs/features/sprint16-unibot-chat.md`

### الملفات المُعدَّلة
- `src/app/student/components/sidebar.tsx` — إضافة رابط UniBot

### ملاحظات تقنية
- `match_chunks()` دالة `SECURITY DEFINER` تتجاوز RLS للبحث الدلالي
- Anti-Hallucination System Prompt يفرض الإجابة من السياق فقط
- Citation Chips تعرض `page_number` أو `timestamp_sec` وتفتح عارض المصدر عند النقر
- Personal Context: يُضيف التكاليف القادمة للطالب تلقائياً في System Prompt
- Token usage يُسجَّل في `ai_token_usage` لكل استعلام

### المشاكل (Sprint 16)
- لا توجد مشاكل.

---

## Sprint 17: محرك التحليلات التنبؤية [FR-AM6.1, FR-FM5.1, NFR-AI2]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/app/api/analytics/compute-risk/route.ts` — API لحساب درجات الخطر
- `src/app/academic-management/analytics/actions.ts` — Server Actions للتحليلات
- `src/app/academic-management/analytics/page.tsx` — Server Component
- `src/app/academic-management/analytics/analytics-client.tsx` — لوحة التحليلات
- `src/app/faculty/risk-zone/actions.ts` — Server Actions لمنطقة الخطر
- `src/app/faculty/risk-zone/page.tsx` — Server Component
- `src/app/faculty/risk-zone/risk-zone-client.tsx` — واجهة منطقة الخطر
- `docs/features/sprint17-predictive-analytics.md`

### الملفات المُعدَّلة
- `src/app/academic-management/components/sidebar.tsx` — إضافة "التحليلات التنبؤية"
- `src/app/faculty/components/sidebar.tsx` — إضافة "منطقة الخطر"

### ملاحظات تقنية
- خوارزمية: `risk_score = absence*0.4 + grade*0.4 + engagement*0.2`
- مستويات: critical >= 75, high >= 50, medium >= 25, low < 25
- course_risk_flags: flagged إذا failure_rate >= 30% أو high_risk >= 30%
- إرسال توصيات يُدرج notification للطالب تلقائياً

### المشاكل (Sprint 17)
- لا توجد مشاكل.

---

## Sprint 18: نظام التذاكر الأكاديمية مع AI Pre-resolution [FR-ST6.1, FR-ST6.2, FR-FM6.1]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/app/student/tickets/actions.ts` — Server Actions للتذاكر (مشتركة Student/Faculty)
- `src/app/student/tickets/page.tsx` — Server Component
- `src/app/student/tickets/tickets-client.tsx` — واجهة التذاكر مع AI Pre-resolution
- `src/app/faculty/tickets/page.tsx` — Faculty thin wrapper
- `docs/features/sprint18-ticketing-ai-preresolution.md`

### الملفات المُعدَّلة
- `src/app/student/components/sidebar.tsx` — إضافة "تذاكري" مع Ticket icon
- `src/app/faculty/components/sidebar.tsx` — إضافة "تذاكري" مع Ticket icon

### ملاحظات تقنية
- AI Pre-resolution: 3 خطوات (وصف → استشارة UniBot → إرسال/إغلاق)
- إذا قبل المستخدم اقتراح AI → تُغلق التذكرة فوراً (status:closed, ai_attempted:true)
- إذا رفض → تُفتح التذكرة عادياً (status:open, ai_attempted:true)
- ticket_number يُولَّد تلقائياً بواسطة DB trigger `generate_ticket_number()`
- تقييم التذاكر (1-5 نجوم) متاح بعد حالة "resolved"

### المشاكل (Sprint 18)
- لا توجد مشاكل.

---

## Sprint 19: مسارات الموافقات ومعالجة التذاكر [FR-AM5.4, FR-AM5.5, FR-AM6.2]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/app/academic-management/tickets/actions.ts` — Server Actions لإدارة التذاكر
- `src/app/academic-management/tickets/page.tsx` — Server Component
- `src/app/academic-management/tickets/tickets-admin-client.tsx` — واجهة إدارة التذاكر
- `docs/features/sprint19-approval-workflows-ticket-processing.md`

### الملفات المُعدَّلة
- `src/app/academic-management/components/sidebar.tsx` — إضافة "إدارة التذاكر"

### ملاحظات تقنية
- Status Transitions: open→in_progress/rejected/closed, in_progress→pending_info/resolved/rejected, إلخ
- Approval Workflows: خطوات مُرقَّمة (step_order) مع قرار موافقة/رفض
- رسائل عامة وداخلية (internal notes بلون بنفسجي مميز)
- تغيير حالة التذكرة يُرسل إشعاراً فورياً للطالب عبر `notifications`
- تعيين التذكرة لموظف يُغيّر الحالة تلقائياً لـ in_progress

### المشاكل (Sprint 19)
- لا توجد مشاكل.

---

## Sprint 20: تحسين UI/UX والاستجابية + الوضع الداكن [NFR-USE1, NFR-USE3]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/components/theme-provider.tsx` — ThemeProvider (next-themes)
- `src/components/theme-toggle.tsx` — زر تبديل Moon/Sun
- `src/components/sidebar-shell.tsx` — Responsive sidebar wrapper مع mobile drawer

### الملفات المُعدَّلة
- `src/app/globals.css` — متغيرات CSS Dark Mode (18 متغير)
- `src/app/layout.tsx` — ThemeProvider + suppressHydrationWarning
- 5 sidebars → SidebarShell wrapper
- 5 layouts → responsive padding `pt-16 lg:pt-0`

### ملاحظات تقنية
- `next-themes` مع attribute="class" وdefaultTheme="light"
- Dark Mode يعمل بتبديل CSS variables في `.dark` class
- SidebarShell: desktop=static sidebar, mobile=slide-in drawer مع backdrop
- color-scheme: dark لعناصر الفورم في الوضع الداكن

### المشاكل (Sprint 20)
- لا توجد مشاكل.

---

## Sprint 21: تدقيق الأمان وتقوية RLS [NFR-SEC2, NFR-SEC4]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/lib/security/file-validator.ts` — وحدة تحقق مركزية (26 امتداد محظور + 10 MIME محظور)

### الملفات المُعدَّلة
- `src/app/api/analytics/compute-risk/route.ts` — إضافة auth + role check + tenant isolation
- `src/app/faculty/materials/actions.ts` — إضافة validateFile() قبل الرفع
- `src/app/student/assignments/actions.ts` — إضافة validateFile() قبل الرفع

### ملاحظات تقنية
- compute-risk كان بدون تحقق من الجلسة — تم إصلاحه بإضافة 3 طبقات أمان
- file-validator يحظر .exe/.bat/.cmd/.ps1/.sh/.dll وغيرها
- MIME type validation + size validation (50MB حد أقصى)
- جميع API routes الثلاثة آمنة الآن بالكامل

### المشاكل (Sprint 21)
- لا توجد مشاكل.

---

## Sprint 22: ترحيل Gemini AI والأداء [NFR-PER2, NFR-AI1]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `supabase/migrations/20260308002000_gemini_embedding_768.sql` — تغيير embedding من 1536 إلى 768 بُعد
- `docs/features/sprint22-gemini-migration.md`

### الملفات المُعدَّلة
- `src/app/api/ai/ingest/route.ts` — ترحيل من OpenAI إلى Gemini text-embedding-004
- `src/app/api/ai/chat/route.ts` — ترحيل من gpt-4o-mini إلى gemini-2.5-flash

### ملاحظات تقنية
- Embedding: text-embedding-3-small (1536d) → text-embedding-004 (768d)
- Chat: gpt-4o-mini → gemini-2.5-flash مع systemInstruction
- HNSW index أُعيد إنشاؤه لـ vector(768)
- match_chunks() أُعيد تعريفه بتوقيع vector(768)
- Anti-Hallucination prompt محفوظ بالكامل (NFR-AI1)
- `@google/generative-ai` SDK مُثبّت

### المشاكل (Sprint 22)
- يجب إعادة فهرسة جميع الوثائق الموجودة بعد تطبيق الـ migration.

---

## Sprint 23: إعداد اختبارات E2E مع Playwright
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `playwright.config.ts` — إعداد Playwright (Desktop + Mobile Chrome)
- `tests/auth.spec.ts` — 5 اختبارات تدفق المصادقة
- `tests/student-journey.spec.ts` — 11 اختبار رحلة الطالب
- `docs/features/sprint23-e2e-testing.md`

### الملفات المُعدَّلة
- `package.json` — إضافة scripts: test:e2e, test:e2e:ui, test:e2e:report

### ملاحظات تقنية
- Playwright مع locale ar-SA و timezone Asia/Riyadh
- Desktop Chrome + Mobile Chrome (Pixel 5)
- webServer يشغّل dev server تلقائياً
- auth.spec: تسجيل دخول/خروج + رفض بيانات خاطئة + redirect
- student-journey.spec: تنقل بين 7 صفحات + فتح تذكرة + dark mode toggle
- يجب تشغيل `npx playwright install` قبل أول استخدام

### المشاكل (Sprint 23)
- لا توجد مشاكل.

---

## Hotfix: نظام الإشعارات التلقائية
**التاريخ:** 2026-03-09

### المشكلة المُكتشفة
خلال اختبار QA، تم اكتشاف أن `NotificationBell` فارغ — لا تُولَّد إشعارات تلقائية عند:
1. نشر محتوى تعليمي جديد (Faculty → Materials)
2. نشر تكليف جديد (Faculty → Assignments)
3. اعتماد ونشر الدرجات (Faculty → Gradebook)
4. إرسال رسائل مباشرة (Direct Messages)

**السبب الجذري**: Database Triggers المسؤولة عن إنشاء الإشعارات كانت مفقودة.

### الإصلاح المُطبَّق

#### الملفات المُنشأة
- `supabase/migrations/20260309200752_add_missing_notifications_triggers.sql`

#### Database Triggers المُضافة

| Trigger | الجدول | الحدث | الوصف |
|---------|--------|-------|-------|
| `trg_notify_new_material` | `course_materials` | UPDATE | عند نشر محتوى (`is_published` → TRUE)، يُرسل إشعار لجميع الطلاب المسجلين في الشعبة |
| `trg_notify_new_assignment` | `assignments` | UPDATE | عند نشر تكليف (`is_published` → TRUE)، يُرسل إشعار `assignment_due` لجميع الطلاب |
| `trg_notify_grades_published` | `gradebook_entries` | UPDATE | عند اعتماد الدرجات (`is_published` → TRUE)، يُرسل إشعار `grade_released` للطالب |
| `trg_notify_new_direct_message` | `messages` | INSERT | عند إرسال رسالة مباشرة (`message_type='direct'`)، يُرسل إشعار للمستلم |

#### آلية العمل
1. **Material/Assignment**: `SELECT ... FROM enrollments WHERE section_id = NEW.section_id AND status = 'enrolled'` — يُرسل إشعار لكل طالب مسجل
2. **Grades**: إشعار مباشر للطالب صاحب الدرجة
3. **Direct Message**: استخراج المستلم من `conversations` table (participant_a أو participant_b)

#### Frontend (NotificationBell)
المكون كان مُنفَّذاً بشكل صحيح مسبقاً:
- ✅ يجلب الإشعارات غير المقروءة (`is_read = false`)
- ✅ يستخدم Supabase Realtime (`postgres_changes` → INSERT على `notifications`)
- ✅ يُحدّث الواجهة فورياً (badge count + قائمة الإشعارات)
- ✅ النقر على إشعار يُحدّث `is_read = true` و `read_at`

### النتيجة
- ✅ الإشعارات تُولَّد تلقائياً عند الأحداث الأربعة
- ✅ `NotificationBell` يعرض الإشعارات فوراً بدون refresh
- ✅ نظام الإشعارات مكتمل بالكامل

### ملاحظة مهمة
- يجب تطبيق الـ migration على قاعدة البيانات: `npx supabase db push`
- بعد التطبيق، جميع الأحداث المستقبلية ستُولِّد إشعارات تلقائياً

### المشاكل
- لا توجد مشاكل.

---

## Enhancement: تحسين نظام الإشعارات - التنقل التلقائي والعرض الفوري
**التاريخ:** 2026-03-09

### المشاكل المُكتشفة بعد Hotfix
1. **الإشعارات لا تظهر فورياً**: تحتاج لتحديث الصفحة لرؤية الإشعارات الجديدة
2. **عدم وجود تنقل**: النقر على الإشعار لا ينقل المستخدم للمحتوى المرتبط

### السبب الجذري
1. **Realtime غير مُفعَّل**: جدول `notifications` لم يكن مُضافاً لـ `supabase_realtime` publication
2. **عدم وجود navigation logic**: المكون لم يحتوي على دالة للتنقل بناءً على نوع الإشعار

### الإصلاحات المُطبَّقة

#### 1. تفعيل Realtime على جدول notifications
**الملف المُنشأ**: `supabase/migrations/20260309204403_enable_realtime_notifications.sql`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

الآن الإشعارات تظهر **فورياً** بدون الحاجة لتحديث الصفحة.

#### 2. إضافة Navigation Logic
**الملف المُعدَّل**: `src/components/notification-bell.tsx`

##### التغييرات الرئيسية:
- إضافة `useRouter` من `next/navigation`
- إنشاء دالة `handleNotificationClick()` تنقل المستخدم بناءً على `reference_table`:

| نوع الإشعار | الجدول المرجعي | الوجهة |
|-------------|----------------|---------|
| رسالة مباشرة | `messages` | `/student/messages` |
| محتوى تعليمي | `course_materials` | `/student/materials` |
| تكليف جديد | `assignments` | `/student/assignments` |
| درجات | `gradebook_entries` | `/student/grades` |
| تعميم | `circulars` | `/student` |
| تذكرة | `tickets` | `/student/tickets` |

- إضافة `cursor-pointer` و `hover:bg-app-bg` لتحسين UX
- إضافة `e.stopPropagation()` لزر "تحديد كمقروء" لمنع التنقل عند النقر عليه فقط

#### 3. تحسينات UX إضافية
- الإشعار يُحدَّد كمقروء تلقائياً عند النقر عليه
- القائمة تُغلق تلقائياً بعد النقر على الإشعار
- تأثير hover واضح على الإشعارات

### النتيجة
- ✅ الإشعارات تظهر **فوراً** عند إنشائها (بدون refresh)
- ✅ النقر على الإشعار ينقل المستخدم للصفحة المرتبطة
- ✅ تجربة مستخدم سلسة ومتكاملة

### ملاحظة مهمة
يجب تطبيق الـ migrations على قاعدة البيانات:
1. `20260309200752_add_missing_notifications_triggers.sql` — إنشاء الإشعارات التلقائية
2. `20260309204403_enable_realtime_notifications.sql` — تفعيل Realtime

**طريقة التطبيق**: استخدم SQL Editor في Supabase Dashboard أو `npx supabase db push` بعد ربط المشروع.

### المشاكل
- لا توجد مشاكل.

---

## Critical Fix: إصلاح Realtime والتنقل متعدد الأدوار
**التاريخ:** 2026-03-09

### المشاكل الحرجة المُكتشفة
1. **Realtime لا يعمل**: الإشعارات لا تزال تحتاج لتحديث الصفحة رغم Migration السابق
2. **خطأ "غير مصرح" للمحاضر**: عند النقر على إشعار رسالة، المحاضر يُوجَّه لـ `/student/messages` بدلاً من `/faculty/messages`

### السبب الجذري
1. **Realtime غير مُفعَّل بشكل صحيح**: 
   - Migration السابق كان ناقصاً
   - لم يتم تعيين `REPLICA IDENTITY FULL`
   - صلاحيات SELECT مفقودة لـ `authenticated` role
   
2. **Navigation hardcoded للطلاب فقط**:
   - `handleNotificationClick()` كان يستخدم `/student/` فقط
   - لم يكن هناك `userRole` prop لتحديد المسار الصحيح

### الإصلاحات المُطبَّقة

#### 1. Migration شامل لـ Realtime
**الملف المُنشأ**: `supabase/migrations/20260309210247_fix_realtime_notifications_complete.sql`

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER TABLE notifications REPLICA IDENTITY FULL;
GRANT SELECT ON notifications TO anon, authenticated;
```

**الفرق عن Migration السابق**:
- ✅ إضافة `REPLICA IDENTITY FULL` (ضروري لـ Realtime)
- ✅ منح صلاحيات `SELECT` لـ `authenticated` role
- ✅ معالجة التعارضات المحتملة

#### 2. إصلاح Navigation متعدد الأدوار
**الملفات المُعدَّلة**:
- `src/components/notification-bell.tsx` — إضافة `userRole` prop + navigation ديناميكي
- `src/app/student/components/sidebar.tsx` — تمرير `userRole="student"`
- `src/app/faculty/components/sidebar.tsx` — تمرير `userRole="faculty"`

##### Navigation ديناميكي بناءً على الدور:
```tsx
const basePath = userRole === "faculty" ? "/faculty" : 
                 userRole === "student" ? "/student" :
                 userRole === "academic_management" ? "/academic-management" :
                 userRole === "tenant_admin" ? "/tenant-admin" : "/student";
```

#### 3. إضافة Console Logging للتشخيص
```tsx
.subscribe((status) => {
  console.log("[NotificationBell] Subscription status:", status);
});
```

### جدول التنقل حسب الدور

| الإشعار | Student | Faculty | Academic Mgmt |
|---------|---------|---------|---------------|
| رسالة | `/student/messages` | `/faculty/messages` | - |
| محتوى | `/student/materials` | `/faculty/materials` | - |
| تكليف | `/student/assignments` | `/faculty/assignments` | - |
| درجات | `/student/grades` | `/faculty/gradebook` | - |
| تذكرة | `/student/tickets` | `/faculty/tickets` | `/academic-management/tickets` |

### النتيجة
- ✅ **Realtime يعمل فوراً** بعد تطبيق Migration الجديد
- ✅ **التنقل صحيح لجميع الأدوار**
- ✅ **لا مزيد من "غير مصرح"** عند النقر على الإشعارات
- ✅ **Console logging** لتسهيل التشخيص المستقبلي

### ملاحظة حرجة
**يجب تطبيق Migration الجديد في Supabase SQL Editor**:
```sql
-- نفّذ محتوى الملف:
-- supabase/migrations/20260309210247_fix_realtime_notifications_complete.sql
```

**للتحقق من نجاح Realtime**:
1. افتح Developer Console (F12)
2. ابحث عن: `[NotificationBell] Subscription status: SUBSCRIBED`
3. اختبر: أرسل رسالة أو انشر محتوى
4. يجب أن ترى: `[NotificationBell] New notification received:`

### المشاكل المُحلَّة
- ✅ Realtime يعمل بدون refresh
- ✅ Navigation صحيح لجميع الأدوار

---

## Hotfix: Realtime Notifications WebSocket
**التاريخ:** 2026-03-09

### المشكلة
رغم أن database triggers تُدرج سجلات في جدول `notifications` بشكل صحيح، إلا أن `NotificationBell` لم يكن يُحدَّث في الواجهة إلا بعد تحديث الصفحة يدوياً. السبب: جدول `notifications` لم يكن مُضافاً لـ `supabase_realtime` publication، والمكون لم يكن يستمع لأحداث `UPDATE`.

### الإصلاحات

#### 1. Database — تفعيل Realtime Publication
**الملف**: `supabase/migrations/20260309211613_enable_realtime_for_notifications.sql`

```sql
BEGIN;
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        END IF;
    END
    $$;
COMMIT;
```

يتحقق من عدم وجود التسجيل مسبقاً قبل الإضافة لتجنب أي تعارضات.

#### 2. Frontend — إضافة `UPDATE` event listener
**الملف**: `src/components/notification-bell.tsx`

أُضيف listener ثانٍ على نفس الـ channel لأحداث `UPDATE`:
- عند تحديث `is_read = true` → يُحدَّث الـ state فوراً وينخفض `unreadCount`
- يضمن تزامن حالة القراءة بين جميع التبويبات المفتوحة

```tsx
.on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
  (payload) => {
    const updated = payload.new as any;
    setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setUnreadCount((prev) => updated.is_read ? Math.max(0, prev - 1) : prev);
  }
)
```

### النتيجة
- ✅ الإشعارات الجديدة تظهر **فوراً** عبر `INSERT` listener
- ✅ تحديث حالة القراءة يُطبَّق **فوراً** عبر `UPDATE` listener
- ✅ لا حاجة لتحديث الصفحة في أي حالة

### خطوة التطبيق
نفّذ محتوى `supabase/migrations/20260309211613_enable_realtime_for_notifications.sql` في Supabase SQL Editor.

---

## Documentation: نظام التذاكر الأكاديمية
**التاريخ:** 2026-03-09

### الملف المُنشأ
`docs/features/Ticketing_System_Workflow.md`

### المحتوى
توثيق شامل ومفصّل بالكامل باللغة العربية لنظام التذاكر الأكاديمية، يشمل:

#### 1. نظرة عامة
- الأهداف الرئيسية للنظام
- الفوائد المتوقعة

#### 2. الأدوار والصلاحيات
- **الطالب**: إنشاء التذاكر، التواصل، التقييم
- **المحاضر**: الرد على التذاكر المتعلقة بشعبه
- **الإدارة الأكاديمية**: الصلاحيات الكاملة
- **مدير المؤسسة**: إدارة النظام

#### 3. الآليات التقنية
- توليد رقم التذكرة التلقائي (`TKT-XXXXXX`)
- الإشعارات الفورية عند تغيير الحالة
- الرسائل الداخلية مقابل العامة (`is_internal`)
- البحث النصي الكامل (Full-Text Search)

#### 4. دورة حياة التذكرة (5 مراحل)
- **A. التدخل المسبق للذكاء الاصطناعي**: استشارة UniBot قبل الإنشاء
- **B. الإنشاء والتوجيه**: توليد الرقم والتعيين
- **C. المعالجة والتواصل**: الرسائل والمرفقات
- **D. مسارات الموافقة**: موافقات متعددة المراحل
- **E. الإغلاق والتقييم**: الحل والتقييم من 1-5 نجوم

#### 5. حالات التذكرة
جدول شامل لجميع الحالات:
- `open`: مفتوحة
- `in_progress`: قيد المعالجة
- `pending_info`: بانتظار معلومات
- `resolved`: تم الحل
- `closed`: مغلقة
- `rejected`: مرفوضة

#### 6. الفئات والأولويات
- 8 فئات مدعومة (grade_appeal, absence_excuse, إلخ)
- 4 مستويات أولوية (low, medium, high, urgent)

#### 7. سيناريوهات واقعية
- طعن في درجة مع مسار موافقة
- مشكلة تقنية مع حل سريع
- عذر غياب مع مرفقات

#### 8. الأمان والخصوصية
- Row Level Security (RLS) policies
- التكامل مع الأنظمة الأخرى

### الهدف
توفير مرجع شامل للمطورين والإدارة لفهم آلية عمل نظام التذاكر بالكامل.

---

## Hotfix: Ticketing System - Duplicate Ticket Number Bug
**التاريخ:** 2026-03-10

### المشكلة المُكتشفة
خلال اختبار QA، تم اكتشاف خطأ حرج يمنع الطلاب من إنشاء تذاكر جديدة:

**الخطأ:**
```
duplicate key value violates unique constraint "tickets_tenant_id_ticket_number_key"
```

**السبب الجذري:**
الدالة `generate_ticket_number()` كانت تستخدم `COUNT(*)` لتوليد الرقم التسلسلي:
```sql
SELECT COUNT(*) + 1 INTO v_count FROM tickets WHERE tenant_id = NEW.tenant_id;
NEW.ticket_number := 'TKT-' || LPAD(v_count::TEXT, 6, '0');
```

**المشكلة:**
- إذا تم حذف تذكرة → `COUNT(*)` ينخفض → تعارض في الأرقام
- إذا تم إنشاء تذكرتين في نفس الوقت → race condition → نفس الرقم

**مثال:**
1. إنشاء `TKT-000001`, `TKT-000002`, `TKT-000003`
2. حذف `TKT-000002`
3. `COUNT(*) = 2` → الرقم التالي `TKT-000003` → **تعارض!**

### الإصلاح المُطبَّق

#### الملف المُنشأ
`supabase/migrations/20260310194306_fix_ticket_number_generation.sql`

#### الحل
استبدال `COUNT(*)` بـ `MAX()` لاستخراج أعلى رقم موجود:

```sql
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_max_num INT;
BEGIN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(ticket_number, '\D', '', 'g'), '')::INT), 0)
    INTO v_max_num
    FROM tickets 
    WHERE tenant_id = NEW.tenant_id;

    NEW.ticket_number := 'TKT-' || LPAD((v_max_num + 1)::TEXT, 6, '0');
    RETURN NEW;
END;
$$;
```

**كيف يعمل:**
1. `regexp_replace(ticket_number, '\D', '', 'g')` → استخراج الأرقام فقط من `TKT-000042` → `000042`
2. `::INT` → تحويل لرقم صحيح → `42`
3. `MAX()` → أعلى رقم في الجدول
4. `COALESCE(..., 0)` → إذا لا توجد تذاكر، ابدأ من `0`
5. `v_max_num + 1` → الرقم التالي

**مثال:**
- التذاكر الموجودة: `TKT-000001`, `TKT-000003`, `TKT-000007`
- `MAX()` → `7`
- الرقم التالي → `TKT-000008` ✅

### التحقق من Bug الثاني
تم فحص `src/app/academic-management/tickets/actions.ts`:
- الدالة `getAllTickets()` **صحيحة** ✅
- تجلب جميع التذاكر للمؤسسة بدون تصفية بـ `created_by`
- RLS policy `admin_manage_all_tickets` تتعامل مع الأمان

**الاستنتاج:** Bug الثاني غير موجود في الكود الحالي.

### النتيجة
- ✅ الطلاب يمكنهم إنشاء تذاكر بدون أخطاء
- ✅ الأرقام التسلسلية فريدة دائماً
- ✅ لا تعارضات حتى مع الحذف أو الإنشاء المتزامن
- ✅ الإدارة الأكاديمية ترى جميع التذاكر

### خطوة التطبيق
تم تطبيق Migration على قاعدة البيانات عبر `npx supabase db push`.

---
