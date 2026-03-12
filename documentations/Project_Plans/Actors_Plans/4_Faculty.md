# 👨‍🏫 الدور 4: أعضاء هيئة التدريس (Faculty) — v2.0
### Faculty Members — RLS Scope & DB Access
**محدَّث بمراجع سياسات RLS الفعلية**

---

## 📌 ملخص الدور

| الحقل | التفاصيل |
|---|---|
| **الرمز في DB** | `user_role ENUM = 'faculty'` |
| **القيد في DB** | `profiles.tenant_id ≠ NULL` + سجل في `faculty_profiles` |
| **JWT Claims** | `{ role: 'faculty', tenant_id: 'UUID', profile_id: 'UUID' }` |
| **النطاق الحرج** | `sections WHERE instructor_id = current_profile_id()` فقط |
| **المرجع** | FR-FM1 → FR-FM6 |

---

## 🔐 سياسات RLS — نطاق وصول Faculty

### صلاحيات الكتابة المُقيَّدة بالشعبة

| السياسة | الجدول | الشرط الحرج |
|---|---|---|
| `faculty_manage_own_materials` | `course_materials` | `uploaded_by = current_profile_id()` |
| `faculty_manage_assignments` | `assignments` | `created_by = current_profile_id()` |
| `faculty_grade_submissions` | `submissions` | UPDATE فقط — `assignment_id IN (SELECT id FROM assignments WHERE section_id IN (SELECT id FROM sections WHERE instructor_id = current_profile_id()))` |
| `faculty_manage_own_section_gradebook` | `gradebook_entries` | `section_id IN (SELECT id FROM sections WHERE instructor_id = current_profile_id())` |
| `faculty_manage_own_attendance_sessions` | `attendance_sessions` | `section_id IN (SELECT id FROM sections WHERE instructor_id = current_profile_id())` |
| `faculty_manage_attendance_records` | `attendance_records` | نفس الشرط أعلاه |
| `faculty_write_own_syllabi` | `syllabi` | `instructor_id = current_profile_id()` |
| `channel_admin_manage_messages` | `messages` | `channel_id IN (SELECT id FROM channels WHERE section_id IN (SELECT id FROM sections WHERE instructor_id = current_profile_id()))` |
| `faculty_admin_manage_recommendations` | `student_recommendations` | INSERT/UPDATE على أي طالب في جامعته |
| `tenant_admin_manage_ai_docs` | `ai_knowledge_documents` | (يشمل faculty) — رفع وثائق شعبه |
| `admin_manage_circulars` | `circulars` | لا — **Academic Management + Tenant Admin فقط** |

### صلاحيات القراءة

| السياسة | الجدول |
|---|---|
| `faculty_read_own_section_students` | `profiles` — يقرأ ملفاته + ملفات الطلاب (كـ role='student') |
| `faculty_read_section_enrollments` | `enrollments` — طلاب شعبه فقط |
| `faculty_read_section_submissions` | `submissions` — تسليمات شعبه |
| `admin_faculty_read_attendance_summaries` | `attendance_summaries` |
| `faculty_admin_read_risk_scores` | `student_risk_scores` |
| `faculty_read_own_course_risk_flags` | `course_risk_flags` — `section_id IN (شعبه فقط)` |
| `faculty_read_own_profile` | `faculty_profiles` — ملفه الخاص |
| `tenant_read_faculty_profiles` | `faculty_profiles` — قراءة الآخرين |
| `tenant_read_sections` + `tenant_read_schedules` | `sections`, `schedules` — قراءة كاملة للجامعة |
| `channel_members_read_channels` | `channels` — القنوات التي هو عضو/admin فيها |
| `approver_read_own_workflow` | `approval_workflows` — إذا كان مُعيَّناً كـ approver |

---

## 🗄️ الجداول التي يتعامل معها مع العمليات المحددة

### المحتوى التعليمي

