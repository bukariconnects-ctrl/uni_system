# 🎓 الدور 3: الإدارة الأكاديمية — v2.0
### Academic Management — RLS Scope & DB Access
**محدَّث بمراجع سياسات RLS الفعلية**

---

## 📌 ملخص الدور

| الحقل | التفاصيل |
|---|---|
| **الرمز في DB** | `user_role ENUM = 'academic_management'` |
| **القيد في DB** | `profiles.tenant_id ≠ NULL` |
| **JWT Claims** | `{ role: 'academic_management', tenant_id: 'UUID' }` |
| **النطاق** | كلية أو قسم محدد (حسب `custom_roles.scope`) |
| **المرجع** | FR-AM1 → FR-AM6 |

---

## 🔐 سياسات RLS — نطاق وصول Academic Management

### صلاحيات الكتابة (ضمن `tenant_id = current_tenant_id()`)

| السياسة | الجدول | النطاق |
|---|---|---|
| `admin_write_majors` | `majors` | INSERT/UPDATE/DELETE |
| `admin_write_academic_levels` | `academic_levels` | INSERT/UPDATE/DELETE |
| `admin_write_study_plan_courses` | `study_plan_courses` | INSERT/UPDATE/DELETE |
| `admin_write_prerequisites` | `course_prerequisites` | INSERT/UPDATE/DELETE |
| `admin_write_semesters` | `semesters` | INSERT/UPDATE |
| `admin_write_venues` | `venues` | INSERT/UPDATE |
| `academic_management_write_sections` | `sections` | كامل — فتح/إغلاق/دمج الشعب |
| `academic_management_write_schedules` | `schedules` | كامل — إنشاء/تعديل الجدول |
| `admin_all_enrollments` | `enrollments` | INSERT/UPDATE/DELETE — التسجيل الجماعي |
| `admin_manage_all_tickets` | `tickets` | كامل — معالجة التذاكر |
| `admin_manage_approval_workflows` | `approval_workflows` | إنشاء مسارات الموافقة |
| `admin_manage_circulars` | `circulars` | إنشاء ونشر التعاميم |
| `faculty_admin_manage_recommendations` | `student_recommendations` | إرسال توصيات للطلاب |
| `faculty_manage_own_materials` | `course_materials` | قراءة + كتابة (كـ Admin، ليس كـ faculty فقط) |

### صلاحيات القراءة فقط

| السياسة | الجدول |
|---|---|
| `academic_management_read_tenant_profiles` | `profiles` — قراءة جميع مستخدمي الجامعة |
| `admin_faculty_read_student_profiles` | `student_profiles` |
| `admin_faculty_read_attendance_summaries` | `attendance_summaries` |
| `admin_all_submissions` | `submissions` |
| `faculty_manage_own_section_gradebook` | `gradebook_entries` (يشمل academic_management) |
| `faculty_admin_read_risk_scores` | `student_risk_scores` |
| `admin_read_course_risk_flags` | `course_risk_flags` |
| `admin_read_all_ticket_messages` | `ticket_messages` (بما فيها `is_internal=TRUE`) |
| `admin_read_all_ticket_attachments` | `ticket_attachments` |
| `admin_read_audit_logs` | `audit_logs` (بيانات جامعته) |

### لا صلاحية له في

| الجدول | السبب |
|---|---|
| `tenants` | `tenant_admin_update_own_tenant` — Tenant Admin فقط |
| `courses` | `admin_write_courses` — Tenant Admin فقط |
| `subscription_plans / subscriptions / invoices` | Tenant Admin / Super Admin فقط |
| `auth.users` — Supabase Auth | Tenant Admin / Super Admin فقط |

---

## 🗄️ الجداول التي يتعامل معها مع العمليات المحددة

### المهام الأكاديمية الأساسية

| الجدول | العملية | قيد أو Trigger ذو صلة |
|---|---|---|
| `sections` | INSERT/UPDATE/PATCH status | Trigger `auto_create_course_channel` عند INSERT |
| `schedules` | INSERT/UPDATE | **Trigger `trg_check_schedule_conflicts`** عند كل INSERT/UPDATE |
| `enrollments` | INSERT batch / UPDATE status | Trigger `sync_section_enrolled_count` + `auto_add_to_course_channel` |
| `syllabi` | UPDATE status (approved/rejected) | ENUM: `syllabus_status` |
| `semesters` | UPDATE status | ENUM: `semester_status (planning/active/archived)` |

### المراقبة والتحليل

| الجدول | العملية | ملاحظة |
|---|---|---|
| `attendance_summaries` | SELECT | يقرأ `absence_percentage` لتقارير الغياب |
| `gradebook_entries` | SELECT | مراقبة الدرجات |
| `student_risk_scores` | SELECT | تنبيهات الطلاب في الخطر |
| `course_risk_flags` | SELECT | مقررات معدلات الفشل المرتفعة |

