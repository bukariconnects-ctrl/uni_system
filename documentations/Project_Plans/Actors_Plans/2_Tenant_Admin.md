# 🏫 الدور 2: مدير الجامعة (Tenant Admin) — v2.0
### University System Administrator — RLS Scope & DB Access
**محدَّث بمراجع سياسات RLS الفعلية**

---

## 📌 ملخص الدور

| الحقل | التفاصيل |
|---|---|
| **الرمز في DB** | `user_role ENUM = 'tenant_admin'` |
| **القيد في DB** | `profiles.tenant_id ≠ NULL` + الـ CHECK `(role = 'super_admin' OR tenant_id IS NOT NULL)` |
| **JWT Claims** | `{ role: 'tenant_admin', tenant_id: 'UUID' }` |
| **المرجع** | FR-TA1 → FR-TA6 |

---

## 🔐 سياسات RLS — نطاق وصول Tenant Admin

### صلاحيات القراءة والكتابة الكاملة (ضمن `tenant_id = current_tenant_id()`)

| السياسة | الجدول | النطاق |
|---|---|---|
| `tenant_admin_manage_own_tenant_profiles` | `profiles` | كامل على جميع مستخدمي جامعته |
| `tenant_admin_write_colleges` | `colleges` | CRUD كامل |
| `tenant_admin_write_departments` | `departments` | CRUD كامل |
| `admin_write_majors` | `majors` | CRUD كامل |
| `admin_write_academic_levels` | `academic_levels` | CRUD كامل |
| `admin_write_courses` | `courses` | CRUD كامل (Tenant Admin فقط — بدون Academic Management) |
| `admin_write_study_plan_courses` | `study_plan_courses` | CRUD كامل |
| `admin_write_prerequisites` | `course_prerequisites` | CRUD كامل |
| `admin_write_semesters` | `semesters` | CRUD كامل |
| `admin_write_venues` | `venues` | CRUD كامل |
| `tenant_admin_manage_custom_roles` | `custom_roles` | إنشاء وإدارة الأدوار المخصصة |
| `admin_manage_profile_custom_roles` | `profile_custom_roles` | تعيين الأدوار للمستخدمين |
| `system_write_student_profiles` | `student_profiles` | تعديل بيانات الطلاب |
| `admin_manage_faculty_profiles` | `faculty_profiles` | تعديل بيانات المحاضرين |
| `admin_manage_faculty_departments` | `faculty_departments` | ربط المحاضرين بالأقسام |
| `admin_manage_student_majors` | `student_majors` | ربط الطلاب بالتخصصات |
| `tenant_admin_manage_ai_docs` | `ai_knowledge_documents` | رفع وإدارة وثائق UniBot |

### صلاحيات القراءة فقط

| السياسة | الجدول |
|---|---|
| `tenant_admin_read_own_subscriptions` | `subscriptions` |
| `tenant_admin_read_own_invoices` | `invoices` |
| `admin_read_audit_logs` | `audit_logs` (بيانات جامعته فقط) |
| `admin_faculty_read_student_profiles` | `student_profiles` |
| `admin_read_course_risk_flags` | `course_risk_flags` |
| `faculty_admin_read_risk_scores` | `student_risk_scores` |
| `tenant_admin_read_own_token_usage` | `ai_token_usage` |
| `admin_manage_all_tickets` | `tickets` (قراءة شاملة + كتابة) |

### غير مسموح له (بدون سياسة مُعرَّفة)

| الجدول | السبب |
|---|---|
| `messages / conversations` | ليس طرفاً في أي محادثة تلقائياً |
| `chatbot_messages` | `user_manage_own_chatbot_msgs` مرتبطة بـ `user_id` |

---

## 🗄️ الجداول التي يتعامل معها مع العمليات المحددة

### بناء الهيكل الأكاديمي

| الجدول | العملية | الشرط في DB |
|---|---|---|
| `colleges` | INSERT/UPDATE | `UNIQUE(tenant_id, code)` |
| `departments` | INSERT/UPDATE | `UNIQUE(tenant_id, code)` |
| `majors` | INSERT/UPDATE | `UNIQUE(tenant_id, code)` |
| `academic_levels` | INSERT/UPDATE | `UNIQUE(major_id, level_number)` |
| `courses` | INSERT/UPDATE/DELETE | `UNIQUE(tenant_id, code)` |
| `study_plan_courses` | INSERT | `UNIQUE(academic_level_id, course_id, semester_type)` |
| `course_prerequisites` | INSERT | `CHECK(course_id <> prerequisite_id)` |
| `venues` | INSERT/UPDATE | `UNIQUE(tenant_id, code)` |
| `semesters` | INSERT/UPDATE | `UNIQUE(tenant_id, academic_year, semester_type)` |

### إدارة المستخدمين

