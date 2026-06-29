# تقرير شامل: مراجعة سير العمل الأكاديمي في نظام UniBot

> **تاريخ التقرير:** 2026-06-28
> **الهدف:** مراجعة وتقييم مدى تطبيق السيناريو الأكاديمي المكون من 7 خطوات رئيسية، وتحديد الناقص وغير المطبق والمطبق بشكل خاطئ.

---

## جدول ملخص النتائج

| # | الخطوة | الحالة |
|---|---|---|
| 1 | تسجيل الكليات | ✅ مطبّق بالكامل |
| 2 | تسجيل الأقسام والموظفين (رئيس قسم، سكرتير، فني، محاضر) | ⚠️ مطبّق بشكل ناقص |
| 3 | تسجيل التخصصات والمستويات الأكاديمية | ✅ مطبّق بالكامل |
| 4 | تسجيل المواد الدراسية | ❌ مطبّق ولكن به أخطاء |
| 5 | بناء الخطط الدراسية | ❌ مطبّق بشكل خاطئ |
| 6 | بناء جداول الفصل الدراسي | ❌ مطبّق بشكل خاطئ |
| 7 | تسجيل الطالب والتسجيل الآلي | ⬜ غير مطبّق تمامًا |
| — | الأدوار والصلاحيات | ❌ تحتاج إلى إعادة تصميم |

---

## تفاصيل المراجعة لكل خطوة

---

### ✅ الخطوة الأولى: تسجيل الكليات

**الوصف في السيناريو:** إضافة كليات جديدة مع إمكانية تعديلها وحذفها.

**الحالة: ✔️ مطبّق بالكامل**

**التفاصيل:**
- يوجد جدول `colleges` مع الحقول: `id, tenant_id, name, code, description, campus_id, is_active, created_at, updated_at`
- يوجد واجهة كاملة في `src/app/tenant-admin/academic/actions.ts` تحتوي على دوال `createCollege()` و `updateCollege()` و `deleteCollege()`
- واجهة المستخدم موجودة في `academic-client.tsx` مع نموذج `CollegeForm`
- التحقّق من `tenant_id` موجود عبر RLS policies

**ملاحظات إضافية:**
- `campus_id` مضاف عبر الترحيل `20260318001114` (اختياري)
- الحذف منطقي (soft delete) عبر `is_active = false` في دالة `deleteCollege()` ✅

---

### ⚠️ الخطوة الثانية: تسجيل الأقسام والموظفين

**الوصف في السيناريو:**
- تسجيل أقسام تابعة للكليات
- تسجيل موظفين (رئيس قسم، سكرتير، فني تذاكر، محاضر) وربطهم بقسم واحد

**الحالة: ❌ غير مكتملة — أجزاء مطبّقة وأجزاء مفقودة**

#### الجزء المطبق ✅

**الأقسام:**
- جدول `departments` مع الحقول: `id, tenant_id, college_id, name, code, description, head_id, is_active, created_at, updated_at`
- `head_id` يشير إلى `profiles.id` (FK)
- دالتا `createDepartment()` و `updateDepartment()` في `src/app/tenant-admin/academic/actions.ts`
- واجهة `DeptForm` في `academic-client.tsx`
- حقل `college_id` يربط القسم بالكلية

**إنشاء المستخدمين:**
- دالة `createUser()` في `src/app/tenant-admin/users/actions.ts` تنشئ:
  - مستخدم Auth
  - سجل في `profiles`
  - `faculty_departments` (لربط faculty بقسم)
  - `academic_management_departments` (لربط academic_management بقسم)
  - `student_profiles` و `student_majors` (للطلاب)

#### الجزء المفقود أو الخاطئ ❌

**1. أدوار الموظفين المطلوبة غير موجودة أساسًا**

السيناريو يتطلب أدوار: `head_of_department, secretary, ticket_technician, lecturer`

Enum `user_role` الموجود (في `20260307022710_part1_core_system.sql` السطر 26-32):
```sql
CREATE TYPE user_role AS ENUM (
  'super_admin',
  'tenant_admin',
  'academic_management',
  'faculty',
  'student'
);
```
- لا يوجد `head_of_department` — غير مطبّق تمامًا
- لا يوجد `secretary` — غير مطبّق تمامًا
- لا يوجد `ticket_technician` — غير مطبّق تمامًا
- لا يوجد `lecturer` — الصلاحية المستخدمة `faculty` هي أقرب بديل ولكنها عامة جدًا

