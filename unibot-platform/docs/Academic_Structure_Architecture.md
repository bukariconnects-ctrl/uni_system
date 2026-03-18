# بنية الهيكل الأكاديمي — UniBot Platform

> **وثيقة معمارية تقنية شاملة** — تم توليدها بناءً على الكود الفعلي للنظام (Reverse-Engineered)

---

## 📋 جدول المحتويات

1. [فلسفة الهيكل الأكاديمي](#1-فلسفة-الهيكل-الأكاديمي)
2. [دورة حياة تهيئة الجامعة](#2-دورة-حياة-تهيئة-الجامعة)
3. [العزل الداخلي والنطاقات](#3-العزل-الداخلي-والنطاقات)
4. [الجداول الذكية ومنع التعارض](#4-الجداول-الذكية-ومنع-التعارض)
5. [تدفق العمل بين المستخدمين](#5-تدفق-العمل-بين-المستخدمين)
6. [الجداول والعلاقات](#6-الجداول-والعلاقات)

---

## 1. فلسفة الهيكل الأكاديمي

### 1.1 التسلسل الهرمي

يتبع UniBot نموذجاً هرمياً صارماً يعكس البنية الأكاديمية الحقيقية للجامعات:

```
Tenant (الجامعة)
  └── College (الكلية)
       └── Department (القسم)
            └── Major (التخصص)
                 └── Academic Level (المستوى الأكاديمي)
                      └── Semester (الفصل الدراسي)
                           └── Course (المقرر)
                                └── Section (الشعبة)
                                     └── Schedule (الجدول الزمني)
```

### 1.2 المبادئ الأساسية

1. **Multi-Tenancy الصارم**: كل جامعة (`tenant`) معزولة تماماً عن الأخرى عبر `tenant_id`
2. **Hierarchical Integrity**: لا يمكن إنشاء مستوى دون وجود المستوى الأعلى منه
3. **Cascade Deletion**: حذف عنصر يحذف جميع العناصر التابعة له (مثال: حذف قسم يحذف جميع تخصصاته)
4. **Role-Based Isolation**: العزل لا يقتصر على الجامعات، بل يمتد داخل الجامعة الواحدة (Intra-Tenant Isolation)

---

## 2. دورة حياة تهيئة الجامعة

### 2.1 الخطوات التفصيلية (من منظور `tenant_admin`)

#### **المرحلة 1: إنشاء الهيكل الأكاديمي**

##### الخطوة 1: إنشاء الكليات
- **الجدول**: `colleges`
- **الحقول الإلزامية**: `tenant_id`, `name`
- **الحقول الاختيارية**: `code`, `dean_id`
- **Server Action**: `createCollege()` في `@tenant-admin/academic/actions.ts`
- **القيود**: `code` يجب أن يكون فريداً داخل الجامعة

```typescript
// مثال من الكود
const { error } = await supabase.from("colleges").insert({
  tenant_id: profile.tenant_id,
  name,
  code: code || null,
  dean_id: dean_id || null,
});
```

##### الخطوة 2: إنشاء الأقسام
- **الجدول**: `departments`
- **الحقول الإلزامية**: `tenant_id`, `college_id`, `name`
- **الحقول الاختيارية**: `code`, `head_id`
- **Server Action**: `createDepartment()`
- **القيود**: `code` فريد، `college_id` يجب أن يكون موجوداً

##### الخطوة 3: إنشاء التخصصات
- **الجدول**: `majors`
- **الحقول الإلزامية**: `tenant_id`, `department_id`, `name`, `total_credits`, `duration_years`
- **Server Action**: `createMajor()`
- **السلوك الذكي**: عند إنشاء تخصص، يتم **تلقائياً** إنشاء المستويات الأكاديمية بناءً على `duration_years`

```typescript
// من createMajor() - إنشاء تلقائي للمستويات
if (major && duration_years > 0) {
  const levelNames = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع"];
  const levels = Array.from({ length: duration_years }, (_, i) => ({
    tenant_id: profile.tenant_id,
    major_id: major.id,
    level_number: i + 1,
    name: `المستوى ${levelNames[i] || (i + 1)}`,
  }));
  await supabase.from("academic_levels").insert(levels);
}
```

#### **المرحلة 2: إنشاء المقررات والخطط الدراسية**

##### الخطوة 4: إنشاء المقررات
- **الجدول**: `courses`
- **الحقول الإلزامية**: `tenant_id`, `code`, `name`, `credit_hours`, `course_type`
- **الحقول الاختيارية**: `department_id`, `description`
- **Server Action**: `createCourse()` في `@tenant-admin/courses/actions.ts`
- **أنواع المقررات**: `theoretical`, `practical`, `hybrid`

##### الخطوة 5: ربط المقررات بالمستويات (الخطة الدراسية)
- **الجدول**: `study_plan_courses`
- **الحقول الإلزامية**: `tenant_id`, `academic_level_id`, `course_id`, `semester_type`, `plan_course_type`
- **Server Action**: `addCourseToStudyPlan()`
- **أنواع المقررات في الخطة**: `mandatory` (إجباري), `elective` (اختياري)
- **أنواع الفصول**: `first`, `second`, `summer`

##### الخطوة 6: تحديد المتطلبات السابقة
- **الجدول**: `course_prerequisites`
- **الحقول**: `course_id`, `prerequisite_id`, `min_grade`
- **القيود**: لا يمكن أن يكون المقرر متطلباً سابقاً لنفسه (`chk_no_self_prerequisite`)

#### **المرحلة 3: إعداد البنية التحتية**

##### الخطوة 7: إنشاء القاعات والمعامل
- **الجدول**: `venues`
- **الحقول الإلزامية**: `tenant_id`, `name`, `venue_type`, `capacity`
- **Server Action**: `createVenue()` في `@tenant-admin/venues/actions.ts`
- **أنواع القاعات**: `lecture_hall`, `lab`, `auditorium`, `other`

##### الخطوة 8: إنشاء الفصول الدراسية
- **الجدول**: `semesters`
- **الحقول الإلزامية**: `tenant_id`, `name`, `academic_year`, `semester_type`, `start_date`, `end_date`
- **Server Action**: `createSemester()` في `@tenant-admin/calendar/actions.ts`
- **الحالات**: `planning`, `active`, `archived`

#### **المرحلة 4: إضافة المستخدمين**

##### الخطوة 9: إنشاء حسابات المستخدمين
- **الجداول**: `auth.users` (Supabase Auth) + `profiles`
- **Server Action**: `createUser()` في `@tenant-admin/users/actions.ts`
- **الأدوار المتاحة**: `academic_management`, `faculty`, `student`
- **الجداول الإضافية**:
  - `faculty_profiles`: للمحاضرين (يحتوي على `employee_id`, `specialization`)
  - `student_profiles`: للطلاب (يحتوي على `student_number`, `enrollment_year`, `cumulative_gpa`)

##### الخطوة 10: ربط المحاضرين بالأقسام
- **الجدول**: `faculty_departments`
- **العلاقة**: Many-to-Many (محاضر واحد يمكن أن ينتمي لعدة أقسام)
- **الحقل المهم**: `is_primary` (لتحديد القسم الرئيسي)

##### الخطوة 11: ربط الطلاب بالتخصصات
- **الجدول**: `student_majors`
- **العلاقة**: Many-to-Many (طالب يمكن أن يكون له تخصص مزدوج)
- **الحقل المهم**: `is_primary`

---

### 2.2 نهاية دور `tenant_admin`

بعد إتمام الخطوات السابقة، يكون الهيكل الأكاديمي **جاهزاً** ولكنه **فارغ من المحتوى التشغيلي**. الآن يبدأ دور `academic_management`.

---

## 3. العزل الداخلي والنطاقات (Intra-Tenant Isolation)

### 3.1 المشكلة التي تم حلها

في الجامعات الكبيرة، لا يمكن أن يكون لكل قسم `tenant_admin` خاص به. الحل: **نظام العزل الداخلي** الذي يسمح بتعيين موظفين من دور `academic_management` لإدارة أقسام محددة فقط.

### 3.2 الجدول الرئيسي: `academic_management_departments`

```sql
CREATE TABLE academic_management_departments (
    profile_id    UUID NOT NULL REFERENCES profiles(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by   UUID REFERENCES profiles(id),
    PRIMARY KEY (profile_id, department_id)
);
```

**الوظيفة**: ربط موظف `academic_management` بقسم أو أكثر. هذا الموظف يستطيع إدارة **فقط** الأقسام المُعيَّن لها.

### 3.3 الدالة الأساسية: `get_my_managed_departments()`

```sql
CREATE OR REPLACE FUNCTION get_my_managed_departments()
RETURNS UUID[] LANGUAGE SQL SECURITY DEFINER STABLE AS $$
    SELECT COALESCE(
        ARRAY(
            SELECT department_id
            FROM academic_management_departments
            WHERE profile_id = auth.uid()
        ),
        '{}'::UUID[]
    );
$$;
```

**الوظيفة**: تُرجع مصفوفة من `department_id` التي يُديرها المستخدم الحالي.

**`SECURITY DEFINER`**: تتجاوز RLS على جدول `academic_management_departments` لتجنب infinite recursion.

### 3.4 سياسات RLS المُطبَّقة

#### على `majors`:
```sql
CREATE POLICY "academic_management_scoped_write_majors"
    ON majors FOR ALL
    USING (
        current_user_role() = 'academic_management'
        AND tenant_id = current_tenant_id()
        AND department_id = ANY(get_my_managed_departments())
    );
```

#### على `courses`:
```sql
CREATE POLICY "academic_management_scoped_write_courses"
    ON courses FOR ALL
    USING (
        current_user_role() = 'academic_management'
        AND tenant_id = current_tenant_id()
        AND department_id = ANY(get_my_managed_departments())
    );
```

#### على `sections`:
```sql
CREATE POLICY "academic_management_scoped_write_sections"
    ON sections FOR ALL
    USING (
        current_user_role() = 'academic_management'
        AND tenant_id = current_tenant_id()
        AND course_id IN (
            SELECT id FROM courses
            WHERE department_id = ANY(get_my_managed_departments())
        )
    );
```

#### على `schedules`:
```sql
CREATE POLICY "academic_management_scoped_write_schedules"
    ON schedules FOR ALL
    USING (
        current_user_role() = 'academic_management'
        AND tenant_id = current_tenant_id()
        AND section_id IN (
            SELECT id FROM sections
            WHERE course_id IN (
                SELECT id FROM courses
                WHERE department_id = ANY(get_my_managed_departments())
            )
        )
    );
```

### 3.5 مثال عملي

**السيناريو**: جامعة بها كليتان (الهندسة، الطب). كلية الهندسة بها قسمان (علوم الحاسوب، الهندسة المدنية).

- `tenant_admin` يُعيِّن **أحمد** كـ `academic_management` لقسم علوم الحاسوب فقط
- `tenant_admin` يُعيِّن **فاطمة** كـ `academic_management` لقسم الهندسة المدنية فقط

**النتيجة**:
- أحمد يستطيع فتح شُعب وجدولة محاضرات **فقط** لمقررات قسم علوم الحاسوب
- فاطمة لا تستطيع رؤية أو تعديل أي شيء يخص قسم علوم الحاسوب
- محاولة أحمد جدولة محاضرة لمقرر من الهندسة المدنية ستفشل عند مستوى قاعدة البيانات (RLS)

---

## 4. الجداول الذكية ومنع التعارض

### 4.1 الجدول: `schedules`

```sql
CREATE TABLE schedules (
    id            UUID PRIMARY KEY,
    tenant_id     UUID NOT NULL,
    section_id    UUID NOT NULL,
    venue_id      UUID,
    day_of_week   schedule_day NOT NULL,  -- ENUM: sunday..saturday
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    status        schedule_status NOT NULL DEFAULT 'draft',
    ...
    CONSTRAINT chk_schedule_times CHECK (start_time < end_time)
);
```

### 4.2 الدالة: `check_schedule_conflicts()`

**الموقع**: `supabase/migrations/20260307022710_part1_core_system.sql:711-789`

**الوظيفة**: تُنفَّذ **قبل** كل `INSERT` أو `UPDATE` على جدول `schedules` للتحقق من 3 أنواع من التعارضات:

#### **4.2.1 التعارض المكاني (SPATIAL_CONFLICT)**

**الشرط**: نفس القاعة (`venue_id`) + نفس اليوم (`day_of_week`) + تداخل زمني + نفس الفصل الدراسي (`semester_id`)

```sql
SELECT COUNT(*) INTO spatial_conflict
FROM schedules sc
JOIN sections se ON sc.section_id = se.id
WHERE sc.id <> COALESCE(NEW.id, gen_random_uuid())
  AND sc.tenant_id = NEW.tenant_id
  AND sc.venue_id = NEW.venue_id
  AND sc.day_of_week = NEW.day_of_week
  AND se.semester_id = v_semester_id
  AND sc.start_time < NEW.end_time
  AND sc.end_time > NEW.start_time;

IF spatial_conflict > 0 THEN
    RAISE EXCEPTION 'SPATIAL_CONFLICT: Venue is already booked at this time slot.';
END IF;
```

**مثال**: لا يمكن جدولة محاضرتين في "قاعة A" يوم الأحد من 8:00-10:00.

#### **4.2.2 التعارض التدريسي (FACULTY_CONFLICT)**

**الشرط**: نفس المحاضر (`instructor_id`) + نفس اليوم + تداخل زمني + نفس الفصل الدراسي

```sql
SELECT COUNT(*) INTO faculty_conflict
FROM schedules sc
JOIN sections se ON sc.section_id = se.id
WHERE sc.id <> COALESCE(NEW.id, gen_random_uuid())
  AND sc.tenant_id = NEW.tenant_id
  AND se.instructor_id = v_instructor_id
  AND sc.day_of_week = NEW.day_of_week
  AND se.semester_id = v_semester_id
  AND sc.start_time < NEW.end_time
  AND sc.end_time > NEW.start_time;

IF faculty_conflict > 0 THEN
    RAISE EXCEPTION 'FACULTY_CONFLICT: Instructor is already scheduled at this time slot.';
END IF;
```

**مثال**: المحاضر "د. خالد" لا يمكن أن يُدرِّس محاضرتين في نفس الوقت.

#### **4.2.3 التعارض الطلابي (STUDENT_CONFLICT)**

**الشرط**: مقرران **إجباريان** (`mandatory`) في **نفس المستوى الأكاديمي** + نفس اليوم + تداخل زمني + نفس الفصل الدراسي

```sql
SELECT COUNT(*) INTO student_conflict
FROM schedules sc
JOIN sections se ON sc.section_id = se.id
JOIN courses c ON se.course_id = c.id
JOIN study_plan_courses spc ON c.id = spc.course_id
WHERE sc.id <> COALESCE(NEW.id, gen_random_uuid())
  AND sc.tenant_id = NEW.tenant_id
  AND sc.day_of_week = NEW.day_of_week
  AND sc.start_time < NEW.end_time
  AND sc.end_time > NEW.start_time
  AND spc.plan_course_type = 'mandatory'
  AND spc.academic_level_id = (
      SELECT spc2.academic_level_id 
      FROM study_plan_courses spc2
      JOIN courses c2 ON spc2.course_id = c2.id
      WHERE c2.id = v_course_id
      LIMIT 1
  )
  AND se.semester_id = v_semester_id;

IF student_conflict > 0 THEN
    RAISE EXCEPTION 'STUDENT_CONFLICT: Mandatory course at same academic level is already scheduled at this time slot.';
END IF;
```

**مثال**: طلاب المستوى الأول في هندسة البرمجيات يجب أن يحضروا "CS101" و "MATH101" (كلاهما إجباري). لا يمكن جدولتهما في نفس الوقت.

**ملاحظة مهمة**: المقررات الاختيارية (`elective`) **لا تُسبب تعارض** لأن الطالب يختار واحداً منها فقط.

### 4.3 معالجة الأخطاء في Frontend

**الموقع**: `src/app/academic-management/schedules/actions.ts:8-21`

```typescript
const CONFLICT_MESSAGES: Record<string, string> = {
  SPATIAL_CONFLICT: "تعارض مكاني: القاعة محجوزة في نفس الوقت",
  FACULTY_CONFLICT: "تعارض المحاضر: المحاضر لديه محاضرة أخرى في نفس الوقت",
  STUDENT_CONFLICT: "تعارض طلابي: مقرر إجباري في نفس المستوى الأكاديمي مجدول في نفس الوقت",
};

function parseConflictError(message: string): string {
  for (const [key, arabic] of Object.entries(CONFLICT_MESSAGES)) {
    if (message.includes(key)) {
      return arabic;
    }
  }
  return message;
}
```

**الاستخدام**: عند فشل `createSchedule()` أو `updateSchedule()`، يتم تحويل رسالة الخطأ الإنجليزية من قاعدة البيانات إلى رسالة عربية واضحة تُعرض للمستخدم.

---

## 5. تدفق العمل بين المستخدمين

### 5.1 خريطة المسؤوليات

| الدور | المسؤوليات | الجداول المُدارة | الصلاحيات |
|------|------------|------------------|-----------|
| **`super_admin`** | إدارة المنصة بالكامل | `tenants`, `subscription_plans`, `system_announcements` | كامل الصلاحيات على جميع الجامعات |
| **`tenant_admin`** | بناء الهيكل الأكاديمي | `colleges`, `departments`, `majors`, `courses`, `venues`, `semesters`, `profiles` | كامل الصلاحيات داخل جامعته فقط |
| **`academic_management`** | التشغيل الأكاديمي | `sections`, `enrollments`, `schedules`, `circulars` | محدودة بالأقسام المُعيَّن لها |
| **`faculty`** | التدريس والتقييم | `course_materials`, `assignments`, `attendance_sessions`, `gradebook_entries` | محدودة بالشُعب التي يُدرِّسها |
| **`student`** | الدراسة والتفاعل | `submissions`, `messages`, `tickets` | محدودة ببياناته الشخصية |

### 5.2 السيناريو الكامل (من البداية للنهاية)

#### **الفصل 1: التأسيس (tenant_admin)**

1. **إنشاء الهيكل**: كلية → قسم → تخصص → مستويات (تلقائي)
2. **إنشاء المقررات**: إضافة جميع المقررات المطلوبة
3. **بناء الخطة الدراسية**: ربط كل مقرر بمستوى أكاديمي + فصل دراسي + نوع (إجباري/اختياري)
4. **إضافة القاعات**: تسجيل جميع القاعات والمعامل
5. **إنشاء الفصل الدراسي**: تحديد التواريخ وحالة الفصل (`planning`)
6. **إضافة المستخدمين**: إنشاء حسابات المحاضرين والطلاب
7. **تعيين النطاقات**: ربط موظفي `academic_management` بأقسامهم

#### **الفصل 2: التشغيل (academic_management)**

8. **فتح الشُعب**: إنشاء `sections` لكل مقرر + تعيين محاضر + تحديد السعة القصوى
9. **الجدولة**: إنشاء `schedules` لكل شعبة (النظام يمنع التعارضات تلقائياً)
10. **نشر الجداول**: تغيير حالة الجداول من `draft` إلى `published`
11. **التسجيل الجماعي**: إضافة الطلاب للشُعب عبر `enrollments` (يدوياً أو عبر استيراد CSV)
12. **إصدار التعاميم**: نشر إعلانات للطلاب/المحاضرين

#### **الفصل 3: التدريس (faculty)**

13. **رفع المحتوى**: إضافة محاضرات/ملفات في `course_materials`
14. **إنشاء التكليفات**: نشر واجبات في `assignments`
15. **تسجيل الحضور**: فتح جلسات حضور في `attendance_sessions` + تسجيل حالة كل طالب في `attendance_records`
16. **رصد الدرجات**: إدخال الدرجات في `gradebook_entries`
17. **التواصل**: الرد على رسائل الطلاب في `messages`

#### **الفصل 4: الدراسة (student)**

18. **الاطلاع على الجدول**: عرض `schedules` الخاصة بشُعبه
19. **تحميل المحتوى**: الوصول لـ `course_materials`
20. **تسليم الواجبات**: رفع `submissions`
21. **تسجيل الحضور**: استخدام QR Code أو Geolocation
22. **الاطلاع على الدرجات**: عرض `gradebook_entries` المنشورة
23. **فتح تذاكر**: طلب مساعدة عبر `tickets` (مع AI Pre-resolution)

---

## 6. الجداول والعلاقات

### 6.1 الجداول الأساسية

| الجدول | الوصف | الحقول الرئيسية |
|--------|-------|-----------------|
| `tenants` | الجامعات | `id`, `name`, `subdomain`, `status`, `absence_threshold` |
| `colleges` | الكليات | `id`, `tenant_id`, `name`, `code`, `dean_id` |
| `departments` | الأقسام | `id`, `tenant_id`, `college_id`, `name`, `code`, `head_id` |
| `majors` | التخصصات | `id`, `tenant_id`, `department_id`, `name`, `total_credits`, `duration_years` |
| `academic_levels` | المستويات الأكاديمية | `id`, `tenant_id`, `major_id`, `level_number`, `name` |
| `courses` | المقررات | `id`, `tenant_id`, `department_id`, `code`, `name`, `credit_hours`, `course_type` |
| `study_plan_courses` | الخطة الدراسية | `id`, `tenant_id`, `academic_level_id`, `course_id`, `semester_type`, `plan_course_type` |
| `semesters` | الفصول الدراسية | `id`, `tenant_id`, `name`, `academic_year`, `semester_type`, `status`, `start_date`, `end_date` |
| `venues` | القاعات | `id`, `tenant_id`, `name`, `code`, `venue_type`, `capacity` |
| `sections` | الشُعب | `id`, `tenant_id`, `course_id`, `semester_id`, `section_code`, `instructor_id`, `status`, `max_capacity`, `enrolled_count` |
| `schedules` | الجداول الزمنية | `id`, `tenant_id`, `section_id`, `venue_id`, `day_of_week`, `start_time`, `end_time`, `status` |
| `enrollments` | التسجيلات | `id`, `tenant_id`, `student_id`, `section_id`, `semester_id`, `status`, `final_grade`, `letter_grade` |

### 6.2 الجداول الإدارية

| الجدول | الوصف | الوظيفة |
|--------|-------|---------|
| `academic_management_departments` | نطاقات الإدارة الأكاديمية | ربط موظفي `academic_management` بأقسامهم |
| `faculty_departments` | انتماء المحاضرين | ربط المحاضرين بالأقسام (Many-to-Many) |
| `student_majors` | انتماء الطلاب | ربط الطلاب بالتخصصات (Many-to-Many) |
| `course_prerequisites` | المتطلبات السابقة | تحديد المقررات التي يجب اجتيازها قبل التسجيل |

### 6.3 العلاقات الرئيسية

```
tenants (1) ──→ (N) colleges
colleges (1) ──→ (N) departments
departments (1) ──→ (N) majors
majors (1) ──→ (N) academic_levels
academic_levels (1) ──→ (N) study_plan_courses ←── (N) courses
courses (1) ──→ (N) sections ←── (1) semesters
sections (1) ──→ (N) schedules ←── (1) venues
sections (1) ──→ (N) enrollments ←── (N) students
```

### 6.4 Triggers المهمة

| Trigger | الجدول | الوظيفة |
|---------|--------|---------|
| `trg_check_schedule_conflicts` | `schedules` | منع التعارضات الثلاثة (مكاني، تدريسي، طلابي) |
| `trg_enrollments_sync_count` | `enrollments` | تحديث `sections.enrolled_count` تلقائياً |
| `trg_recalc_attendance_summary` | `attendance_records` | حساب ملخص الحضور لكل طالب |
| `trg_notify_absence_warning` | `attendance_summaries` | إرسال إشعار عند تجاوز نسبة الغياب |
| `trg_sync_final_grade` | `gradebook_entries` | حساب الدرجة النهائية والتقدير تلقائياً |
| `trg_auto_create_course_channel` | `sections` | إنشاء قناة محادثة تلقائياً لكل شعبة |

---

## 7. الخلاصة

### 7.1 النقاط الرئيسية

1. **الهيكل الأكاديمي هرمي وصارم**: كل مستوى يعتمد على المستوى الأعلى منه
2. **العزل متعدد المستويات**: بين الجامعات (Multi-Tenancy) وداخل الجامعة (Intra-Tenant Isolation)
3. **الجدولة ذكية**: النظام يمنع التعارضات تلقائياً عند مستوى قاعدة البيانات
4. **تدفق العمل واضح**: `tenant_admin` يبني الهيكل، `academic_management` يُشغِّله، `faculty` يُدرِّس، `student` يدرس
5. **الأتمتة واسعة**: إنشاء المستويات تلقائياً، حساب الدرجات تلقائياً، إرسال الإشعارات تلقائياً

### 7.2 الملفات المرجعية

- **Database Schema**: `src/lib/types/supabase.ts`
- **Core Migrations**: `supabase/migrations/20260307022710_part1_core_system.sql`
- **Intra-Tenant Isolation**: `supabase/migrations/20260313222415_intra_tenant_isolation.sql`
- **Tenant Admin Actions**: `src/app/tenant-admin/academic/actions.ts`
- **Academic Management Actions**: `src/app/academic-management/schedules/actions.ts`
- **Change Log**: `change_log.md` (Sprints 0-23)

---

**تاريخ التوليد**: 2026-03-18  
**الإصدار**: 1.0  
**الحالة**: مُكتمل بناءً على الكود الفعلي