| الجدول | العملية | ملاحظة |
|---|---|---|
| `profiles` | INSERT/UPDATE/SELECT | إنشاء مستخدمين بالجملة أو فردياً |
| `student_profiles` | INSERT/UPDATE | `UNIQUE(tenant_id, student_number)` |
| `faculty_profiles` | INSERT/UPDATE | `UNIQUE(tenant_id, employee_id)` |
| `custom_roles` | CRUD | `UNIQUE(tenant_id, name)` |
| `profile_custom_roles` | INSERT/DELETE | ربط المستخدمين بالأدوار |
| `faculty_departments` | INSERT/DELETE | `PRIMARY KEY(faculty_id, department_id)` |

---

## ✅ قائمة مهام Tenant Admin مع ربط DB

- [ ] **[FR-TA1.1]** Branding:
  - `UPDATE tenants SET logo_url, primary_color, secondary_color, welcome_message WHERE id=current_tenant_id()`
  - CHECK: `primary_color ~ '^#[0-9A-Fa-f]{6}$'` — يرفض الألوان غير الصالحة
- [ ] **[FR-TA1.2]** التقويم الأكاديمي:
  - `UPDATE semesters SET start_date, end_date, reg_start, reg_end, add_drop_start, add_drop_end, grade_freeze_at`
  - `UPDATE tenants SET absence_threshold=25 WHERE id=current_tenant_id()` (قيد: `BETWEEN 0 AND 100`)
- [ ] **[FR-TA1.4]** إنهاء الفصل الدراسي:
  - `UPDATE semesters SET status='archived'` (ENUM: `planning/active/archived`)
  - `UPDATE enrollments SET status='completed'` للناجحين
  - يُشغِّل Trigger `trg_enrollments_update_gpa` → `calculate_student_gpa()`
- [ ] **[FR-TA3.1]** استيراد CSV:
  - حلقة INSERT في `profiles` + `student_profiles` أو `faculty_profiles`
  - `UPDATE profiles ... SET search_vector` يُشغَّل بـ Trigger `trg_profiles_update_search_vector`
- [ ] **[FR-TA3.2]** أدوار مخصصة RBAC:
  - `INSERT INTO custom_roles (tenant_id, name, permissions JSONB, scope)`
  - `INSERT INTO profile_custom_roles (profile_id, custom_role_id, assigned_by=current_user)`
- [ ] **[FR-TA3.3]** إدارة المستخدمين:
  - `UPDATE profiles SET account_status='suspended' WHERE id=X AND tenant_id=current_tenant_id()`
  - Full-Text Search: `WHERE profiles.search_vector @@ plainto_tsquery($query)` (GIN Index)
  - يُسجَّل في `audit_logs` بـ `action='status_change'`
- [ ] **[FR-TA5.1]** رفع وثائق UniBot:
  - `INSERT INTO ai_knowledge_documents (tenant_id, title, doc_type='regulation', section_id=NULL, is_active=TRUE)`
  - استدعاء Edge Function للـ Ingestion → `ai_document_chunks`
- [ ] **[FR-TA5.2]** حذف وثيقة:
  - `UPDATE ai_knowledge_documents SET is_active=FALSE`
  - `DELETE FROM ai_document_chunks WHERE document_id=X` (CASCADE)
- [ ] **[FR-TA6.1]** تعميم شامل:
  - `INSERT INTO circulars (tenant_id, target_type='all', is_mandatory=TRUE, created_by=current_user)`
- [ ] **[FR-TA6.2]** Audit Log:
  - `SELECT * FROM audit_logs WHERE tenant_id=current_tenant_id() ORDER BY created_at DESC`
  - سياسة `admin_read_audit_logs` تسمح للـ Tenant Admin بقراءة `tenant_id = current_tenant_id()` فقط

---

## 🎨 واجهات Tenant Admin مع الجداول المرتبطة

| الصفحة | يقرأ من | يكتب في |
|---|---|---|
| **لوحة التحكم** | `tenants`, `profiles (COUNT)`, `semesters` | — |
| **إعدادات الجامعة** | `tenants` | `tenants` |
| **الشجرة التنظيمية** | `colleges, departments, majors` | نفسها |
| **كتالوج المقررات** | `courses, departments` | `courses, study_plan_courses` |
| **الخطط الدراسية** | `study_plan_courses, course_prerequisites` | نفسها |
| **إدارة المستخدمين** | `profiles` (GIN search) | `profiles, student_profiles, faculty_profiles` |
| **الأدوار (RBAC)** | `custom_roles, profile_custom_roles` | نفسها |
| **القاعات** | `venues` | `venues` |
| **UniBot Knowledge** | `ai_knowledge_documents` | `ai_knowledge_documents, ai_document_chunks` |
| **Audit Log** | `audit_logs` | — (قراءة فقط) |

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
