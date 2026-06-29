# خطة الإصلاحات الشاملة لنظام UniBot — Fixes_plan.md

> **تاريخ الخطة:** 2026-06-28
> **الهدف:** إعادة هيكلة النظام لتطبيق السيناريو الأكاديمي المكون من 7 خطوات مع إزالة مفهوم الشعب بالكامل وإعادة تصميم الجداول الدراسية والتسجيل الآلي

---

## فهرس المحتويات

1. [ملخص التغييرات الجوهرية](#1-ملخص-التغييرات-الجوهرية)
2. [نموذج البيانات الجديد — التصميم الكامل](#2-نموذج-البيانات-الجديد)
3. [الإصلاحات حسب الخطوات السبع](#3-الإصلاحات-حسب-الخطوات-السبع)
   - 3.1 الكليات ✅
   - 3.2 الأقسام والموظفين ⚠️
   - 3.3 التخصصات والمستويات ✅
   - 3.4 المواد الدراسية ⚠️
   - 3.5 الخطط الدراسية ❌
   - 3.6 الجداول الدراسية 🔄
   - 3.7 التسجيل الآلي 🆕
4. [ترحيل البيانات (Data Migration)](#4-ترحيل-البيانات)
5. [قائمة الملفات المتأثرة](#5-قائمة-الملفات-المتأثرة)
6. [خطوات التنفيذ المقترحة](#6-خطوات-التنفيذ-المقترحة)
7. [التحقق والاختبار](#7-التحقق-والاختبار)

---

## 1. ملخص التغييرات الجوهرية

### أ. إزالة الشعب (sections) بالكامل
**الوضع الحالي:** كل مادة دراسية يمكن أن تقدم عبر عدة شعب (sections)، كل شعبة لها طاقتها الاستيعابية ومحاضرها وجدولها المنفصل.

**الوضع الجديد:** في كل تخصص ومستوى وترم — كل الطلاب في مجموعة واحدة. المادة الواحدة تُدرس دفعة واحدة. يتم تحديد الموعد والمحاضر والقاعة مباشرة على مستوى المادة في الخطة الدراسية.

### ب. نظام جدول دراسي جديد (course_schedules)
**الوضع الحالي:** `schedules` تعتمد على `section_id`، وشعبة المادة الهجينة (نظري+عملي) لها شعبة معمل تابعة عبر `parent_section_id`.

**الوضع الجديد:** جدول `course_schedules` يحل محل `sections` + `schedules` معًا. كل مادة في الخطة الدراسية لها:
- إدخال `component_type = 'theoretical'` للمحاضرة النظرية (دائمًا)
- إدخال `component_type = 'practical'` للمعمل (للمواد الهجينة فقط)
- كل إدخال مستقل تمامًا: يوم، وقت، قاعة، محاضر

### ج. التسجيل الآلي (Auto-Enrollment)
**الوضع الحالي:** التسجيل يدوي — الطالب يبحث عن شعب ويسجل نفسه، أو المسؤول الأكاديمي يسجل طلاب في شعبة محددة.

**الوضع الجديد:** عند إنشاء طالب أو تعيين تخصصه/مستواه، يتم تسجيله تلقائيًا في جميع مواد الخطة الدراسية لتخصصه ومستواه.

### د. الأدوار والصلاحيات
**الوضع الحالي:** 5 أدوار فقط (super_admin، tenant_admin، academic_management، faculty، student).

**الوضع الجديد:** إضافة 4 أدوار: head_of_department، secretary، ticket_technician، lecturer + جدول `department_staff` لربط الموظفين الإداريين بالأقسام.

---

## 2. نموذج البيانات الجديد

### 2.1 الجدول الجديد: `course_schedules`

```sql
CREATE TABLE course_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  study_plan_course_id UUID NOT NULL REFERENCES study_plan_courses(id) ON DELETE CASCADE,
  component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('theoretical', 'practical')),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6), -- 1=Saturday ... 6=Thursday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | published
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- قيود التفرّد: لا يمكن أن يكون نفس المكان محجوز في نفس الوقت
  CONSTRAINT unique_venue_time UNIQUE (semester_id, day_of_week, start_time, venue_id),
  -- لا يمكن أن يكون نفس المحاضر في مكانين في نفس الوقت
  CONSTRAINT unique_instructor_time UNIQUE (semester_id, day_of_week, start_time, instructor_id),
  -- لا يمكن تكرار نفس المادة (نظري أو عملي) في نفس الترم
  CONSTRAINT unique_component_per_course UNIQUE (semester_id, study_plan_course_id, component_type)
);
```

**مقارنة: `course_schedules` vs `sections` + `schedules` القديمة:**

| الميزة | القديم (sections + schedules) | الجديد (course_schedules) |
|--------|-------------------------------|---------------------------|
| مستوى الجدولة | لكل شعبة (section) ولكل موعد | لكل مادة في الخطة الدراسية |
| ربط بالتخصص | غير مباشر عبر course → department | مباشر عبر study_plan_course_id → major |
| فصل نظري/عملي | section مع parent_section_id | حقل component_type مباشر |
| المدرّس | في sections.instructor_id | في course_schedules لكل إدخال |
| القاعة | في schedules.venue_id | في course_schedules لكل إدخال |
| الحالة | draft/published لكل موعد | draft/published لكل موعد |

### 2.2 تعديل جدول `enrollments`

```sql
-- إزالة section_id وإضافة course_id + major_id + academic_level_id
ALTER TABLE enrollments DROP CONSTRAINT enrollments_section_id_fkey;
ALTER TABLE enrollments ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE enrollments ADD COLUMN major_id UUID REFERENCES majors(id);
ALTER TABLE enrollments ADD COLUMN academic_level_id UUID REFERENCES academic_levels(id);
ALTER TABLE enrollments ADD COLUMN semester_id UUID REFERENCES semesters(id);

-- تعبئة البيانات (إذا كان هناك بيانات موجودة)
UPDATE enrollments e
SET course_id = s.course_id,
    semester_id = s.semester_id
FROM sections s
WHERE e.section_id = s.id;

-- جعل الحقول NOT NULL بعد التعبئة
ALTER TABLE enrollments ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE enrollments ALTER COLUMN semester_id SET NOT NULL;

-- إضافة unique constraint
ALTER TABLE enrollments ADD CONSTRAINT unique_student_course_semester UNIQUE (student_id, course_id, semester_id);

-- إزالة section_id بعد ترحيل البيانات
ALTER TABLE enrollments DROP COLUMN section_id;
```

**ملاحظة:** `major_id` و `academic_level_id` يمكن أن تكون NULL للسماح بالتوافق مع البيانات القديمة. يتم تعبئتها تلقائيًا عند التسجيل الآلي.

### 2.3 تعديل الجداول التابعة (استبدال section_id → course_id + semester_id)

```sql
-- gradebook_entries
ALTER TABLE gradebook_entries ADD COLUMN course_id UUID REFERENCES courses(id);
ALTER TABLE gradebook_entries ADD COLUMN semester_id UUID REFERENCES semesters(id);
UPDATE gradebook_entries ge SET course_id = s.course_id, semester_id = s.semester_id
  FROM sections s WHERE ge.section_id = s.id;
ALTER TABLE gradebook_entries ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE gradebook_entries DROP COLUMN section_id;

-- attendance_sessions
ALTER TABLE attendance_sessions ADD COLUMN course_id UUID REFERENCES courses(id);
ALTER TABLE attendance_sessions ADD COLUMN semester_id UUID REFERENCES semesters(id);
UPDATE attendance_sessions a SET course_id = s.course_id, semester_id = s.semester_id
  FROM sections s WHERE a.section_id = s.id;
ALTER TABLE attendance_sessions ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE attendance_sessions DROP COLUMN section_id;

-- assignments
ALTER TABLE assignments ADD COLUMN course_id UUID REFERENCES courses(id);
ALTER TABLE assignments ADD COLUMN semester_id UUID REFERENCES semesters(id);
UPDATE assignments a SET course_id = s.course_id, semester_id = s.semester_id
  FROM sections s WHERE a.section_id = s.id;
ALTER TABLE assignments ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE assignments DROP COLUMN section_id;

-- course_materials
ALTER TABLE course_materials ADD COLUMN course_id UUID REFERENCES courses(id);
UPDATE course_materials cm SET course_id = s.course_id FROM sections s WHERE cm.section_id = s.id;
ALTER TABLE course_materials DROP COLUMN section_id;

-- syllabi
ALTER TABLE syllabi ADD COLUMN course_id UUID REFERENCES courses(id);
UPDATE syllabi sy SET course_id = s.course_id FROM sections s WHERE sy.section_id = s.id;
ALTER TABLE syllabi DROP COLUMN section_id;

-- channels
ALTER TABLE channels ADD COLUMN course_id UUID REFERENCES courses(id);
ALTER TABLE channels ADD COLUMN semester_id UUID REFERENCES semesters(id);
UPDATE channels ch SET course_id = s.course_id, semester_id = s.semester_id
  FROM sections s WHERE ch.section_id = s.id;
ALTER TABLE channels DROP COLUMN section_id;
-- تحديث unique constraint للقنوات
ALTER TABLE channels ADD CONSTRAINT unique_course_channel UNIQUE (course_id, semester_id);

-- student_risk_scores
ALTER TABLE student_risk_scores ADD COLUMN course_id UUID REFERENCES courses(id);
UPDATE student_risk_scores srs SET course_id = s.course_id
  FROM sections s WHERE srs.section_id = s.id;
ALTER TABLE student_risk_scores DROP COLUMN section_id;

-- course_risk_flags
ALTER TABLE course_risk_flags ADD COLUMN course_id UUID REFERENCES courses(id);
ALTER TABLE course_risk_flags ADD COLUMN semester_id UUID REFERENCES semesters(id);
UPDATE course_risk_flags crf SET course_id = s.course_id, semester_id = s.semester_id
  FROM sections s WHERE crf.section_id = s.id;
ALTER TABLE course_risk_flags DROP COLUMN section_id;

-- student_recommendations
ALTER TABLE student_recommendations ADD COLUMN course_id UUID REFERENCES courses(id);
UPDATE student_recommendations sr SET course_id = s.course_id
  FROM sections s WHERE sr.section_id = s.id;
ALTER TABLE student_recommendations DROP COLUMN section_id;

-- tickets (related_section_id)
ALTER TABLE tickets ADD COLUMN course_id UUID REFERENCES courses(id);
UPDATE tickets t SET course_id = s.course_id
  FROM sections s WHERE t.related_section_id = s.id;
ALTER TABLE tickets DROP COLUMN related_section_id;

-- ai_knowledge_documents
ALTER TABLE ai_knowledge_documents ADD COLUMN course_id UUID REFERENCES courses(id);
UPDATE ai_knowledge_documents akd SET course_id = s.course_id
  FROM sections s WHERE akd.section_id = s.id;
ALTER TABLE ai_knowledge_documents DROP COLUMN section_id;
```

### 2.4 إلغاء الجداول والأنواع الملغاة

```sql
-- حذف المشغلات أولاً
DROP TRIGGER IF EXISTS trg_auto_create_course_channel ON sections;
DROP TRIGGER IF EXISTS trg_update_channel_instructor ON sections;
DROP FUNCTION IF EXISTS auto_create_course_channel();
DROP FUNCTION IF EXISTS update_channel_instructor();
DROP FUNCTION IF EXISTS sync_section_enrolled_count();

-- حذف الجداول
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS sections CASCADE;

-- حذف الأنواع (ENUMs)
DROP TYPE IF EXISTS section_status;
DROP TYPE IF EXISTS section_type;
```

### 2.5 جدول `department_staff` الجديد

```sql
CREATE TABLE department_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('head_of_department', 'secretary', 'ticket_technician')),
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (department_id, profile_id),
  UNIQUE (department_id, role, is_active) -- يمكن تفعيله لضمان head واحد فقط
);
```

**ملاحظة:** الـ `lecturer` لا يضاف إلى `department_staff` بل يرتبط بـ `faculty_departments` الحالي مع إضافة قيد بقسم واحد فقط.

### 2.6 أدوار جديدة في `user_role`

```sql
ALTER TYPE user_role ADD VALUE 'head_of_department';
ALTER TYPE user_role ADD VALUE 'secretary';
ALTER TYPE user_role ADD VALUE 'ticket_technician';
ALTER TYPE user_role ADD VALUE 'lecturer';
```

### 2.7 تعديل دوال كشف التعارض (course_schedules بدلاً من schedules + sections)

```sql
CREATE OR REPLACE FUNCTION check_schedule_conflicts()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_major_id UUID;
  v_level_id UUID;
  v_student_count INT;
  v_capacity INT;
BEGIN
  -- الحصول على tenant_id من study_plan_course
  SELECT spc.tenant_id, spc.major_id, spc.academic_level_id
  INTO v_tenant_id, v_major_id, v_level_id
  FROM study_plan_courses spc
  WHERE spc.id = NEW.study_plan_course_id;

  -- 1. تعارض مكاني (نفس القاعة في نفس الوقت)
  IF EXISTS (
    SELECT 1 FROM course_schedules cs
    WHERE cs.semester_id = NEW.semester_id
      AND cs.day_of_week = NEW.day_of_week
      AND cs.start_time = NEW.start_time
      AND cs.venue_id = NEW.venue_id
      AND cs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
      AND cs.status = 'published'
  ) THEN
    RAISE EXCEPTION 'SPATIAL_CONFLICT' USING HINT = 'القاعة محجوزة في نفس الوقت';
  END IF;

  -- 2. تعارض المحاضر (نفس المحاضر في مكانين)
  IF EXISTS (
    SELECT 1 FROM course_schedules cs
    WHERE cs.semester_id = NEW.semester_id
      AND cs.day_of_week = NEW.day_of_week
      AND cs.start_time = NEW.start_time
      AND cs.instructor_id = NEW.instructor_id
      AND cs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
      AND cs.status = 'published'
  ) THEN
    RAISE EXCEPTION 'FACULTY_CONFLICT' USING HINT = 'المحاضر لديه محاضرة أخرى في نفس الوقت';
  END IF;

  -- 3. تعارض الطلاب (مادتان إجباريتان في نفس الوقت لنفس المستوى)
  IF EXISTS (
    SELECT 1 FROM course_schedules cs
    JOIN study_plan_courses spc1 ON cs.study_plan_course_id = spc1.id
    JOIN study_plan_courses spc2 ON spc2.id = NEW.study_plan_course_id
    WHERE cs.semester_id = NEW.semester_id
      AND cs.day_of_week = NEW.day_of_week
      AND cs.start_time = NEW.start_time
      AND spc1.academic_level_id = spc2.academic_level_id
      AND spc1.major_id = spc2.major_id
      AND spc1.plan_course_type = 'compulsory'
      AND spc2.plan_course_type = 'compulsory'
      AND cs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
      AND cs.status = 'published'
  ) THEN
    RAISE EXCEPTION 'STUDENT_CONFLICT' USING HINT = 'مادتان إجباريتان في نفس الوقت لنفس المستوى';
  END IF;

  -- 4. التحقق من سعة القاعة مقابل عدد الطلاب
  SELECT COUNT(*) INTO v_student_count
  FROM enrollments e
  WHERE e.semester_id = NEW.semester_id
    AND e.major_id = v_major_id
    AND e.academic_level_id = v_level_id;

  SELECT capacity INTO v_capacity
  FROM venues WHERE id = NEW.venue_id;

  IF v_student_count > v_capacity THEN
    RAISE EXCEPTION 'VENUE_CAPACITY_EXCEEDED'
    USING HINT = format('سعة القاعة %s غير كافية لـ %s طالب', v_capacity, v_student_count);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_schedule_conflicts
  BEFORE INSERT OR UPDATE ON course_schedules
  FOR EACH ROW EXECUTE FUNCTION check_schedule_conflicts();
```

---

## 3. الإصلاحات حسب الخطوات السبع

---

### 3.1 الخطوة الأولى: تسجيل الكليات ✅

**الحالة: مطبّق بالكامل — لا تغيير مطلوب**

**التدفق الحالي:**
- `colleges` جدول مع `id, tenant_id, campus_id, name, code, description, is_active, created_at, updated_at`
- CRUD كامل في `src/app/tenant-admin/academic/actions.ts`
- واجهة `CollegeForm` في `academic-client.tsx`
- حذف منطقي عبر `is_active = false`

**ملاحظة:** تأكدنا أن `deleteCollege()` في `actions.ts` يستخدم soft delete ✅ (ولكن هناك مشكلة في `deleteCourse()` تؤثر على الخطوة 4).

---

### 3.2 الخطوة الثانية: تسجيل الأقسام والموظفين ⚠️

**المشاكل المحددة في التقرير:**
1. لا توجد أدوار `head_of_department`، `secretary`، `ticket_technician`، `lecturer` في `user_role`
2. لا يوجد جدول `department_staff` للربط الصارم بين الموظفين والأقسام
3. `departments.head_id` مجرد FK بدون تحقق أو صلاحيات
4. لا توجد واجهة لإدارة الموظفين غير الأكاديميين

**التدفق المطلوب:**

```
كيف ستكون العملية:
1. Tenant Admin أو Academic Management يدخل إلى إدارة الأقسام
2. يختار قسم من الشجرة الهرمية
3. يضغط على "إدارة الموظفين" للقسم
4. تظهر له واجهة تعرض:
   - رئيس القسم الحالي (إن وجد)
   - السكرتير (إن وجد)
   - فني التذاكر (إن وجد)
5. يمكنه إضافة/إزالة/تغيير موظف لكل دور
6. عند اختيار محاضر (lecturer): يتم تعيينه عبر faculty_departments
7. عند اختيار رئيس قسم: يتم تحديث departments.head_id تلقائيًا
8. يتم التحقق من أن كل موظف مرتبط بقسم واحد فقط
```

**الإصلاحات المطلوبة:**

#### قاعدة البيانات — ترحيل جديد: `20260701000003_add_department_staff.sql`:
```sql
ALTER TYPE user_role ADD VALUE 'head_of_department';
ALTER TYPE user_role ADD VALUE 'secretary';
ALTER TYPE user_role ADD VALUE 'ticket_technician';
ALTER TYPE user_role ADD VALUE 'lecturer';

CREATE TABLE department_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('head_of_department', 'secretary', 'ticket_technician')),
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (department_id, profile_id)
);

-- RLS policies
ALTER TABLE department_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_read_department_staff ON department_staff
  FOR SELECT USING (tenant_id = get_current_tenant());
CREATE POLICY tenant_admin_write_department_staff ON department_staff
  FOR ALL USING (
    tenant_id = get_current_tenant()
    AND current_user_role() IN ('super_admin', 'tenant_admin')
  );
```

#### تطبيق الكود:

**ملفات جديدة:**
- `src/app/tenant-admin/departments/staff/page.tsx` — صفحة إدارة موظفي القسم
- `src/app/tenant-admin/departments/staff/actions.ts` — دوال الخادم لإدارة الموظفين
- `src/app/tenant-admin/departments/staff/staff-client.tsx` — واجهة المستخدم

**تحديثات:**
- `src/app/tenant-admin/users/actions.ts` — تحديث `createUser()` لدعم الأدوار الجديدة:
  ```typescript
  // إضافة خيارات الأدوار الجديدة في createUser
  if (role === 'head_of_department' || role === 'secretary' || role === 'ticket_technician') {
    // إضافة إلى profiles مع role المحدد
    // لا حاجة لإنشاء student_profiles أو faculty_profiles
  }
  ```
- `src/app/tenant-admin/academic/actions.ts` — إضافة دوال:
  ```typescript
  async function getDepartmentStaff(departmentId: string) { ... }
  async function addDepartmentStaff(departmentId: string, profileId: string, role: string) { ... }
  async function removeDepartmentStaff(id: string) { ... }
  ```
- `src/app/tenant-admin/academic/academic-client.tsx` — إضافة زر "إدارة الموظفين" لكل قسم

**قيود إضافية:**
- `faculty_departments`: إضافة UNIQUE constraint على `(profile_id)` لضمان أن المحاضر في قسم واحد فقط
- `departments.head_id`: إضافة CHECK constraint أن `head_id` يشير إلى مستخدم بدور `head_of_department`

---

### 3.3 الخطوة الثالثة: تسجيل التخصصات والمستويات ✅

**الحالة: مطبّق بالكامل — لا تغيير جوهري مطلوب**

**التدفق الحالي (صحيح):**
- `majors` مع `department_id` إلزامي
- `academic_levels` مع `major_id` و `level_number`
- الإنشاء التلقائي للمستويات حسب `duration_years` (خط 164-177 في academic/actions.ts)
- عرض شجري College → Department → Major → Levels

> لا تغيير مطلوب في هذه الخطوة

---

### 3.4 الخطوة الرابعة: تسجيل المواد الدراسية ⚠️

**المشاكل المحددة:**
1. `deleteCourse()` يستخدم `.delete()` (حذف مادي) بدلاً من `is_active = false`
2. `practical` مفقود من واجهة اختيار course_type
3. `department_id` غير إلزامي (nullable)

**التدفق المطلوب:**

```
1. المسؤول يضيف مادة جديدة ← يختار القسم (إجباري)، الكود، الاسم، الساعات، النوع
2. أنواع المواد المعروضة: نظري، عملي، نظري+عملي ← الثلاثة
3. عند حذف مادة ← تختفي من الواجهات ولكن تبقى في قاعدة البيانات (is_active = false)
4. المواد غير النشطة لا تظهر في الخطط الدراسية أو الجداول
```

**الإصلاحات:**

#### 1. تغيير `deleteCourse()` في `src/app/tenant-admin/courses/actions.ts`:

```typescript
// قبل (خطأ):
async function deleteCourse(courseId: string) {
  const supabase = await getServiceClient();
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);
}

// بعد (صحيح):
async function deleteCourse(courseId: string) {
  const supabase = await getServiceClient();
  const { error } = await supabase
    .from("courses")
    .update({ is_active: false })
    .eq("id", courseId);
}
```

#### 2. إضافة `practical` في `src/app/tenant-admin/courses/catalog-client.tsx`:

```typescript
// قبل:
const courseTypes = [
  { value: "theoretical", label: "نظري" },
  { value: "hybrid", label: "نظري+عملي" },
];

// بعد:
const courseTypes = [
  { value: "theoretical", label: "نظري" },
  { value: "practical", label: "عملي" },
  { value: "hybrid", label: "نظري+عملي" },
];
```

#### 3. جعل `department_id` إلزاميًا:

**ترحيل قاعدة البيانات:**
```sql
-- أولاً: التأكد من أن جميع المواد الموجودة لها department_id
UPDATE courses SET department_id = (SELECT id FROM departments WHERE tenant_id = courses.tenant_id LIMIT 1)
WHERE department_id IS NULL;

-- ثم إضافة القيد
ALTER TABLE courses ALTER COLUMN department_id SET NOT NULL;
```

---

### 3.5 الخطوة الخامسة: بناء الخطط الدراسية ❌

**المشكلة الجوهرية:** `getCourses()` تجلب جميع المواد النشطة بدون فلتر حسب `department_id` للتخصص.

**التدفق المطلوب:**

```
1. المسؤول يختار تخصصًا من القائمة
2. النظام يحدد department_id للتخصص المختار
3. يتم جلب المواد التي department_id = department_id للتخصص فقط
4. يتم عرضها في grid (مستويات × فصول دراسية)
5. المسؤول يضيف المواد المناسبة للخطة
6. لا يمكن إضافة مادة من خارج قسم التخصص
```

**الإصلاحات:**

#### `src/app/tenant-admin/study-plans/actions.ts`:

```typescript
// تعديل getCourses() لقبول department_id:
async function getCourses(departmentId?: string) {
  const supabase = await getServiceClient();
  const profile = await getProfile(supabase);
  let query = supabase
    .from("courses")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true);

  // إضافة فلتر department_id إذا كان موجودًا
  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  const { data, error } = await query.order("code");
  return data || [];
}
```

#### `src/app/tenant-admin/study-plans/page.tsx`:

```typescript
// قبل: مجرد جلب كل المواد
const courses = await getCourses();

// بعد: جلب المواد حسب التخصص
// إضافة تمرير department_id للتخصص المختار
// هذا يتطلب تفاعل مع الـ client component
```

#### `src/app/tenant-admin/study-plans/study-plan-client.tsx`:

```typescript
// عند تحميل المواد، تحديد department_id من التخصص المختار
// وإذا لم يتم اختيار تخصص → لا تجلب مواد
const selectedMajor = ...; // من الحالة
const departmentId = selectedMajor?.departments?.id;

const courses = await getCourses(departmentId);
```

---

### 3.6 الخطوة السادسة: بناء جداول الفصل الدراسي 🔄

**هذه هي أكبر إعادة هيكلة — إزالة الشعب وإعادة تصميم الجدول بالكامل**

**المشاكل المحددة:**
1. الجدول مبني لكل شعبة (section) وليس لكل تخصص/مستوى
2. `createSchedule()` لا يقبل `instructor_id`
3. لا يوجد عرض جدول كامل للتخصص
4. لا فصل بين النظري والعملي على مستوى الجدول

**التدفق المطلوب (الجديد كليًا):**

```
1. المستخدم يدخل إلى صفحة بناء الجدول
2. يختار: التخصص (major) → المستوى (academic_level) → الترم (semester_type: first/second)
3. تظهر جميع مواد الخطة الدراسية لذلك التخصص والمستوى والترم
4. لكل مادة، يعرض:
   - اسم المادة وكودها
   - خانة اختيار اليوم (قائمة منسدلة: السبت-الخميس)
   - خانة اختيار وقت البداية
   - خانة اختيار وقت النهاية
   - خانة اختيار القاعة (قائمة بالقاعات المتاحة)
   - خانة اختيار المحاضر (قائمة بأعضاء هيئة التدريس)
   - زر لحذف إدخال الجدول
5. إذا كانت المادة من نوع "نظري+عملي" (hybrid):
   - يظهر صفان منفصلان: النظري والعملي
   - لكل صف عمود المحاضر والوقت والقاعة مستقل
   - يمكن للمحاضر نفسه أو محاضر مختلف
6. التحقق التلقائي:
   - سعة القاعة >= عدد الطلاب المسجلين
   - لا تعارض في القاعة
   - لا تعارض للمحاضر
   - لا تعارض للطلاب
7. زر نشر الجدول (publish) ← بعد النشر لا يمكن التعديل
```

**الإصلاحات:**

#### قاعدة البيانات:

**ترحيل جديد: `20260701000001_create_course_schedules.sql`** (كما هو موضح في القسم 2.1)

#### واجهة المستخدم الجديدة — `src/app/academic-management/schedules/page.tsx`:

```typescript
// جوهر الصفحة (server component):
export default async function SchedulesPage() {
  // 1. جلب بيانات المشرف الأكاديمي ونطاق أقسامه
  const { departmentId } = await getManagedDepartments();
  
  // 2. جلب التخصصات التابعة للأقسام المدارة
  const majors = await getMajors(departmentId);
  
  // 3. جلب الفصل الدراسي النشط
  const currentSemester = await getCurrentSemester();
  
  // 4. جلب جميع المواد من الخطط الدراسية للتخصصات
  const studyPlanCourses = await getStudyPlanCourses(majors);
  
  // 5. جلب إدخالات الجدول الحالية (إن وجدت)
  const schedules = await getCourseSchedules(currentSemester.id);
  
  // 6. جلب القاعات
  const venues = await getVenues();
  
  // 7. جلب المحاضرين
  const instructors = await getInstructors(departmentId);
  
  // 8. جلب أعداد الطلاب لكل (major, level)
  const studentCounts = await getStudentCounts(majors);
  
  return <ScheduleBuilderClient 
    majors={majors}
    semester={currentSemester}
    studyPlanCourses={studyPlanCourses}
    schedules={schedules}
    venues={venues}
    instructors={instructors}
    studentCounts={studentCounts}
  />;
}
```

#### واجهة المستخدم الجديدة — `src/app/academic-management/schedules/schedules-client.tsx`:

```typescript
// المكون الرئيسي
function ScheduleBuilderClient({ majors, semester, studyPlanCourses, schedules, venues, instructors, studentCounts }) {
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('first');
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);

  // تصفية المواد حسب التحديد
  const filteredCourses = studyPlanCourses.filter(spc => 
    spc.major_id === selectedMajor && 
    spc.academic_level_id === selectedLevel &&
    spc.semester_type === selectedSemester
  );

  return (
    <div>
      {/* 1. شريط التحديد */}
      <FilterBar majors={majors} levels={levels} ... />
      
      {/* 2. عرض عدد الطلاب في التخصص+المستوى */}
      <StudentCountBadge count={studentCounts[selectedMajor+'/'+selectedLevel]} />
      
      {/* 3. جدول الجدول الدراسي */}
      <ScheduleGrid>
        {filteredCourses.map(course => (
          <CourseScheduleRow 
            key={course.id}
            course={course}
            components={[
              { type: 'theoretical', label: 'نظري' },
              ...(course.course_type === 'hybrid' ? [{ type: 'practical', label: 'عملي' }] : [])
            ]}
            venues={venues}
            instructors={instructors}
            existingEntry={scheduleEntries.find(e => e.study_plan_course_id === course.id)}
            onSave={handleSave}
          />
        ))}
      </ScheduleGrid>
      
      {/* 4. زر النشر */}
      <PublishButton onClick={handlePublish} />
    </div>
  );
}

// صف المادة في الجدول
function CourseScheduleRow({ course, components, venues, instructors, existingEntry, onSave }) {
  return (
    <div className="course-schedule-row">
      <div className="course-info">
        <h4>{course.courses.name}</h4>
        <span>{course.courses.code}</span>
        <CourseTypeBadge type={course.course_type} />
      </div>
      
      {components.map(comp => (
        <div className={`schedule-entry ${comp.type}`}>
          <span className="component-label">{comp.label}</span>
          
          {/* اختيار اليوم */}
          <select name={`${comp.type}_day`} defaultValue={existingEntry?.day_of_week}>
            <option value={1}>السبت</option>
            <option value={2}>الأحد</option>
            <option value={3}>الإثنين</option>
            <option value={4}>الثلاثاء</option>
            <option value={5}>الأربعاء</option>
            <option value={6}>الخميس</option>
          </select>
          
          {/* وقت البداية والنهاية */}
          <input type="time" name={`${comp.type}_start`} />
          <input type="time" name={`${comp.type}_end`} />
          
          {/* القاعة */}
          <select name={`${comp.type}_venue`}>
            {venues.filter(v => v.is_active).map(v => (
              <option value={v.id}>{v.name} (سعة: {v.capacity})</option>
            ))}
          </select>
          
          {/* المحاضر */}
          <select name={`${comp.type}_instructor`}>
            <option value="">اختر المحاضر</option>
            {instructors.map(i => (
              <option value={i.id}>{i.first_name} {i.last_name}</option>
            ))}
          </select>
          
          {/* زر الحفظ لهذا المكون */}
          <button onClick={() => onSave(course.id, comp.type, formValues)}>
            حفظ
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### إلغاء صفحة sections:

- حذف `src/app/academic-management/sections/` بالكامل (3 ملفات)
- إزالة رابط "Sections" من الشريط الجانبي

#### `src/app/academic-management/schedules/actions.ts` الجديدة:

```typescript
// دوال جديدة بالكامل:

export async function getCourseSchedules(semesterId: string) {
  return supabase
    .from("course_schedules")
    .select(`*,
      study_plan_courses!inner(
        academic_level_id, major_id, semester_type,
        courses!inner(id, code, name, credit_hours, course_type),
        academic_levels!inner(id, name, level_number)
      ),
      venues!inner(id, name, code, capacity),
      profiles!course_schedules_instructor_id_fkey(first_name, last_name)
    `)
    .eq("semester_id", semesterId);
}

export async function createScheduleEntry(data: {
  semester_id: string;
  study_plan_course_id: string;
  component_type: 'theoretical' | 'practical';
  day_of_week: number;
  start_time: string;
  end_time: string;
  venue_id: string;
  instructor_id: string;
}) {
  const { error } = await supabase
    .from("course_schedules")
    .insert(data);
  if (error) throw error;
}

export async function updateScheduleEntry(id: string, data: Partial<...>) {
  const { error } = await supabase
    .from("course_schedules")
    .update(data)
    .eq("id", id);
  if (error) throw error;
}

export async function publishSchedule(semesterId: string, majorId: string, levelId: string, semesterType: string) {
  // نشر جميع إدخالات الجدول لفصل/تخصص/مستوى معين
  const { error } = await supabase
    .from("course_schedules")
    .update({ status: 'published' })
    .eq("semester_id", semesterId)
    .eq("study_plan_course_id in (select id from study_plan_courses where major_id = ...)");
}
```

---

### 3.7 الخطوة السابعة: تسجيل الطالب والتسجيل الآلي 🆕

**المشاكل المحددة:**
1. لا يوجد تسجيل آلي عند إنشاء طالب
2. `getAvailableSections()` لا تقرأ تخصص الطالب
3. `batchEnroll()` لا تتحقق من مطابقة التخصص

**التدفق المطلوب:**

```
التسجيل الآلي:
1. يتم إنشاء طالب جديد (أو تحديث تخصصه/مستواه)
2. النظام يحدد:
   - التخصص (major_id) من student_majors
   - المستوى (academic_level_id) الحالي للطالب
   - الترم (semester_type: first/second) حسب الفصل الحالي
   - الفصل الدراسي النشط (active semester)
3. يتم جلب study_plan_courses لتلك (major_id, academic_level_id, semester_type)
4. لكل مادة في الخطة:
   - التحقق من المتطلبات الأساسية (prerequisites)
   - التحقق من عدم التسجيل المكرر
   - إضافة سجل في enrollments مع course_id, semester_id, major_id, academic_level_id
5. عرض رسالة تأكيد بعدد المواد التي سجل فيها الطالب

عرض جدول الطالب:
1. الطالب يسجل دخوله ← يرى صفحة "جدولي"
2. تعرض جميع المواد المسجل فيها (من enrollments للفصل الحالي)
3. لكل مادة: اسم المادة، الوقت، اليوم، القاعة، المحاضر
4. يتم التجميع حسب اليوم
```

**الإصلاحات:**

#### `src/app/student/register/actions.ts` — إعادة كتابة كاملة:

```typescript
// ⛔ إزالة: getAvailableSections()
// ⛔ إزالة: selfEnroll(sectionId, labSectionId?)

// ✅ إضافة: getMyCourses()
export async function getMyCourses() {
  // 1. الحصول على الطالب وتخصصه
  const profile = await getProfile(serviceClient);
  const studentMajor = await serviceClient
    .from("student_majors")
    .select("*, majors!inner(*), academic_levels!inner(*)")
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .single();
  
  // 2. الحصول على الفصل الدراسي النشط
  const semester = await serviceClient
    .from("semesters")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_current", true)
    .single();
  
  // 3. تحديد semester_type بناءً على تاريخ الفصل
  const semesterType = determineSemesterType(semester);
  
  // 4. جلب جميع enrollments الحالية للطالب
  const enrollments = await serviceClient
    .from("enrollments")
    .select("*, courses!inner(id, code, name, credit_hours, course_type)")
    .eq("student_id", profile.id)
    .eq("semester_id", semester.id);
  
  // 5. جلب مواد الخطة الدراسية لتخصص الطالب
  const studyPlanCourses = await serviceClient
    .from("study_plan_courses")
    .select("*, courses!inner(*)")
    .eq("major_id", studentMajor.major_id)
    .eq("academic_level_id", studentMajor.academic_level_id)
    .eq("semester_type", semesterType);
  
  // 6. جلب إدخالات الجدول للفصل الحالي
  const schedules = await serviceClient
    .from("course_schedules")
    .select(`*,
      study_plan_courses!inner(major_id, academic_level_id, courses!inner(id, code, name, credit_hours)),
      venues!inner(name, code, capacity),
      profiles!course_schedules_instructor_id_fkey(first_name, last_name)
    `)
    .eq("semester_id", semester.id);
  
  return {
    semester,
    studentMajor,
    studyPlanCourses,
    enrollments: enrollments.data || [],
    schedules: schedules.data || [],
  };
}

// ✅ إضافة: autoEnroll()
export async function autoEnroll() {
  const profile = await getProfile(serviceClient);
  
  // 1. الحصول على تخصص الطالب النشط
  const { data: studentMajor } = await serviceClient
    .from("student_majors")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .single();
  
  if (!studentMajor) throw new Error("لا يوجد تخصص نشط للطالب");
  
  // 2. الحصول على الفصل النشط
  const { data: semester } = await serviceClient
    .from("semesters")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_current", true)
    .single();
  
  // 3. تحديد semester_type
  const semesterType = determineSemesterType(semester);
  
  // 4. جلب مواد الخطة
  const { data: planCourses } = await serviceClient
    .from("study_plan_courses")
    .select("*, courses!inner(id, code, name, credit_hours)")
    .eq("major_id", studentMajor.major_id)
    .eq("academic_level_id", studentMajor.academic_level_id)
    .eq("semester_type", semesterType);
  
  if (!planCourses || planCourses.length === 0) {
    throw new Error("لا توجد مواد في الخطة الدراسية لهذا المستوى والترم");
  }
  
  // 5. جلب التسجيلات الحالية لتجنب التكرار
  const { data: existingEnrollments } = await serviceClient
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("semester_id", semester.id);
  
  const enrolledCourseIds = new Set(existingEnrollments?.map(e => e.course_id) || []);
  
  // 6. التسجيل في كل مادة
  const results = [];
  for (const pc of planCourses) {
    if (enrolledCourseIds.has(pc.course_id)) continue;
    
    // التحقق من المتطلبات الأساسية
    const prerequisitesMet = await checkPrerequisites(profile.id, pc.course_id, serviceClient);
    if (!prerequisitesMet) continue; // أو تسجيل مع flag
    
    const { error } = await serviceClient
      .from("enrollments")
      .insert({
        tenant_id: profile.tenant_id,
        student_id: profile.id,
        course_id: pc.course_id,
        semester_id: semester.id,
        major_id: studentMajor.major_id,
        academic_level_id: studentMajor.academic_level_id,
        status: 'enrolled',
      });
    
    if (!error) {
      results.push({ courseId: pc.course_id, name: pc.courses.name, status: 'enrolled' });
    }
  }
  
  return {
    enrolled: results.length,
    courses: results,
    semester: semester.name,
  };
}

// ✅ إضافة: getMySchedule() ← عرض الجدول للطالب
export async function getMySchedule() {
  const profile = await getProfile(serviceClient);
  const semester = await getCurrentSemester();
  
  const { data: schedules } = await serviceClient
    .from("course_schedules")
    .select(`*,
      study_plan_courses!inner(
        courses!inner(code, name, credit_hours),
        academic_levels(name)
      ),
      venues!inner(name, code),
      profiles!course_schedules_instructor_id_fkey(first_name, last_name)
    `)
    .eq("semester_id", semester.id)
    .in("study_plan_course_id", 
      // في دراسة_الخطط where major_id, academic_level_id للطالب
      ... // بناء subquery
    )
    .order("day_of_week")
    .order("start_time");
  
  return schedules.data || [];
}
```

#### `src/app/student/register/register-client.tsx` — إعادة تصميم:

```typescript
// من "تسجيل في شعب" إلى "عرض جدولي وإدارة التسجيل"
function RegisterClient({ initialData }) {
  return (
    <div>
      {/* معلومات الفصل الحالي */}
      <SemesterBanner semester={initialData.semester} />
      
      {/* عرض التخصص والمستوى */}
      <MajorInfo major={initialData.studentMajor} />
      
      {/* أزرار الإجراءات */}
      <ActionButtons>
        <AutoEnrollButton onClick={handleAutoEnroll} />
        <ViewScheduleButton onClick={() => router.push('/student/schedule')} />
      </ActionButtons>
      
      {/* جدول المواد المسجل فيها */}
      <EnrolledCoursesGrid>
        {initialData.studyPlanCourses.map(spc => {
          const isEnrolled = initialData.enrollments.some(e => e.course_id === spc.course_id);
          const scheduleEntry = initialData.schedules.find(s => s.study_plan_course_id === spc.id);
          return <CourseCard 
            course={spc.courses} 
            isEnrolled={isEnrolled}
            schedule={scheduleEntry}
          />;
        })}
      </EnrolledCoursesGrid>
    </div>
  );
}
```

#### `src/app/academic-management/enrollments/actions.ts` — تحديث:

```typescript
// ⛔ إزالة دوال تعتمد على section_id
// ✅ إضافة دوال جديدة:

export async function batchEnrollByPlan(params: {
  studentIds: string[];
  majorId: string;
  academicLevelId: string;
  semesterType: string;
}) {
  // 1. جلب جميع مواد الخطة
  const { data: planCourses } = await serviceClient
    .from("study_plan_courses")
    .select("*, courses!inner(id, code, name)")
    .eq("major_id", params.majorId)
    .eq("academic_level_id", params.academicLevelId)
    .eq("semester_type", params.semesterType);
  
  // 2. الحصول على الفصل النشط
  const semester = await getCurrentSemester();
  
  // 3. لكل طالب → تسجيله في جميع مواد الخطة
  const results = [];
  for (const studentId of params.studentIds) {
    const enrolled = [];
    for (const pc of planCourses || []) {
      const { error } = await serviceClient
        .from("enrollments")
        .insert({
          tenant_id: ...,
          student_id: studentId,
          course_id: pc.course_id,
          semester_id: semester.id,
          major_id: params.majorId,
          academic_level_id: params.academicLevelId,
          status: 'enrolled',
        });
      if (!error) enrolled.push(pc.courses.code);
    }
    results.push({ studentId, enrolled });
  }
  
  return results;
}
```

#### `src/app/tenant-admin/users/actions.ts` — إضافة التسجيل الآلي:

```typescript
// في createUser()، بعد إنشاء student_majors:
if (role === 'student') {
  // إنشاء student_profiles و student_majors (موجود حالياً)
  // إضافة: التسجيل الآلي
  try {
    const result = await autoEnroll({ profileId: newProfile.id, majorId, academicLevelId });
    console.log(`Auto-enrolled student in ${result.enrolled} courses`);
  } catch (e) {
    console.error('Auto-enrollment failed (non-fatal):', e);
  }
}
```

---

## 4. ترحيل البيانات

### 4.1 استراتيجية الترحيل

الترحيل سيتم على 7 مراحل لضمان عدم فقدان البيانات:

| # | اسم الترحيل | الوظيفة |
|---|-------------|---------|
| 1 | `20260701000001_create_course_schedules.sql` | إنشاء جدول course_schedules وإضافة triggers |
| 2 | `20260701000002_modify_enrollments.sql` | إضافة course_id, major_id, academic_level_id إلى enrollments |
| 3 | `20260701000003_add_department_staff.sql` | إنشاء جدول department_staff وإضافة الأدوار الجديدة |
| 4 | `20260701000004_migrate_section_data.sql` | ترحيل البيانات من sections+schedules → course_schedules |
| 5 | `20260701000005_migrate_child_tables.sql` | ترحيل section_id في الجداول التابعة إلى course_id |
| 6 | `20260701000006_drop_old_tables.sql` | حذف sections, schedules والـ triggers القديمة |
| 7 | `20260701000007_update_rls_policies.sql` | تحديث RLS policies وإضافة policies جديدة |

### 4.2 ترحيل البيانات من sections → course_schedules (الترحيل #4)

```sql
-- ترحيل شعب المحاضرات النظرية إلى course_schedules
INSERT INTO course_schedules (
  tenant_id,
  semester_id,
  study_plan_course_id,
  component_type,
  day_of_week,
  start_time,
  end_time,
  venue_id,
  instructor_id,
  status
)
SELECT DISTINCT ON (s.course_id, s.semester_id)
  s.tenant_id,
  s.semester_id,
  spc.id AS study_plan_course_id,
  CASE 
    WHEN s.section_type = 'lab' THEN 'practical'
    ELSE 'theoretical'
  END AS component_type,
  sch.day_of_week,
  sch.start_time,
  sch.end_time,
  sch.venue_id,
  s.instructor_id,
  COALESCE(sch.status, 'draft') AS status
FROM sections s
LEFT JOIN schedules sch ON sch.section_id = s.id
JOIN study_plan_courses spc ON spc.course_id = s.course_id
  AND spc.tenant_id = s.tenant_id
WHERE s.section_type != 'lab'  -- lab sections are handled by their parent
  AND sch.id IS NOT NULL;      -- only sections with schedules
```

**ملاحظة:** هذا الترحيل يحول كل شعبة نظرية لها جدول إلى إدخال في `course_schedules`. في حالة وجود شعب متعددة لنفس المادة، نأخذ أول واحدة فقط (DISTINCT ON). بعد الترحيل، يجب مراجعة البيانات يدويًا للتأكد.

---

## 5. قائمة الملفات المتأثرة

### ملفات سيتم حذفها (13 ملفًا)
```
src/app/academic-management/sections/actions.ts
src/app/academic-management/sections/page.tsx
src/app/academic-management/sections/sections-client.tsx
src/app/academic-management/schedules/actions.ts        ← إعادة كتابة
src/app/academic-management/schedules/page.tsx           ← إعادة كتابة
src/app/academic-management/schedules/schedules-client.tsx ← إعادة كتابة
src/app/academic-management/enrollments/actions.ts       ← إعادة كتابة
src/app/academic-management/enrollments/page.tsx          ← إعادة كتابة
src/app/academic-management/enrollments/enrollments-client.tsx ← إعادة كتابة
src/app/student/register/actions.ts                      ← إعادة كتابة
src/app/student/register/page.tsx                        ← إعادة كتابة
src/app/student/register/register-client.tsx             ← إعادة كتابة
```

### ملفات سيتم تحديثها جزئيًا (35+ ملفًا)

**Tenant Admin:**
- `src/app/tenant-admin/study-plans/actions.ts` ← فلتر department_id
- `src/app/tenant-admin/study-plans/page.tsx` ← تمرير department_id
- `src/app/tenant-admin/study-plans/study-plan-client.tsx` ← تحديث getCourses
- `src/app/tenant-admin/courses/actions.ts` ← soft delete
- `src/app/tenant-admin/courses/catalog-client.tsx` ← إضافة practical
- `src/app/tenant-admin/users/actions.ts` ← أدوار جديدة + auto-enroll
- `src/app/tenant-admin/academic/actions.ts` ← إدارة موظفي القسم
- `src/app/tenant-admin/academic/academic-client.tsx` ← واجهة الموظفين
- `src/app/tenant-admin/page.tsx` ← تحديث (بدون sections)
- `src/app/tenant-admin/tenant-admin-client.tsx` ← تحديث

**Academic Management Dashboard:**
- `src/app/academic-management/page.tsx`
- `src/app/academic-management/academic-management-client.tsx`
- `src/app/academic-management/circulars/actions.ts`
- `src/app/academic-management/circulars/page.tsx`
- `src/app/academic-management/analytics/`
- `src/app/academic-management/components/sidebar.tsx` ← إزالة رابط Sections

**Faculty Modules (تغيير section_id → course_id + semester_id):**
- `src/app/faculty/assignments/actions.ts`
- `src/app/faculty/assignments/page.tsx`
- `src/app/faculty/assignments/assignments-client.tsx`
- `src/app/faculty/attendance/actions.ts`
- `src/app/faculty/attendance/page.tsx`
- `src/app/faculty/attendance/attendance-client.tsx`
- `src/app/faculty/gradebook/page.tsx`
- `src/app/faculty/gradebook/gradebook-client.tsx`
- `src/app/faculty/materials/page.tsx`
- `src/app/faculty/materials/materials-client.tsx`
- `src/app/faculty/materials/actions.ts`
- `src/app/faculty/circulars/actions.ts`
- `src/app/faculty/circulars/page.tsx`
- `src/app/faculty/circulars/circulars-client.tsx`
- `src/app/faculty/risk-zone/actions.ts`
- `src/app/faculty/risk-zone/risk-zone-client.tsx`
- `src/app/faculty/messages/actions.ts`
- `src/app/faculty/messages/messages-client.tsx`
- `src/app/faculty/tickets/page.tsx`
- `src/app/faculty/page.tsx`
- `src/app/faculty/faculty-client.tsx`

**Student Modules (تغيير section_id → course_id):**
- `src/app/student/assignments/`
- `src/app/student/attendance/`
- `src/app/student/grades/`
- `src/app/student/materials/`
- `src/app/student/messages/`
- `src/app/student/tickets/`
- `src/app/student/circulars/`
- `src/app/student/page.tsx`
- `src/app/student/student-client.tsx`

**APIs والخدمات:**
- `src/app/api/analytics/compute-risk/route.ts`
- `src/lib/ai/personal-context-aggregator.ts`
- `src/lib/types/database.ts` ← إزالة SectionStatus, SectionType

### ملفات جديدة (8 ملفات):
```
src/app/tenant-admin/departments/staff/page.tsx
src/app/tenant-admin/departments/staff/actions.ts
src/app/tenant-admin/departments/staff/staff-client.tsx
src/app/student/schedule/page.tsx                       (اختياري: صفحة جدول الطالب)
src/app/student/schedule/actions.ts
src/app/student/schedule/schedule-client.tsx
src/app/academic-management/schedules/schedule-service.ts (منطق مشترك)
```

### ترحيلات قاعدة بيانات جديدة (7 ملفات):
```
supabase/migrations/20260701000001_create_course_schedules.sql
supabase/migrations/20260701000002_modify_enrollments.sql
supabase/migrations/20260701000003_add_department_staff.sql
supabase/migrations/20260701000004_migrate_section_data.sql
supabase/migrations/20260701000005_migrate_child_tables.sql
supabase/migrations/20260701000006_drop_old_tables.sql
supabase/migrations/20260701000007_update_rls_policies.sql
```

---

## 6. خطوات التنفيذ المقترحة

### المرحلة 1: التحضير (يوم 1)
1. إنشاء جميع ترحيلات قاعدة البيانات (7 ملفات)
2. تشغيلها في بيئة تطوير
3. التحقق من ترحيل البيانات بنجاح
4. عمل backup كامل لقاعدة البيانات

### المرحلة 2: جوهر النظام (يوم 2-3)
1. إعادة كتابة `academic-management/schedules/` بالكامل
2. إزالة `academic-management/sections/`
3. تحديث `student/register/` للتسجيل الآلي
4. تحديث `academic-management/enrollments/`

### المرحلة 3: المواد والخطط (يوم 4)
1. تحديث `courses/actions.ts` (soft delete)
2. تحديث `courses/catalog-client.tsx` (إضافة practical)
3. تحديث `study-plans/` (فلتر department_id)

### المرحلة 4: الأدوار والموظفين (يوم 5)
1. إنشاء `department_staff` واجهة وخدمات
2. تحديث `users/actions.ts` للأدوار الجديدة
3. تحديث `academic/` لإدارة الموظفين

### المرحلة 5: تحديث الـ Faculty والطلاب (يوم 6-8)
1. تحديث جميع صفحات Faculty (تغيير section_id إلى course_id)
2. تحديث جميع صفحات الطالب
3. تحديث لوحات المعلومات

### المرحلة 6: اللمسات النهائية (يوم 9-10)
1. تحديث RLS policies
2. تحديث الـ API والحسابات (risk, analytics)
3. تحديث الشريط الجانبي والروابط
4. اختبار شامل

---

## 7. التحقق والاختبار

### اختبار قاعدة البيانات

```sql
-- 1. التحقق من عدم وجود جدول sections
SELECT * FROM information_schema.tables WHERE table_name = 'sections';
-- → يجب أن يكون صفر نتائج

-- 2. التحقق من جداول جديدة
SELECT * FROM information_schema.tables WHERE table_name IN ('course_schedules', 'department_staff');
-- → يجب أن تكون موجودة

-- 3. التحقق من الأدوار الجديدة
SELECT enum_range(NULL::user_role);
-- → يجب أن تشمل head_of_department, secretary, ticket_technician, lecturer

-- 4. التحقق من هيكل enrollments الجديد
SELECT column_name FROM information_schema.columns WHERE table_name = 'enrollments';
-- → يجب أن تحتوي على course_id, semester_id, major_id, academic_level_id
-- → يجب ألا تحتوي على section_id

-- 5. التحقق من unique constraints
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'enrollments' AND constraint_type = 'UNIQUE';
-- → يجب أن يتضمن unique_student_course_semester
```

### اختبار السيناريو الكامل

```
1. إنشاء كلية ← قسم ← تخصص ← مستويات
2. إضافة مواد (نظري، عملي، نظري+عملي)
3. بناء خطة دراسية للتخصص (تأكد من ظهور مواد القسم فقط)
4. بناء جدول دراسي للتخصص (تأكد من فصل النظري والعملي)
5. إنشاء طالب مع تعيين تخصصه → تحقق تلقائي من تسجيله
6. عرض جدول الطالب → تأكد من ظهور مواد تخصصه
7. وصول المحاضر → تأكد من رؤية مواد مسؤولياته
8. كشف التعارضات → تأكد من عمل:
   - تعارض القاعة
   - تعارض المحاضر
   - تعارض الطلاب
   - تجاوز سعة القاعة
```

### قائمة التحقق النهائية

- [ ] جميع الترحيلات تعمل بنجاح
- [ ] لا يوجد كود يشير إلى `sections` table
- [ ] `deleteCourse()` يستخدم `.update()` وليس `.delete()`
- [ ] `practical` يظهر في قائمة أنواع المواد
- [ ] `department_id` إلزامي في المواد
- [ ] الخطط الدراسية تظهر مواد القسم فقط
- [ ] الجدول الدراسي يعرض لكل major/level/semester مع نظري/عملي منفصلين
- [ ] التسجيل الآلي يعمل عند إنشاء طالب
- [ ] الطالب يرى فقط مواد تخصصه في صفحة التسجيل
- [ ] faculty يرى مواده (بدون مفهوم شعب)
- [ ] check_schedule_conflicts() يعمل مع course_schedules
- [ ] التحقق من سعة القاعة يعمل
- [ ] الأدوار الجديدة (head_of_department, secretary, ticket_technician, lecturer) موجودة
- [ ] واجهة إدارة موظفي القسم تعمل
- [ ] الشريط الجانبي لا يحتوي على رابط "Sections"
- [ ] جميع صفحات الطالب تعمل (بدون section_id)
- [ ] جميع صفحات faculty تعمل (بدون section_id)
- [ ] dashboards تعمل (بدون sections)

---

*تم إعداد خطة الإصلاحات هذه بناءً على التقرير التفصيلي في `report-academic-workflow.md` ودراسة شاملة لكامل قاعدة البيانات والتطبيق.*