| الجدول | العملية | قيد أو Trigger |
|---|---|---|
| `syllabi` | INSERT/UPDATE | `UNIQUE(section_id)` — خطة واحدة لكل شعبة |
| `course_materials` | INSERT/UPDATE/DELETE | `is_ai_approved BOOLEAN` — يتحكم في RAG Pipeline |
| `assignments` | INSERT/UPDATE | `due_date TIMESTAMPTZ`, `allow_late BOOLEAN` |
| `submissions` | UPDATE (تصحيح) | `status ENUM → 'graded'`, `graded_at=NOW()`, `graded_by=current_user` |
| `gradebook_entries` | INSERT/UPDATE | `total_grade` Generated Column — لا يُدخَل يدوياً |
| `ai_knowledge_documents` | INSERT/UPDATE `is_active` | عند `is_ai_approved=TRUE` → Ingestion Pipeline |

### إدارة الحضور

| الجدول | العملية | حقول مهمة في DB |
|---|---|---|
| `attendance_sessions` | INSERT/UPDATE | `qr_code TEXT`, `qr_expires_at`, `geo_latitude/longitude`, `geo_radius_m=100`, `is_open BOOLEAN` |
| `attendance_records` | INSERT (batch) + UPDATE | `status ENUM`, `modified_by`, `modification_reason` |

### التفاعل مع الطلاب

| الجدول | العملية | قيد |
|---|---|---|
| `messages` | INSERT (في القنوات) + UPDATE (`is_pinned`, `is_deleted`) | `channel_admin_manage_messages` |
| `faculty_profiles.office_hours` | UPDATE | JSONB Field |
| `profiles.is_dnd_active/dnd_message` | UPDATE | `faculty_read_own_profile` + UPDATE own |
| `student_recommendations` | INSERT | `sent_by=current_profile_id()` |
| `tickets` | INSERT (كـ مُقدِّم) | `created_by=current_profile_id()` |

---

## ✅ قائمة مهام Faculty مع ربط DB

- [ ] **[FR-FM1.1]** إنشاء Syllabus:
  - `INSERT INTO syllabi (tenant_id, section_id, instructor_id=current_user, content=[{week:1,...}], status='draft')`
  - UNIQUE `(section_id)` — خطة واحدة فقط لكل شعبة
- [ ] **[FR-FM1.2]** رفع المحتوى:
  - `INSERT INTO course_materials (is_ai_approved=FALSE, is_published=FALSE, week_number, content_type ENUM)`
  - Trigger `trg_course_materials_updated_at` يُحدِّث `updated_at`
- [ ] **[FR-FM1.3]** AI-Approved Toggle:
  - `UPDATE course_materials SET is_ai_approved=TRUE WHERE id=X AND uploaded_by=current_profile_id()`
  - → استدعاء Edge Function Ingestion → `INSERT INTO ai_knowledge_documents` → Chunking → `ai_document_chunks`
- [ ] **[FR-FM2.1]** إنشاء تكليف:
  - `INSERT INTO assignments (created_by=current_user, max_grade, due_date, allow_late, is_published=FALSE)`
  - عند `is_published=TRUE` → Batch INSERT `notifications ('assignment_due')` لطلاب الشعبة
- [ ] **[FR-FM2.2]** تصحيح التسليمات:
  - `UPDATE submissions SET grade=X, feedback=Y, status='graded', graded_at=NOW(), graded_by=current_user`
  - سياسة `faculty_grade_submissions` (UPDATE only)
- [ ] **[FR-FM2.3]** تسجيل درجات الـ Gradebook:
  - `INSERT INTO gradebook_entries (enrollment_id, section_id, student_id, coursework_grade, midterm_grade, final_grade)`
  - `total_grade` تُحسَب **تلقائياً** — Generated Column لا يُلمَس
  - عند `is_published=TRUE` → Trigger `trg_sync_final_grade` → يُحدِّث `enrollments.letter_grade`