**2. لا يوجد ربط صارم بين الموظفين والأقسام**

السيناريو يتطلب أن كل موظف مرتبط **بقسم واحد فقط**:
- `faculty_departments` يسمح بربط عدة أقسام بعضو هيئة تدريس — لا يوجد تقييد بقسم واحد
- `academic_management_departments` يسمح بربط عدة أقسام بمستخدم academic_management
- لا يوجد جدول `department_staff` يحدد بوضوح الموظفين الإداريين في القسم وأدوارهم

**3. `departments.head_id` مجرد مفتاح أجنبي بدون صلاحيات**

- لا توجد RLS policy تستخدم `head_id` لمنح صلاحيات خاصة لرئيس القسم
- لا يوجد تحقق من أن المستخدم المُعيَّن كـ `head_id` لديه بالفعل صلاحية رئيس قسم
- لا توجد قيود على `head_id` عند إنشاء/تحديث القسم

**4. رابط الموظفين (Employees/Staff) منعدم تمامًا**

- لا يوجد مسار (route) منفصل لإدارة الموظفين غير الأكاديميين
- لا توجد واجهة لتعيين سكرتير أو فني تذاكر
- صلاحيات هؤلاء الموظفين (secretary, ticket_technician) غير محددة في النظام

**ملفات ذات علاقة:**
- `supabase/migrations/20260307022710_part1_core_system.sql` — تعريف user_role enum والأقسام
- `src/app/tenant-admin/users/actions.ts` — إنشاء المستخدمين (`createUser`)
- `src/app/tenant-admin/academic/actions.ts` — إدارة الأقسام
- `supabase/migrations/20260313222415_intra_tenant_isolation.sql` — `academic_management_departments`

---

### ✅ الخطوة الثالثة: تسجيل التخصصات والمستويات الأكاديمية

**الوصف في السيناريو:** إضافة تخصصات تابعة للأقسام مع تحديد عدد المستويات (سنوات دراسية).

**الحالة: ✔️ مطبّق بالكامل**

**التفاصيل:**
- جدول `majors`: `id, tenant_id, department_id, name, code, description, duration_years, total_levels, is_active`
- جدول `academic_levels`: `id, tenant_id, major_id, name, level_number, is_active`
- دالتا `createMajor()` و `updateMajor()` تنشئان المستويات تلقائيًا بناءً على `duration_years` (السطور 164-177 في `actions.ts`)
- واجهة `MajorForm` و `LevelForm` في `academic-client.tsx`
- `department_id` يربط التخصص بالقسم (موجود وحقل إلزامي)
- المستويات تُعرض في شجرة هرمية: College → Department → Major → Levels
- `total_levels` = `duration_years * 2` (فصلان دراسيان لكل سنة)

**ملاحظات إضافية:**
- ربط التخصص بالقسم موجود، لكن السيناريو يتطلب أيضًا أن الخطط الدراسية تقتصر على مواد القسم — وهذا مفقود وسيتم تغطيته في الخطوة 5

---

### ❌ الخطوة الرابعة: تسجيل المواد الدراسية

**الوصف في السيناريو:** إضافة مواد دراسية مرتبطة بالأقسام.

**الحالة: ⚠️ مطبّق ولكن به مشاكل**

#### الجزء المطبق ✅

- جدول `courses`: `id, tenant_id, department_id, code, name, description, credits, lecture_credits, lab_credits, course_type, is_active, created_at, updated_at`
- أنواع المواد: `theoretical, practical, hybrid` (في قاعدة البيانات)
- `course_type = hybrid` يتطلب lecture + lab sections
- `course_prerequisites` مع `min_grade`
- دوال CRUD في `src/app/tenant-admin/courses/actions.ts`

#### المشاكل ❌

**1. حذف مادي (Hard DELETE) بدل الحذف المنطقي**

في `src/app/tenant-admin/courses/actions.ts` السطر 79-87:
```typescript
async function deleteCourse(courseId: string) {
  const supabase = await getServiceClient();
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);
}
```
يستخدم `.delete()` لحذف المادة نهائيًا من قاعدة البيانات بدلاً من تعيين `is_active = false`. هذا خطأ لأن:
- النظام صمم `is_active` للحذف المنطقي
- الحذف المادي يدمّر البيانات التاريخية (خطط دراسية قديمة، جداول سابقة)
- يجب تغيير `.delete()` إلى `.update({ is_active: false })`

