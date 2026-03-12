# 🏫 النظام الفرعي 2: الشؤون الأكاديمية والهيكل — v2.0
### Academic Affairs & Structure System
**محدَّث بمراجع قاعدة البيانات الفعلية**

---

## 📌 نظرة عامة

| الحقل | التفاصيل |
|---|---|
| **هدف النظام** | بناء العمود الفقري التنظيمي للجامعة: الكليات والأقسام والخطط الدراسية والجداول |
| **الأدوار المرتبطة** | `tenant_admin` (البناء الأساسي) + `academic_management` (التخطيط والجدولة) |
| **الأولوية** | 🔴 حرجة — كل النظام يعتمد عليها |
| **المتطلب الرئيسي** | SR-2 / FR-TA2 / FR-AM1 → FR-AM3 |
| **ملف SQL** | `part1_core_system.sql` — القسم 5 |

---

## 🗄️ خريطة مخطط قاعدة البيانات (Database Schema Mapping)

### الجداول التي يعتمد عليها هذا النظام

| الجدول | الغرض | علاقات مهمة |
|---|---|---|
| `colleges` | الكليات | `dean_id → profiles`, `tenant_id → tenants` |
| `departments` | الأقسام | `college_id → colleges`, `head_id → profiles` |
| `faculty_departments` | ربط المحاضرين بالأقسام (M-M) | `is_primary BOOLEAN` — يدعم محاضراً في قسمين |
| `majors` | التخصصات/البرامج | `department_id`, `total_credits`, `duration_years` |
| `student_majors` | ربط الطلاب بالتخصصات | `is_primary BOOLEAN` |
| `academic_levels` | المستويات الدراسية | `UNIQUE (major_id, level_number)` |
| `courses` | كتالوج المقررات | ENUM: `course_type (theoretical/practical/hybrid)` |
| `study_plan_courses` | الخطة الدراسية (مقرر → مستوى) | ENUM: `plan_course_type (mandatory/elective)` |
| `course_prerequisites` | المتطلبات السابقة | `CHECK (course_id <> prerequisite_id)` لمنع التكرار |
| `semesters` | الفصول الدراسية | ENUM: `semester_status (planning/active/archived)` |
| `venues` | القاعات والمختبرات | ENUM: `venue_type (lecture_hall/lab/auditorium/other)` |
| `sections` | الشعب الدراسية | ENUM: `section_status (open/closed/archived/merged)` |
| `schedules` | الجدول الدراسي | ENUM: `schedule_day`, `schedule_status (draft/published)` |
| `syllabi` | خطط المقررات (Syllabus) | ENUM: `syllabus_status (draft/submitted/approved/rejected)` |
| `enrollments` | تسجيلات الطلاب | ENUM: `enrollment_status`, يُحدَّث بـ Trigger |

### ENUMs ذات الصلة

```sql
CREATE TYPE course_type AS ENUM ('theoretical', 'practical', 'hybrid');
CREATE TYPE semester_type AS ENUM ('first', 'second', 'summer');
CREATE TYPE semester_status AS ENUM ('planning', 'active', 'archived');
CREATE TYPE section_status AS ENUM ('open', 'closed', 'archived', 'merged');
CREATE TYPE schedule_day AS ENUM ('sunday','monday','tuesday','wednesday','thursday','friday','saturday');
CREATE TYPE schedule_status AS ENUM ('draft', 'published');
CREATE TYPE plan_course_type AS ENUM ('mandatory', 'elective');
CREATE TYPE enrollment_status AS ENUM ('enrolled','dropped','completed','failed','dismissed','withdrawn');
CREATE TYPE syllabus_status AS ENUM ('draft','submitted','approved','rejected');
CREATE TYPE venue_type AS ENUM ('lecture_hall','lab','auditorium','other');
```

### Triggers والدوال الحرجة