- [ ] **[FR-FM3.1]** تسجيل الحضور اليدوي:
  - `INSERT INTO attendance_sessions (is_open=FALSE)` ← بدون QR
  - Batch UPDATE: `attendance_records SET status='present/absent/late/excused'`
  - Trigger `trg_recalc_attendance_summary` → `recalculate_attendance_summary()` → `attendance_summaries`
  - → Trigger `trg_notify_absence_warning` إذا تجاوز 70% من الحد
- [ ] **[FR-FM3.2]** QR Attendance:
  - `INSERT INTO attendance_sessions (is_open=TRUE, qr_code=HMAC_TOKEN, qr_expires_at=NOW()+10s)`
  - Refresh كل 8 ثوانٍ: `UPDATE attendance_sessions SET qr_code=NEW_TOKEN, qr_expires_at=NOW()+10s`
  - `INSERT INTO attendance_sessions (geo_latitude, geo_longitude, geo_radius_m=100)` للـ Geo Mode
- [ ] **[FR-FM3.3]** تعديل الحضور بأثر رجعي:
  - `UPDATE attendance_records SET status='excused', modified_by=current_user, modified_at=NOW(), modification_reason`
  - يُسجَّل في `audit_logs` بـ `action='attendance_modify'`
- [ ] **[FR-FM4.1]** إدارة قناة المقرر:
  - تثبيت: `UPDATE messages SET is_pinned=TRUE` (سياسة `channel_admin_manage_messages`)
  - حذف: `UPDATE messages SET is_deleted=TRUE, deleted_at=NOW(), deleted_by=current_user`
  - قفل القناة: `UPDATE channels SET is_readonly=TRUE` — لكن هذا يتطلب Academic Management!
- [ ] **[FR-FM4.2]** ساعات المكتب:
  - `UPDATE faculty_profiles SET office_hours=[{day:'sunday',start:'10:00',end:'12:00'}]`
- [ ] **[FR-FM4.3]** وضع DND:
  - `UPDATE profiles SET is_dnd_active=TRUE, dnd_message='سأعود بعد ساعتين'`
- [ ] **[FR-FM5.1]** Risk Zone:
  - `SELECT * FROM student_risk_scores WHERE section_id IN (شعبي) AND risk_level IN ('high','critical')`
  - سياسة `faculty_admin_read_risk_scores` تضمن العزل
- [ ] **[FR-FM5.2]** إرسال توصية:
  - `INSERT INTO student_recommendations (student_id, section_id, sent_by=current_user, title, body, material_url)`
  - يُدرج `notifications ('recommendation')` للطالب
- [ ] **[FR-FM6.1]** فتح تذكرة:
  - `INSERT INTO tickets (created_by=current_user, category='venue_issue/schedule_change/...', ai_attempted=FALSE)`
  - Trigger `trg_generate_ticket_number` → `ticket_number = 'TKT-XXXXXX'`

---

## 🎨 واجهات Faculty مع الجداول المرتبطة

| الصفحة | يقرأ من | يكتب في |
|---|---|---|
| **لوحة التحكم** | `sections (شعبي), assignments, student_risk_scores` | — |
| **إدارة المقرر** | `course_materials, assignments, syllabi` | `course_materials, assignments, syllabi` |
| **AI-Approved Toggle** | `course_materials.is_ai_approved` | `course_materials` → `ai_knowledge_documents` |
| **سجل الدرجات** | `gradebook_entries, enrollments` | `gradebook_entries` (→ Generated Column) |
| **كشف الحضور** | `attendance_sessions, attendance_records` | `attendance_sessions, attendance_records` |
| **QR Generator** | `attendance_sessions` | `attendance_sessions.qr_code` |
| **قناة المقرر** | `messages, channels` | `messages (pin/delete)` |
| **Risk Zone** | `student_risk_scores (شعبتي)` | `student_recommendations` |
| **ساعات المكتب** | `faculty_profiles.office_hours` | `faculty_profiles.office_hours` |
| **تذاكري** | `tickets WHERE created_by=me` | `tickets, ticket_messages` |

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