**2. `department_id` غير إلزامي (nullable)**

في قاعدة البيانات، `department_id` يمكن أن يكون `null`. بينما السيناريو يتطلب كل مادة تابعة لقسم واحد. رغم أن الواجهة تطلب اختيار قسم لكن القاعدة تسمح بقيم `null`.

**3. `practical` course_type غير موجود في واجهة الاختيار**

في `src/app/tenant-admin/courses/catalog-client.tsx` السطور 322-328:
```typescript
const courseTypes = [
  { value: "theoretical", label: "نظري" },
  { value: "hybrid", label: "نظري+عملي" },
];
```
نوع `practical` (عملي فقط) غير مضمن في واجهة الاختيار، رغم أنه موجود في ENUM.
يجب إضافة `{ value: "practical", label: "عملي" }`.

---

### ❌ الخطوة الخامسة: بناء الخطط الدراسية

**الوصف في السيناريو:**
- اختيار المواد الدراسية المخصصة لكل تخصص
- يجب أن تظهر مواد القسم فقط (التصفية حسب department_id للتخصص)
- تعيين المستوى والفصل الدراسي لكل مادة
- عرضها في جدول (مستويات × فصول دراسية)

**الحالة: ❌ مطبّق بشكل خاطئ — خطأ جوهري في تصفية المواد**

#### الجزء المطبق ✅

- جدول `study_plan_courses`: `id, tenant_id, major_id, academic_level_id, course_id, semester_type, plan_course_type, min_grade_to_pass, created_at, updated_at`
- عرض الجدول (Grid) في `study-plan-client.tsx` — صفوف = مستويات، أعمدة = فصول دراسية
- `addStudyPlanCourse()` في `actions.ts` تدعم `academic_level_id, course_id, semester_type`
- `plan_course_type` يحدد: `compulsory, optional, elective`
- `course_prerequisites` مع `min_grade`
- إضافة مواد وسحبها من الخطة الدراسية

#### الخطأ الجوهري ❌

**تصفية المواد حسب القسم غير موجودة على الإطلاق**

السيناريو ينص بوضوح: "يجب أن تظهر فقط المواد التابعة لنفس قسم التخصص"

في `src/app/tenant-admin/study-plans/actions.ts` السطر 22-35:
```typescript
async function getCourses() {
  const supabase = await getServiceClient();
  const profile = await getProfile(supabase);
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("code");
  return data || [];
}
```
جلب جميع المواد النشطة دون أي تصفية حسب `department_id`.

**تداعيات هذا الخطأ:**
- يمكن إضافة مواد غير تابعة لقسم التخصص إلى الخطة الدراسية
- لا توجد علاقة منطقية بين مواد الخطة وتخصص الطالب
- في الخطوات التالية (الجدول والتسجيل) ستظهر مواد غير ذات صلة بالتخصص

**التصحيح المطلوب:**
يجب تعديل `getCourses()` لتأخذ `department_id` من التخصص المُختار وتُفلتر المواد:
```typescript
const { data, error } = await supabase
  .from("courses")
  .select("*")
  .eq("tenant_id", profile.tenant_id)
  .eq("department_id", selectedMajorDepartmentId) // تصفية حسب قسم التخصص
  .eq("is_active", true)
  .order("code");
```

**ملفات ذات علاقة:**
- `src/app/tenant-admin/study-plans/actions.ts` — السطر 22-35: `getCourses()` بدون فلتر قسم
- `src/app/tenant-admin/study-plans/study-plan-client.tsx` — السطر 502-507: `availableCourses` فلتر يمنع المكررات فقط
- `src/app/tenant-admin/study-plans/page.tsx` — السطر 15-20: جلب كل المواد بدون فلتر
- `src/app/tenant-admin/study-plans/study-plan-client.tsx` — السطر 145-149: `getCellCourses()` ترشح بـ levelId و semester فقط

---

### ❌ الخطوة السادسة: بناء جداول الفصل الدراسي