| Trigger / Function | يعمل على | الغرض |
|---|---|---|
| `trg_check_schedule_conflicts` | `schedules` (BEFORE INSERT/UPDATE) | كاشف التعارضات الثلاثة (مكاني/محاضر/طالب) |
| `check_schedule_conflicts()` | دالة مساعدة | RAISE EXCEPTION بنوع التعارض المحدد |
| `sync_section_enrolled_count()` | `enrollments` (AFTER INSERT/UPDATE/DELETE) | مزامنة `sections.enrolled_count` تلقائياً |
| `trg_enrollments_sync_count` | `enrollments` | يُشغِّل `sync_section_enrolled_count` |
| `trg_enrollments_update_gpa` | `enrollments` (AFTER UPDATE) | تحديث GPA الطالب عند اكتمال التسجيل |
| `auto_create_course_channel()` | `sections` (AFTER INSERT) | ينشئ قناة `channels` تلقائياً لكل شعبة جديدة |
| `calculate_student_gpa()` | تُستدعى يدوياً + Trigger | حساب GPA التراكمي وتحديث `student_profiles` |

### كيف يعمل كاشف التعارضات (من SQL)

```sql
-- الدالة check_schedule_conflicts() تتحقق من:
-- 1. التعارض المكاني: نفس venue_id + نفس day_of_week + تداخل الوقت
-- 2. تعارض المحاضر: نفس instructor_id + نفس day_of_week + تداخل الوقت
-- 3. تعارض الطالب: مسار إلزامي (plan_course_type='mandatory') + نفس academic_level + نفس الوقت
-- عند وجود تعارض → RAISE EXCEPTION بكود التعارض
```

---

## 🔐 سياسات RLS المُطبَّقة

| السياسة | الجدول | النطاق |
|---|---|---|
| `tenant_read_colleges` | `colleges` | جميع المستخدمين: قراءة بيانات جامعتهم |
| `tenant_admin_write_colleges` | `colleges` | Tenant Admin + Super Admin: كتابة |
| `tenant_read_departments` | `departments` | جميع المستخدمين: قراءة |
| `tenant_admin_write_departments` | `departments` | Tenant Admin فقط: كتابة |
| `admin_write_majors` | `majors` | Tenant Admin + Academic Management: كتابة |
| `admin_write_academic_levels` | `academic_levels` | Tenant Admin + Academic Management: كتابة |
| `admin_write_courses` | `courses` | Tenant Admin فقط: كتابة |
| `admin_write_study_plan_courses` | `study_plan_courses` | Tenant Admin + Academic Management: كتابة |
| `admin_write_prerequisites` | `course_prerequisites` | Tenant Admin + Academic Management: كتابة |
| `admin_write_semesters` | `semesters` | Tenant Admin + Academic Management: كتابة |
| `admin_write_venues` | `venues` | Tenant Admin + Academic Management: كتابة |
| `academic_management_write_sections` | `sections` | Academic Management: فتح/إغلاق/دمج الشعب |
| `academic_management_write_schedules` | `schedules` | Academic Management: إنشاء/تعديل الجدول |
| `tenant_read_schedules` | `schedules` | جميع المستخدمين: قراءة الجدول |
| `faculty_write_own_syllabi` | `syllabi` | المحاضر: كتابة خطة مقرراته فقط (`instructor_id = current_profile_id()`) |
| `student_read_own_enrollments` | `enrollments` | الطالب: قراءة تسجيلاته فقط |
| `faculty_read_section_enrollments` | `enrollments` | المحاضر: قراءة طلاب شعبه فقط |
| `admin_all_enrollments` | `enrollments` | Academic Management + Tenant Admin: صلاحية كاملة |

---

## ✅ قائمة المهام التفصيلية للمطورين

### 📁 بناء الهيكل الأكاديمي (Tenant Admin)

- [ ] **[FR-TA2.1]** بناء `POST /api/academic/colleges`:
  - `INSERT INTO colleges (tenant_id, name, code, dean_id)`
  - UNIQUE constraint: `(tenant_id, code)` — يُعيد خطأ واضحاً عند تكرار الكود
