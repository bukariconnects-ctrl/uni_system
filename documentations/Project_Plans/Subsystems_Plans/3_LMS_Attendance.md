# 📚 النظام الفرعي 3: LMS وإدارة الحضور — v2.0
### Learning Management System & Attendance
**محدَّث بمراجع قاعدة البيانات الفعلية**

---

## 📌 نظرة عامة

| الحقل | التفاصيل |
|---|---|
| **هدف النظام** | بيئة التعلم اليومية: رفع المحتوى + إدارة التكاليف + تسجيل الأداء + الحضور الذكي |
| **الأدوار المرتبطة** | `faculty` (مُدير) + `student` (مُستفيد) + `academic_management` (مُشرف) |
| **الأولوية** | 🔴 حرجة |
| **المتطلب الرئيسي** | SR-3 / FR-FM1→FR-FM3 / FR-ST2→FR-ST3 |
| **ملف SQL** | `part2_lms_messaging_ai_ticketing.sql` — القسم 7 |

---

## 🗄️ خريطة مخطط قاعدة البيانات

| الجدول | الغرض | حقول مهمة |
|---|---|---|
| `course_materials` | المحتوى التعليمي | `is_ai_approved BOOLEAN`, `is_published BOOLEAN`, `week_number`, `content_type ENUM` |
| `assignments` | التكاليف والواجبات | `due_date TIMESTAMPTZ`, `allow_late BOOLEAN`, `is_published BOOLEAN` |
| `submissions` | تسليمات الطلاب | ENUM: `submission_status`, `graded_by UUID` |
| `gradebook_entries` | سجل الدرجات | `total_grade` — **GENERATED COLUMN** (30%+30%+40%) |
| `attendance_sessions` | جلسات الحضور | `qr_code TEXT`, `qr_expires_at`, `geo_latitude/longitude`, `geo_radius_m`, `is_open BOOLEAN` |
| `attendance_records` | سجلات الحضور الفردية | ENUM: `attendance_status`, `method VARCHAR(30)`, `modified_by` |
| `attendance_summaries` | ملخص الحضور المُحسَب | `absence_percentage`, `is_dismissed BOOLEAN` — يُحدَّث بـ Trigger |
| `syllabi` | خطة المقرر | ENUM: `syllabus_status (draft/submitted/approved/rejected)` |

### ENUMs ذات الصلة

```sql
CREATE TYPE content_type AS ENUM ('video','pdf','audio','presentation','document','link','other');
CREATE TYPE submission_status AS ENUM ('submitted','late','graded','resubmit_requested');
CREATE TYPE attendance_status AS ENUM ('present','absent','late','excused');
CREATE TYPE syllabus_status AS ENUM ('draft','submitted','approved','rejected');
```

### الـ Triggers والدوال الحرجة

| Trigger / Function | يعمل على | الوصف |
|---|---|---|
| `trg_recalc_attendance_summary` | `attendance_records` (AFTER INSERT/UPDATE/DELETE) | يستدعي `recalculate_attendance_summary()` |
| `recalculate_attendance_summary()` | دالة | تحسب `absence_percentage` + تُعيِّن `is_dismissed=TRUE` عند تجاوز الحد + تُحدِّث `enrollments.status='dismissed'` |
| `trg_notify_absence_warning` | `attendance_summaries` (AFTER INSERT/UPDATE) | يُدرج في `notifications` عند `absence_percentage >= threshold * 0.7` |
| `notify_absence_warning()` | دالة | نوع الإشعار: `'absence_warning'` أو `'absence_dismissal'` |
| `trg_sync_final_grade` | `gradebook_entries` (BEFORE UPDATE) | عند `is_published=TRUE` → يُحدِّث `enrollments.final_grade + letter_grade` |
| `sync_enrollment_final_grade()` | دالة | يحسب `letter_grade` (A+/A/B+/.../F) من `total_grade` |
| `trg_enrollments_update_gpa` | `enrollments` (AFTER UPDATE) | يستدعي `update_student_gpa_trigger()` → `calculate_student_gpa()` |

### كيف يعمل `gradebook_entries.total_grade` (Generated Column)

```sql
-- total_grade محسوبة تلقائياً بقاعدة البيانات — لا يمكن كتابتها يدوياً
total_grade NUMERIC(6,2) GENERATED ALWAYS AS (
    COALESCE(coursework_grade, 0) * 0.30 +
    COALESCE(midterm_grade, 0)    * 0.30 +
    COALESCE(final_grade, 0)      * 0.40
) STORED
```

---

## 🔐 سياسات RLS المُطبَّقة