**الوصف في السيناريو:**
- بناء جداول لكل تخصص/مستوى على حدة
- تصفية المواد حسب التخصص والمستوى والفصل الدراسي من الخطة الدراسية
- تحديد اليوم والوقت والقاعة (الموقع)
- تعيين المدرس (instructor) للمادة

**الحالة: ❌ مطبّق بشكل خاطئ — مفقود جزئيًا**

#### الجزء المطبق ✅

- جدول `schedules`: `id, tenant_id, section_id, venue_id, day_of_week, start_time, end_time, semester_id`
- جدول `sections`: يربط المادة (course) بشعبة مع مدرّس
- `check_schedule_conflicts()` trigger: يراقب تعارضات المكان والتعارضات الزمنية للمدرّس والطالب
- `venues`: مع `capacity, type, building, floor, is_active`
- `day_of_week`: 1-6 (السبت إلى الخميس)

#### المشاكل ❌

**1. الجدول مبني لكل شعبة (section) وليس لكل تخصص/مستوى**

السيناريو يتطلب بناء جدول لكل `(major_id, academic_level_id, semester_type)` بشكل منفصل.
النظام الحالي يبني الجدول لكل شعبة (section) — أي مادة بشكل فردي دون تجميعها في جدول واحد للتخصص.

**2. `createSchedule()` لا يقبل `instructor_id`**

في `src/app/academic-management/schedules/actions.ts` السطر 68-97:
```typescript
async function createSchedule(params: {
  section_id: string;
  venue_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  semester_id: string;
}) { ... }
```
لا يوجد حقل `instructor_id` — المدرّس يُحدد على مستوى الـ section (في `sections.instructor_id`)، لكن هذا لا يسمح بتعيين مدرّسين مختلفين لنفس الشعبة في أيام مختلفة.

**3. لا توجد واجهة لعرض الجدول كاملًا للتخصص**

لا يوجد عرض "جدول تخصص السنة الأولى الفصل الأول" بل يتم عرض الشعب بشكل فردي.

**4. تصفية مواد الجدول حسب الخطة الدراسية موجودة ولكنها غير كافية**

السطر 53 في `schedules/page.tsx` يحاول تصفية الـ sections حسب `study_plan_courses` لكن المنطق لا يضمن أن المادة مضمنة بالفعل في خطة التخصص.

**5. الموقع والوقت: مطبّق ولكن بدون التحقق من سعة القاعة**

- `venues` لها `capacity` ولكن لا يوجد تحقق من أن سعة القاعة مناسبة لعدد الطلاب في الشعبة
- التعارضات (conflicts) يتم التحقق منها على مستوى قاعدة البيانات لكن لا توجد رسائل خطأ واضحة للمستخدم

**ملفات ذات علاقة:**
- `src/app/academic-management/schedules/actions.ts` — `createSchedule()` بدون instructor_id
- `src/app/academic-management/schedules/schedules-client.tsx` — `AddLectureModal`
- `supabase/migrations/20260307022710_part1_core_system.sql` — تعريف الجداول والمشغلات
- `src/app/academic-management/schedules/page.tsx` — منطق التصفية

---

### ⬜ الخطوة السابعة: تسجيل الطالب والتسجيل الآلي في المواد

**الوصف في السيناريو:**
- تسجيل طالب جديد وتعيين تخصصه ومستواه
- تسجيل الطالب **تلقائيًا** في جميع مواد جدول تخصصه حسب (major_id, academic_level_id, semester_type)
- التقيّد بمواد الخطة الدراسية فقط
- التحقق من المتطلبات الأساسية (prerequisites)

**الحالة: ❌ غير مطبّق — أجزاء صغيرة فقط مطبّقة**

#### الجزء المطبق ✅

- `createUser()` تنشئ `student_profiles` و `student_majors` مع `academic_level_id`
- `selfEnroll()` و `batchEnroll()` تقومان بالتسجيل في المواد ولكن...
- التحقق من `course_prerequisites` موجود في مساري التسجيل

#### الجزء المفقود تمامًا ⬜

**1. لا يوجد تسجيل آلي (Auto-enrollment)**