- [ ] **[FR-TA2.1]** بناء `POST /api/academic/departments`:
  - `INSERT INTO departments (tenant_id, college_id, name, code, head_id)`
  - `INSERT INTO faculty_departments (faculty_id, department_id, is_primary=TRUE)` لتعيين الرئيس
- [ ] **[FR-TA2.1]** بناء `POST /api/academic/majors`:
  - `INSERT INTO majors (tenant_id, department_id, name, code, total_credits, duration_years)`
- [ ] **[FR-TA2.2]** بناء `POST /api/academic/levels`:
  - `INSERT INTO academic_levels (tenant_id, major_id, level_number, name)`
  - UNIQUE constraint: `(major_id, level_number)` — لمنع تكرار المستوى
- [ ] **[FR-TA2.3]** بناء `POST /api/academic/courses`:
  - `INSERT INTO courses (tenant_id, department_id, code, name, credit_hours, course_type)`
  - `course_type` ENUM: `theoretical / practical / hybrid`
- [ ] **[FR-TA2.4]** بناء `POST /api/academic/study-plan`:
  - `INSERT INTO study_plan_courses (tenant_id, academic_level_id, course_id, semester_type, plan_course_type, min_grade_to_pass)`
  - `INSERT INTO course_prerequisites (tenant_id, course_id, prerequisite_id, min_grade)` للمتطلبات
  - CHECK constraint يمنع المقرر من كونه متطلباً لنفسه
- [ ] **[FR-TA4.1]** بناء `POST /api/venues`:
  - `INSERT INTO venues (tenant_id, name, code, venue_type, capacity, building, floor, has_projector, has_ac)`
  - `venue_type` ENUM: `lecture_hall / lab / auditorium / other`

### 📅 الفصول الدراسية والشعب (Academic Management)

- [ ] **[FR-TA1.2]** بناء `POST /api/semesters`:
  - `INSERT INTO semesters (tenant_id, name, academic_year, semester_type, status='planning', start_date, end_date, reg_start, reg_end, min_credit_hours, max_credit_hours, self_reg_enabled)`
  - CHECK: `start_date < end_date`
- [ ] **[FR-AM1.1]** بناء `PATCH /api/syllabi/{id}/review`:
  - `UPDATE syllabi SET status='approved', reviewed_by=..., reviewed_at=NOW()`
  - أو `status='rejected'` مع `review_notes`
- [ ] **[FR-AM1.2]** بناء `POST /api/sections`:
  - `INSERT INTO sections (tenant_id, course_id, semester_id, section_code, instructor_id, max_capacity)`
  - يُشغِّل Trigger `auto_create_course_channel` تلقائياً لإنشاء قناة المقرر
- [ ] **[FR-AM1.3]** بناء `PATCH /api/sections/{id}`:
  - تغيير `status` (ENUM: `open/closed/archived`)
  - دمج شعبتين: `UPDATE sections SET status='merged', merged_into_id=TARGET_ID WHERE id=SOURCE_ID`
- [ ] **[FR-AM1.4]** بناء `PATCH /api/semesters/{id}/registration-rules`:
  - تحديث `semesters.min_credit_hours`, `max_credit_hours`, `self_reg_enabled`
- [ ] **[FR-AM1.5]** بناء `POST /api/enrollments/batch`:
  - `INSERT INTO enrollments (tenant_id, student_id, section_id, semester_id)` لمجموعة طلاب
  - يُشغِّل Trigger `sync_section_enrolled_count` تلقائياً لتحديث `sections.enrolled_count`
  - يُشغِّل Trigger `auto_add_to_course_channel` لإضافة الطلاب لقناة المقرر

### 📐 بناء الجدول والكاشف الذكي (Academic Management)

- [ ] **[FR-AM2.1]** بناء `POST /api/schedules`:
  - `INSERT INTO schedules (tenant_id, section_id, venue_id, day_of_week, start_time, end_time, status='draft')`
  - **يُشغِّل Trigger `trg_check_schedule_conflicts` تلقائياً قبل الإدراج**
  - إذا وُجد تعارض → الـ DB يرفع `EXCEPTION` بنوعه: `SPATIAL_CONFLICT / FACULTY_CONFLICT / STUDENT_CONFLICT`
  - معالجة الـ Exception في الـ API وإعادتها للـ Frontend كـ error message واضح