### التذاكر والتعاميم

| الجدول | العملية | قيد أو Trigger |
|---|---|---|
| `tickets` | SELECT/UPDATE status/PATCH assign | Trigger `trg_notify_ticket_status` عند تغيير `status` |
| `ticket_messages` | INSERT (`is_internal=TRUE/FALSE`) + SELECT | سياسة `admin_read_all_ticket_messages` |
| `approval_workflows` | INSERT / SELECT | `UNIQUE(ticket_id, step_order)` |
| `circulars` | INSERT / UPDATE is_published | سياسة `admin_manage_circulars` |
| `notifications` | INSERT (batch عند نشر التعميم) | سياسة `system_insert_notifications` |

---

## ✅ قائمة مهام Academic Management مع ربط DB

- [ ] **[FR-AM1.1]** مراجعة Syllabi:
  - `UPDATE syllabi SET status='approved/rejected', reviewed_by=current_user, reviewed_at=NOW(), review_notes`
  - الـ ENUM يمنع أي قيمة خارج `draft/submitted/approved/rejected`
- [ ] **[FR-AM1.2]** تعيين المحاضرين للشعب:
  - `UPDATE sections SET instructor_id=FACULTY_ID WHERE id=SECTION_ID`
- [ ] **[FR-AM1.3]** إدارة الشعب:
  - فتح: `UPDATE sections SET status='open'`
  - إغلاق: `UPDATE sections SET status='closed'`
  - دمج: `UPDATE sections SET status='merged', merged_into_id=TARGET WHERE id=SOURCE`
- [ ] **[FR-AM1.5]** التسجيل الجماعي:
  - `INSERT INTO enrollments (tenant_id, student_id, section_id, semester_id) ON CONFLICT DO NOTHING`
  - يُشغِّل `sync_section_enrolled_count` + `auto_add_to_course_channel` تلقائياً
- [ ] **[FR-AM2.1]** بناء الجدول:
  - `INSERT INTO schedules (tenant_id, section_id, venue_id, day_of_week, start_time, end_time, status='draft')`
  - **`trg_check_schedule_conflicts` يمنع التعارضات تلقائياً** — معالجة EXCEPTION في الـ API
- [ ] **[FR-AM2.3]** نشر الجدول:
  - `UPDATE schedules SET status='published' WHERE semester_id=X`
  - Batch INSERT في `notifications` بـ `'schedule_change'` لجميع المعنيين
- [ ] **[FR-AM4.1]** إنشاء تعميم مستهدف:
  - `INSERT INTO circulars (target_type='department/major/level/section', target_id=TARGET, is_mandatory)`
  - `UPDATE circulars SET is_published=TRUE, published_at=NOW()`
  - Batch INSERT في `notifications` بـ `'circular'` للمستخدمين المستهدفين
- [ ] **[FR-AM5.1]** معالجة التذاكر:
  - `GET tickets WHERE tenant_id=current_tenant_id()` (Full-Text Search بـ `search_vector`)
  - `PATCH tickets SET assigned_to=X, status='in_progress'` → Trigger يُرسل إشعاراً
- [ ] **[FR-AM5.4]** مسار الموافقة:
  - `INSERT INTO approval_workflows (ticket_id, approver_id, step_order, status='pending')`
- [ ] **[FR-AM5.5]** إغلاق التذكرة:
  - `UPDATE tickets SET status='resolved', resolved_at=NOW()`
  - Trigger `trg_notify_ticket_status` → `INSERT INTO notifications ('ticket_update')` تلقائياً
- [ ] **[FR-AM6.1]** تلقي تنبيهات الخطر:
  - pg_cron يُدرج `'risk_alert'` في `notifications` يومياً 02:30 تلقائياً
  - الواجهة تقرأ من `notifications WHERE notification_type='risk_alert'`
- [ ] **[FR-AM6.2]** مراقبة المقررات الحرجة:
  - `SELECT * FROM course_risk_flags WHERE flagged=TRUE AND tenant_id=current_tenant_id()`

---

## 🎨 واجهات Academic Management مع الجداول المرتبطة

| الصفحة | يقرأ من | يكتب في |
|---|---|---|
| **لوحة نبض القسم** | `sections, attendance_summaries, assignments` | — |
| **إدارة الشعب** | `sections, courses, semesters` | `sections` |
| **Week Grid Builder** | `schedules, venues, sections` | `schedules` (→ Trigger تحقق) |
| **لوحة التحليلات** | `student_risk_scores, course_risk_flags, attendance_summaries` | — |
| **إدارة التذاكر** | `tickets` (GIN Search) | `tickets, ticket_messages, approval_workflows` |
| **إرسال التعاميم** | `departments, majors, sections` | `circulars, notifications` |
| **تقارير الغياب** | `attendance_summaries` | — |
| **تقارير الالتزام** | `course_materials, gradebook_entries` (COUNT) | — |

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