السيناريو يتطلب: "عند تسجيل طالب جديد يتم تسجيله تلقائيًا في جميع مواد جدول تخصصه"
النظام الحالي:
- `selfEnroll()`: الطالب يبحث عن section ويسجل نفسه يدويًا — غير آلي
- `batchEnroll()`: مدير أكاديمي يحدد sections وطلاب ويسجلهم يدويًا — غير آلي
- **لا توجد دالة تسجل الطالب تلقائيًا في جميع مواد جدول تخصصه**

**2. `getAvailableSections()` لا تقرأ تخصص الطالب**

في `src/app/student/register/actions.ts` السطر 7-63:
```typescript
async function getAvailableSections() {
  ...
  const { data: sections, error } = await supabase
    .from("sections")
    .select(`
      ...,
      courses!inner(...)
    `)
    .eq("tenant_id", profile.tenant_id)
    .eq("is_open", true)
    ...
}
```
الاستعلام لا يستخدم `student_majors` إطلاقًا.
الطالب يرى جميع الشعب المفتوحة بغض النظر عن تخصصه ومستواه.

**3. `batchEnroll()` لا تتحقق من تخصص الطالب**

في `src/app/academic-management/enrollments/actions.ts` السطر 55-192:
```typescript
export async function batchEnroll(params: {
  sectionIds: string[];
  studentIds: string[];
}) { ... }
```
الدالة تتحقق فقط من:
- عدم وجود تسجيل مكرر (`duplicate_check`)
- المتطلبات الأساسية (`prerequisites_check`)
- **لا تتحقق مما إذا كانت المادة ضمن خطة الطالب**
- **لا تتحقق من تطابق major_id/level_id**

**التصحيح المطلوب:**
1. إنشاء دالة `autoEnrollStudent(studentId, majorId, academicLevelId, semesterType)`:
   - تقرأ `study_plan_courses` للـ `majorId`
   - تُفلتر حسب `academic_level_id` و `semester_type`
   - تبحث عن `sections` مفتوحة لكل مادة
   - تسجل الطالب في جميع الشعب المناسبة

2. تعديل `getAvailableSections()` لتصفية حسب:
   - `student_majors.major_id` للطالب الحالي
   - `academic_level_id` الحالي للطالب
   - `semester_type` الحالي

3. تعديل `batchEnroll()` لتشمل التحقق من:
   - major_id للطالب
   - academic_level_id للطالب
   - أن المادة ضمن study_plan_courses

**ملفات ذات علاقة:**
- `src/app/student/register/actions.ts` — `getAvailableSections()` و `selfEnroll()`
- `src/app/student/register/register-client.tsx` — واجهة تسجيل الطالب
- `src/app/academic-management/enrollments/actions.ts` — `batchEnroll()`
- `src/app/academic-management/enrollments/enrollments-client.tsx` — واجهة التسجيل الجماعي

---

## ❌ مشكلة شاملة: نظام الأدوار والصلاحيات

**الوصف في السيناريو:** خمسة أدوار محددة (رئيس قسم، سكرتير، فني تذاكر، محاضر، طالب) مع صلاحيات مختلفة.

**الحالة: ❌ لا يتطابق مع السيناريو**

**ما هو موجود:**
```sql
CREATE TYPE user_role AS ENUM (
  'super_admin',     -- ✅
  'tenant_admin',    -- ✅
  'academic_management', -- ❌ واسع جدًا (يجمع رئيس قسم + سكرتير + فني)
  'faculty',         -- ❌ عام جدًا (محاضر + مساعد تدريس + باحث)
  'student'          -- ✅
);
```

**ما هو مطلوب وفق السيناريو:**
| الدور المطلوب | الموجودة | ملاحظة |
|---|---|---|
| `super_admin` | ✅ | موجود |
| `tenant_admin` | ✅ | موجود |
| `head_of_department` | ❌ | غير موجود — يستخدم `academic_management` بدلًا منه |
| `secretary` | ❌ | غير موجود — يستخدم `academic_management` بدلًا منه |
| `ticket_technician` | ❌ | غير موجود — غير معرّف في النظام |
| `lecturer` | ❌ | غير موجود — يستخدم `faculty` بدلًا منه |
| `student` | ✅ | موجود |

**تداعيات:**
- لا يمكن منح صلاحيات مختلفة لرئيس القسم مقابل السكرتير
- لا يمكن تقييد فني التذاكر بتذاكر الدعم فقط
- لا توجد RLS policies تستخدم أدوارًا تفصيلية
- كل مستخدمي `academic_management` لديهم نفس الصلاحيات