| السياسة | الجدول | النطاق |
|---|---|---|
| `student_read_published_materials` | `course_materials` | الطالب يقرأ المواد المنشورة في شعبه المسجَّل بها (`is_published=TRUE`) |
| `faculty_manage_own_materials` | `course_materials` | المحاضر: كتابة مواد شعبه فقط (`uploaded_by = current_profile_id()`) |
| `student_read_published_assignments` | `assignments` | الطالب: قراءة التكاليف المنشورة لشعبه |
| `faculty_manage_assignments` | `assignments` | المحاضر: كامل على تكاليف شعبه (`created_by = current_profile_id()`) |
| `student_manage_own_submissions` | `submissions` | الطالب: إدارة تسليماته فقط (`student_id = current_profile_id()`) |
| `faculty_read_section_submissions` | `submissions` | المحاضر: قراءة تسليمات شعبه |
| `faculty_grade_submissions` | `submissions` | المحاضر: تحديث الدرجات فقط (UPDATE) |
| `student_read_own_grades` | `gradebook_entries` | الطالب: درجاته المنشورة فقط (`is_published=TRUE`) |
| `faculty_manage_own_section_gradebook` | `gradebook_entries` | المحاضر: إدارة سجل درجات شعبه |
| `faculty_manage_own_attendance_sessions` | `attendance_sessions` | المحاضر: إدارة جلسات حضور شعبه |
| `student_read_own_attendance_sessions` | `attendance_sessions` | الطالب: قراءة جلسات الحضور لشعبه |
| `student_checkin_attendance` | `attendance_records` | الطالب: INSERT فقط على **جلسات مفتوحة** (`is_open=TRUE`) |
| `student_read_own_attendance_records` | `attendance_records` | الطالب: بيانات حضوره فقط |
| `faculty_manage_attendance_records` | `attendance_records` | المحاضر: كامل على شعبه (تعديل يدوي) |
| `student_read_own_attendance_summary` | `attendance_summaries` | الطالب: ملخص حضوره فقط |
| `admin_faculty_read_attendance_summaries` | `attendance_summaries` | Admin + Faculty: قراءة جميع الملخصات |

---

## ✅ قائمة المهام التفصيلية للمطورين

### 📤 إدارة محتوى المقرر (Faculty)

- [ ] **[FR-FM1.1]** بناء `POST /api/syllabi`:
  - `INSERT INTO syllabi (tenant_id, section_id, instructor_id, content JSONB, status='draft')`
  - هيكل `content` JSON: `[{week: 1, topics: [...], objectives: [...]}]`
- [ ] **[FR-FM1.2]** بناء `POST /api/courses/{section_id}/materials`:
  - رفع الملف لـ Supabase Storage → الحصول على `file_url`
  - `INSERT INTO course_materials (tenant_id, section_id, uploaded_by, title, content_type, file_url, week_number, is_ai_approved=FALSE, is_published=FALSE)`
- [ ] **[FR-FM1.3]** بناء `PATCH /api/materials/{id}/ai-approve`:
  - `UPDATE course_materials SET is_ai_approved=TRUE WHERE id=X AND uploaded_by=current_profile_id()`
  - عند التفعيل → استدعاء Edge Function لـ RAG Ingestion Pipeline (تقطيع النص + توليد Embeddings → `ai_document_chunks`)
  - عند الإلغاء → `UPDATE ai_knowledge_documents SET is_active=FALSE` لوقف UniBot عن الإجابة منها
- [ ] **[FR-FM1.4]** بناء `POST /api/courses/{section_id}/copy-materials?from_section={id}`:
  - نسخ `course_materials` من شعبة سابقة (بنفس `course_id`)
  - `is_published=FALSE` في النسخة الجديدة (تحتاج نشراً يدوياً)

### 📝 التقييم والتصحيح (Faculty)

- [ ] **[FR-FM2.1]** بناء `POST /api/assignments`:
  - `INSERT INTO assignments (tenant_id, section_id, created_by, title, description, max_grade, due_date, allow_late, is_published=FALSE, week_number)`
  - عند `is_published=TRUE` → إدراج `notifications` لطلاب الشعبة بنوع `'assignment_due'`
- [ ] **[FR-FM2.2]** بناء `PATCH /api/submissions/{id}/grade`:
  - `UPDATE submissions SET grade=X, feedback=Y, graded_at=NOW(), graded_by=current_profile_id(), status='graded'`
  - سياسة `faculty_grade_submissions` تسمح فقط لمحاضر الشعبة
- [ ] **[FR-FM2.3]** بناء `PUT /api/gradebook/{section_id}/{student_id}`:
  - `INSERT INTO gradebook_entries (tenant_id, enrollment_id, section_id, student_id, coursework_grade, midterm_grade, final_grade)`
  - أو `UPDATE ... SET coursework_grade=X, midterm_grade=Y, final_grade=Z`
  - `total_grade` تُحسَب **تلقائياً** بـ DB (Generated Column — لا حاجة لإرسالها)
- [ ] **[FR-AM1.1]** بناء `PATCH /api/gradebook/{section_id}/publish`:
  - `UPDATE gradebook_entries SET is_published=TRUE WHERE section_id=X`
  - **يُشغِّل `trg_sync_final_grade`** تلقائياً → يُحدِّث `enrollments.final_grade + letter_grade`
  - **يُشغِّل `trg_enrollments_update_gpa`** → `calculate_student_gpa()` لكل طالب

### 📋 إدارة الحضور الذكي (Faculty)