- [ ] **[FR-AM2.2]** بناء منطق Frontend لعرض نوع التعارض:
  - `SPATIAL_CONFLICT` → "❌ القاعة محجوزة في هذا الوقت"
  - `FACULTY_CONFLICT` → "❌ المحاضر لديه محاضرة أخرى في نفس الوقت"
  - `STUDENT_CONFLICT` → "❌ مادة إلزامية لنفس المستوى في نفس الوقت"
- [ ] **[FR-AM2.3]** بناء `PATCH /api/schedules/publish`:
  - `UPDATE schedules SET status='published' WHERE semester_id=X AND tenant_id=Y`
  - إدراج `notifications` لجميع الطلاب والمحاضرين المعنيين بنوع `'schedule_change'`

### 📊 المراقبة والإشراف (Academic Management)

- [ ] **[FR-AM3.1]** بناء `GET /api/analytics/department-pulse`:
  - الشعب النشطة الآن: استعلام على `schedules` بـ `status='published'` والوقت الحالي
  - إحصائيات الحضور: `COUNT` من `attendance_records` لتاريخ اليوم
- [ ] **[FR-AM3.2]** بناء `GET /api/analytics/faculty-compliance`:
  - التحقق من رفع المحتوى: `COUNT(course_materials) BY section_id`
  - التحقق من تسجيل الدرجات: `COUNT(gradebook_entries WHERE is_published=TRUE) BY section_id`
- [ ] **[FR-AM3.3]** بناء `GET /api/analytics/attendance-report`:
  - قراءة من `attendance_summaries` حيث `absence_percentage >= threshold * 0.7`
  - مُرتَّبة تنازلياً حسب `absence_percentage`

### 🎨 الواجهة الأمامية

- [ ] **[FR-TA2.1]** مكوّن Collapsible Tree: يقرأ `colleges → departments → majors` عبر RLS
- [ ] **[FR-TA2.4]** مكوّن Flowchart للخطة الدراسية: يُشغِّل بيانات `study_plan_courses` + `course_prerequisites`
- [ ] **[FR-AM2.1]** مكوّن Week Grid: Drag & Drop لـ `schedule_day` ENUM + `start_time/end_time`
- [ ] **[FR-AM2.2]** مكوّن Conflict Alert: يُعرض فورياً عند استلام `SPATIAL_CONFLICT / FACULTY_CONFLICT / STUDENT_CONFLICT`
- [ ] **[FR-AM3.1]** صفحة نبض القسم: تقرأ من `attendance_summaries`, `sections`, `assignments`

---

## 🔗 الروابط مع أنظمة أخرى

| النظام | طبيعة العلاقة |
|---|---|
| **LMS** | `sections` + `schedules` هي أساس كل مقرر في LMS |
| **المراسلات** | Trigger `auto_create_course_channel` يُنشئ القناة عند إنشاء `sections` |
| **التعاميم** | `schedule_change` notification تُرسَل عند `status='published'` |
| **التحليلات** | `student_risk_scores` يرتبط بـ `sections` و`semesters` |

---

## 🧪 خطة الاختبار

- [ ] اختبار وحدة: `check_schedule_conflicts()` — إدراج تعارض مكاني متعمَّد وتأكيد رفع الـ EXCEPTION
- [ ] اختبار وحدة: `sync_section_enrolled_count()` — تسجيل 5 طلاب والتحقق من `sections.enrolled_count = 5`
- [ ] اختبار تكامل: إنشاء `section` جديدة والتحقق من إنشاء `channels` تلقائياً بـ Trigger
- [ ] اختبار RLS: `faculty` لا يستطيع `INSERT INTO schedules` (سياسة `academic_management_write_schedules`)
- [ ] اختبار E2E: بناء هيكل كلية → قسم → تخصص → خطة دراسية → فصل → شعبة → جدول مع تعارض وحله

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