---

## ❌ مشكلة شاملة: الفصل الدراسي (Semester State Machine)

**الوصف في السيناريو:** الفصل الدراسي الحالي (active semester) هو المرجع لكل العمليات.

**الحالة: ⚠️ موجود ولكن غير مستخدم بشكل كافٍ**

**ما هو موجود:**
- جدول `semesters` مع حالة `planning → registration → active → grade_freeze → archived`
- `is_current` flag لتحديد الفصل الحالي
- realtime trigger على `semester_state` في قاعدة البيانات

**ما هو مفقود:**
- دوال `getCurrentSemester()` غير مستخدمة بشكل ثابت عبر النظام
- بعض الدوال (مثل `selfEnroll`) لا تتحقق من أن semester_state = 'registration'
- لا توجد آلية واضحة لانتقال الطالب بين المستويات الأكاديمية في بداية كل فصل

---

## توصيات الأولوية

### أولوية عالية (حرجة — يجب الإصلاح فورًا)

| # | المشكلة | التأثير |
|---|---|---|
| 1 | إضافة أدوار `head_of_department`, `secretary`, `ticket_technician`, `lecturer` إلى user_role ENUM | لا يمكن تمييز الصلاحيات بدونها |
| 2 | تصفية المواد حسب `department_id` في صفحة الخطط الدراسية | خطأ جوهري — الخطوة 5 |
| 3 | تفعيل التسجيل الآلي (auto-enrollment) | الخطوة 7 غير مطبّقة |
| 4 | تصفية الشعب حسب `student_majors` في تسجيل الطالب | الخطوة 7 — الطالب يرى كل المواد |
| 5 | تغيير `deleteCourse()` من حذف مادي إلى `is_active = false` | يمنع فقدان البيانات |

### أولوية متوسطة

| # | المشكلة | التأثير |
|---|---|---|
| 6 | إضافة `practical` إلى واجهة اختيار course_type | نقص في واجهة المواد |
| 7 | إضافة `instructor_id` إلى `createSchedule()` | الخطوة 6 — تعيين المدرّس |
| 8 | إنشاء جدول `department_staff` للربط الصارم بين الموظفين والأقسام | الخطوة 2 |
| 9 | عرض الجدول كاملًا للتخصص والمستوى | الخطوة 6 — تحسين العرض |
| 10 | إضافة التحقق من سعة القاعة عند إنشاء الجدول | تحسين لجودة النظام |

### أولوية منخفضة

| # | المشكلة |
|---|---|
| 11 | جعل `department_id` إلزاميًا (NOT NULL) في جدول `courses` |
| 12 | توحيد استخدام `getCurrentSemester()` عبر كل الدوال |
| 13 | إضافة RLS policies تستخدم `departments.head_id` لصلاحيات رئيس القسم |

---

## الملخص النهائي

| معيار | العدد | النسبة |
|---|---|---|
| ✅ مطبّق بالكامل | 2 من 7 | 28.6% |
| ⚠️ مطبّق بشكل ناقص/خاطئ | 4 من 7 | 57.1% |
| ⬜ غير مطبّق تمامًا | 1 من 7 | 14.3% |
| ❌ مشاكل إضافية (أدوار، فصل دراسي) | 2 | — |

النظام الحالي يوفر بنية تحتية جيدة (جداول قاعدة بيانات متكاملة، RLS policies، triggers) ولكنه يفشل في تحقيق متطلبات السيناريو في:
1. **تصفية المواد حسب القسم** في الخطط الدراسية (خطأ جوهري)
2. **التسجيل الآلي** للطلاب حسب تخصصهم (غير مطبّق)
3. **نظام الأدوار التفصيلية** (غير مطابق للسيناريو)
4. **ربط الموظفين الإداريين** بالأقسام بأدوار محددة

التعديلات المطلوبة ليست جذرية — معظمها يتعلق بإضافة تحققات وتصفيات في طبقة الخدمة (Service Layer) مع إضافات بسيطة في قاعدة البيانات (أدوار إضافية، جدول department_staff).

---

*تم إعداد هذا التقرير بناءً على مراجعة شاملة لكود المصدر وقاعدة البيانات والواجهات في نظام UniBot.*