- [ ] **[FR-FM3.1]** بناء `POST /api/attendance/sessions`:
  - `INSERT INTO attendance_sessions (tenant_id, section_id, schedule_id, session_date, start_time, is_open=TRUE)`
  - إنشاء `attendance_records` تلقائياً لكل طالب مسجَّل بـ `status='absent'` كافتراضي
- [ ] **[FR-FM3.2 — QR]** بناء `POST /api/attendance/sessions/{id}/qr`:
  - توليد `qr_code` (HMAC-signed token) + `qr_expires_at = NOW() + 10 seconds`
  - `UPDATE attendance_sessions SET qr_code=X, qr_expires_at=Y`
  - Polling من Frontend كل 8 ثوانٍ لتجديد الـ QR تلقائياً
- [ ] **[FR-FM3.2 — Geo]** بناء `PATCH /api/attendance/sessions/{id}/geo`:
  - `UPDATE attendance_sessions SET geo_latitude=X, geo_longitude=Y, geo_radius_m=100`
- [ ] **[FR-FM3.3]** بناء `PATCH /api/attendance/records/{id}`:
  - `UPDATE attendance_records SET status='excused', modified_by=current_profile_id(), modified_at=NOW(), modification_reason=Y`
  - يُسجِّل في `audit_logs` بـ `action='attendance_modify'`

### ✅ تسجيل الحضور (Student)

- [ ] **[FR-ST3.1 — QR]** بناء `POST /api/attendance/checkin/qr`:
  - التحقق من صحة `qr_code` وعدم انتهاء `qr_expires_at`
  - `INSERT INTO attendance_records` حيث `student_id=current_profile_id(), status='present', method='qr_code'`
  - سياسة `student_checkin_attendance` تضمن أن الجلسة `is_open=TRUE`
  - **يُشغِّل `trg_recalc_attendance_summary`** → `recalculate_attendance_summary()`
  - إذا تجاوزت `absence_percentage >= threshold * 0.7` → **يُشغِّل `trg_notify_absence_warning`**
- [ ] **[FR-ST3.1 — Geo]** بناء `POST /api/attendance/checkin/geo`:
  - التحقق من المسافة: `haversine(student_lat, student_lng, session_lat, session_lng) <= geo_radius_m`
  - نفس منطق `attendance_records` INSERT
- [ ] **[FR-ST3.2]** بناء `GET /api/attendance/my-summary`:
  - قراءة من `attendance_summaries` بسياسة `student_read_own_attendance_summary`
  - يُعيد: `absence_percentage`, `is_dismissed`, `total_sessions`, `attended_sessions`

### 🔍 بيانات الطالب (Student Views)

- [ ] **[FR-ST2.1]** بناء `GET /api/courses/{section_id}/materials`:
  - فلترة: `is_published=TRUE` — سياسة `student_read_published_materials`
  - مُرتَّبة حسب `week_number ASC`
- [ ] **[FR-ST2.2]** بناء `POST /api/assignments/{id}/submit`:
  - رفع الملف لـ Storage → `INSERT INTO submissions (student_id, assignment_id, file_url, status='submitted')`
  - إذا `NOW() > assignments.due_date` و`allow_late=TRUE` → `status='late'`
  - إذا `allow_late=FALSE` → رفض الطلب
- [ ] **[FR-ST2.3]** بناء `GET /api/gradebook/my-grades`:
  - قراءة من `gradebook_entries` بسياسة `student_read_own_grades` (فقط `is_published=TRUE`)
  - يُعيد: `total_grade (Generated)`, `letter_grade` من `enrollments`

### 🎨 الواجهة الأمامية

- [ ] **[FR-FM1.3]** مكوّن **AI-Approved Toggle**: مفتاح تبديل فعّال (✨ أزرق) / معطَّل (رمادي) مرتبط بـ `course_materials.is_ai_approved`
- [ ] **[FR-FM3.2]** مكوّن **QR Code Display**: يعرض QR + عداد تنازلي (10s) + يُنعِّش تلقائياً
- [ ] **[FR-ST3.2]** مكوّن **Attendance Progress Bar**: يُظهر `absence_percentage` بألوان (أخضر < 15% / أصفر 15-22% / أحمر > 22%)
- [ ] **[FR-ST2.3]** صفحة **Gradebook**: جدول بـ `coursework`, `midterm`, `final`, `total (Generated)`, `letter_grade`

---

## 🧪 خطة الاختبار

- [ ] اختبار وحدة: `total_grade` Generated Column — التحقق من دقة `30%+30%+40%`
- [ ] اختبار Trigger: `recalculate_attendance_summary()` — تسجيل 3 غيابات من 10 جلسات → التحقق من `absence_percentage = 30.00`
- [ ] اختبار Trigger: `notify_absence_warning()` — وصول الغياب 17.5% (70% من 25%) → التحقق من إدراج `notifications`
- [ ] اختبار Trigger: `sync_enrollment_final_grade()` — نشر الدرجات → التحقق من تحديث `enrollments.letter_grade`
- [ ] اختبار RLS: الطالب لا يستطيع INSERT على جلسة `is_open=FALSE`

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
