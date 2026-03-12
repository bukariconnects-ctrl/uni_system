# 🏛️ النظام الفرعي 1: إدارة المنصة والمستأجرين — v2.0
### Platform & Tenant Management System
**محدَّث بمراجع قاعدة البيانات الفعلية**

---

## 📌 نظرة عامة

| الحقل | التفاصيل |
|---|---|
| **هدف النظام** | تحويل UniBot إلى خدمة سحابية حقيقية (True SaaS) بعزل تام بين الجامعات عبر RLS |
| **الأدوار المرتبطة** | `super_admin` (أساسي) + `tenant_admin` (إعداد الجانب الجامعي) |
| **الأولوية** | 🔴 حرجة — يجب الانتهاء منها أولاً |
| **المتطلب الرئيسي** | SR-1 / FR-SA1 → FR-SA5 / FR-TA1 → FR-TA6 |
| **ملف SQL** | `part1_core_system.sql` — القسم 3 |

---

## 🗄️ خريطة مخطط قاعدة البيانات (Database Schema Mapping)

### الجداول التي يعتمد عليها هذا النظام

| الجدول | الغرض | ملاحظة |
|---|---|---|
| `subscription_plans` | خطط الاشتراك (Basic/Pro/Enterprise) | ENUM: `subscription_plan` |
| `tenants` | سجل كل جامعة مشتركة | يحوي `primary_color`, `logo_url`, `absence_threshold`, `status` |
| `subscriptions` | تتبع تاريخ الاشتراكات والفوترة | ENUM: `subscription_status` |
| `invoices` | الفواتير المُرسَلة للجامعات | ENUM: `invoice_status` — يُملأ بـ `generate_renewal_invoices()` |
| `system_announcements` | إعلانات Super Admin لجميع مديري الجامعات | `expires_at` لتحديد النهاية |
| `profiles` | جميع المستخدمين (Supabase Auth) | `tenant_id = NULL` → Super Admin |
| `custom_roles` | أدوار مخصصة RBAC ينشئها Tenant Admin | `permissions JSONB` + `scope` |
| `profile_custom_roles` | ربط المستخدمين بالأدوار المخصصة | Many-to-Many |
| `audit_logs` | سجل تدقيق غير قابل للتعديل | ENUM: `audit_action` — يشمل: `impersonate, grade_modify, data_wipe` |

### ENUMs ذات الصلة

```sql
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE subscription_plan AS ENUM ('basic', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'pending', 'expired', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');
CREATE TYPE audit_action AS ENUM ('create','update','delete','login','logout',
    'impersonate','grade_modify','permission_change','file_delete',
    'status_change','ticket_resolve','attendance_modify','data_wipe');
```

### Triggers والدوال ذات الصلة

| Trigger / Function | يعمل على | الغرض |
|---|---|---|
| `trg_tenants_updated_at` | `tenants` | تحديث `updated_at` تلقائياً |
| `trg_subscription_plans_updated_at` | `subscription_plans` | تحديث `updated_at` تلقائياً |
| `generate_renewal_invoices()` | pg_cron (أول كل شهر 08:00) | إنشاء فواتير تجديد تلقائية |
| `set_updated_at()` | جميع الجداول تقريباً | دالة مساعدة مشتركة |

---

## 🔐 سياسات RLS المُطبَّقة

| السياسة | الجدول | النطاق |
|---|---|---|
| `super_admin_all_on_tenants` | `tenants` | Super Admin: صلاحية كاملة |
| `tenant_admin_read_own_tenant` | `tenants` | Tenant Admin: قراءة سجل جامعته فقط (`id = current_tenant_id()`) |
| `tenant_admin_update_own_tenant` | `tenants` | Tenant Admin: تعديل بيانات جامعته فقط |
| `super_admin_all_on_subscription_plans` | `subscription_plans` | Super Admin: إنشاء/تعديل الخطط |
| `authenticated_read_subscription_plans` | `subscription_plans` | جميع المستخدمين: قراءة فقط |
| `super_admin_all_subscriptions` | `subscriptions` | Super Admin: كامل |
| `tenant_admin_read_own_subscriptions` | `subscriptions` | Tenant Admin: قراءة اشتراكه فقط |
| `super_admin_all_invoices` | `invoices` | Super Admin: كامل |
| `tenant_admin_read_own_invoices` | `invoices` | Tenant Admin: قراءة فواتيره فقط |
| `admin_read_audit_logs` | `audit_logs` | Super Admin: كل السجلات / Tenant Admin: سجلات جامعته |
| `super_admin_manage_announcements` | `system_announcements` | كتابة: Super Admin فقط |
| `all_read_active_announcements` | `system_announcements` | قراءة: جميع المستخدمين (النشطة + غير المنتهية) |
| `tenant_admin_manage_custom_roles` | `custom_roles` | Tenant Admin: إنشاء وإدارة الأدوار المخصصة |
| `admin_manage_profile_custom_roles` | `profile_custom_roles` | Tenant Admin: تعيين الأدوار |

---

## ✅ قائمة المهام التفصيلية للمطورين

### ⚙️ Super Admin — إدارة المستأجرين

- [ ] **[FR-SA1.1]** بناء `POST /api/tenants`:
  - يُدرج في `tenants` بحقول: `name, subdomain, admin_email, plan_id, max_users, max_storage_gb`
  - يُنشئ Auth User للـ Tenant Admin عبر Supabase Admin API
  - يُدرج في `profiles` بـ `role='tenant_admin'` و`tenant_id=NEW.id`
  - يُدرج في `subscriptions` بتاريخ البداية ونهاية العقد
- [ ] **[FR-SA1.2]** بناء `PATCH /api/tenants/{id}/domain` — تحديث `tenants.custom_domain`
- [ ] **[FR-SA1.3]** بناء `PATCH /api/tenants/{id}/status` — تحديث `tenants.status` (ENUM: `active/suspended/deleted`)
  - عند `suspended`: إرسال إشعار `system_announcements` لمستخدمي الجامعة
  - عند `deleted`: تشغيل منطق Hard Delete الشامل (FR-SA5.1)
- [ ] **[FR-SA1.4]** بناء `PATCH /api/tenants/{id}/quota` — تحديث `tenants.max_users` و`tenants.max_storage_gb`

### ⚙️ Super Admin — الاشتراك والفوترة

- [ ] **[FR-SA2.1]** بناء CRUD APIs لـ `subscription_plans`:
  - `POST /api/plans`, `PATCH /api/plans/{id}`, `DELETE /api/plans/{id}`
  - بحقول: `name (ENUM), price_monthly, max_users, max_storage_gb, features (JSONB)`
- [ ] **[FR-SA2.2]** التحقق من عمل pg_cron job `generate-renewal-invoices` (يُشغِّل `generate_renewal_invoices()` أول كل شهر)
  - الدالة تُدرج في `invoices` بحالة `'sent'` للاشتراكات المنتهية خلال 30 يوماً
- [ ] **[FR-SA2.3]** بناء تكامل Payment Gateway → عند الدفع: `PATCH invoices SET status='paid', paid_at=NOW()`

### ⚙️ Super Admin — صحة النظام

- [ ] **[FR-SA3.1]** بناء `GET /api/admin/dashboard` → يعيد:
  - عدد `tenants` حسب `status`
  - إجمالي `storage_used_gb` عبر كل المستأجرين
  - إحصائيات `ai_token_usage` المجمَّعة
- [ ] **[FR-SA3.2]** بناء استدعاء Supabase Backup API وواجهة جدولتها
- [ ] **[FR-SA3.4]** بناء `POST /api/admin/announcements` → يُدرج في `system_announcements` (`is_active=TRUE, expires_at`)

### ⚙️ Super Admin — AI العالمي

- [ ] **[FR-SA4.1]** بناء واجهة تحديث LLM API key/model في متغيرات البيئة (Vercel env vars)
- [ ] **[FR-SA4.2]** بناء `GET /api/admin/token-usage` → يقرأ من `ai_token_usage` مجمَّعة بـ `tenant_id`
  - سياسة RLS: `super_admin_read_token_usage` تسمح للـ Super Admin فقط

### ⚙️ Super Admin — الأمان والامتثال

- [ ] **[FR-SA5.1]** بناء `DELETE /api/tenants/{id}/hard-delete`:
  - حذف `ai_document_chunks` → `ai_knowledge_documents` (CASCADE)
  - حذف Supabase Storage bucket للجامعة
  - تحديث `tenants.status='deleted'` و`tenants.deleted_at=NOW()`
  - تسجيل في `audit_logs` بـ `action='data_wipe'`
- [ ] **[FR-SA5.2]** تطبيق Rate Limiting بـ Upstash Redis على المسارات (`/api/`) مع قراءة `tenant_id` من JWT
- [ ] **[FR-SA5.3]** بناء Impersonation Mode:
  - توليد JWT مؤقت بـ `role='tenant_admin'` و`tenant_id=TARGET`
  - تسجيل **كل** الإجراءات في `audit_logs` بـ `action='impersonate'` و`ip_address`
- [ ] **[FR-SA5.4]** التحقق من سياسة RLS بصورة دورية — Super Admin لا يستطيع قراءة: `gradebook_entries`, `messages`, `tickets`, `attendance_records`

### ⚙️ Tenant Admin — الإعداد والتخصيص

- [ ] **[FR-TA1.1]** بناء `PATCH /api/tenant/branding`:
  - يُحدِّث `tenants.logo_url`, `tenants.primary_color`, `tenants.secondary_color`, `tenants.welcome_message`
  - قيود DB: `CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$')` — تحقق من صحة صيغة الألوان
- [ ] **[FR-TA1.2]** بناء `PATCH /api/tenant/calendar`:
  - يُحدِّث `semesters.start_date, end_date, reg_start, reg_end, add_drop_start, add_drop_end`
  - يُحدِّث `tenants.absence_threshold` (قيد DB: `CHECK (absence_threshold BETWEEN 0 AND 100)`)
- [ ] **[FR-TA1.3]** بناء `PATCH /api/tenant/localization` — يُحدِّث `tenants.timezone` و`tenants.default_language`
- [ ] **[FR-TA1.4]** بناء وظيفة "إنهاء الفصل الدراسي":
  - تحديث `semesters.status = 'archived'`
  - تعيين `semesters.grade_freeze_at = NOW()`
  - ترقية الطلاب: `UPDATE enrollments SET status = 'completed'` للناجحين

### ⚙️ Tenant Admin — إدارة المستخدمين (RBAC)

- [ ] **[FR-TA3.1]** بناء واجهة استيراد CSV/Excel:
  - Parse الملف → إنشاء Auth Users بالجملة عبر Supabase Admin API
  - `INSERT INTO profiles (id, tenant_id, role, first_name, last_name, ...)` لكل صف
  - للطلاب: `INSERT INTO student_profiles (profile_id, tenant_id, student_number, ...)`
  - للمحاضرين: `INSERT INTO faculty_profiles (profile_id, tenant_id, employee_id, ...)`
- [ ] **[FR-TA3.2]** بناء CRUD لـ `custom_roles`:
  - `POST /api/roles` → يُدرج في `custom_roles` بحقل `permissions JSONB` و`scope`
  - `POST /api/roles/{id}/assign` → يُدرج في `profile_custom_roles`
- [ ] **[FR-TA3.3]** بناء `GET /api/tenant/users` مع Full-Text Search عبر `profiles.search_vector` (GIN Index)
  - `PATCH /api/users/{id}/status` → تحديث `profiles.account_status` (ENUM: `active/suspended/terminated`)
  - يُسجِّل في `audit_logs` بـ `action='status_change'`
- [ ] **[FR-TA3.4]** بناء `POST /api/users` — تسجيل مستخدم واحد يدوياً

### ⚙️ Tenant Admin — قاعدة المعرفة

- [ ] **[FR-TA5.1]** بناء `POST /api/knowledge/upload`:
  - رفع الملف لـ Supabase Storage
  - `INSERT INTO ai_knowledge_documents (tenant_id, title, doc_type='regulation', file_url, uploaded_by)`
  - استدعاء Edge Function للـ Ingestion Pipeline
- [ ] **[FR-TA5.2]** بناء `DELETE /api/knowledge/{id}`:
  - `UPDATE ai_knowledge_documents SET is_active=FALSE`
  - حذف `ai_document_chunks` المرتبطة (CASCADE)

### ⚙️ Tenant Admin — التدقيق والأدوات

- [ ] **[FR-TA6.1]** بناء `POST /api/circulars` (تعميم شامل) — يُدرج في `circulars` بـ `target_type='all'` و`is_mandatory=TRUE`
- [ ] **[FR-TA6.2]** بناء `GET /api/audit-logs` → يقرأ من `audit_logs` بفلاتر تاريخ وإجراء ومُنفِّذ
  - سياسة RLS `admin_read_audit_logs` تضمن العزل
- [ ] **[FR-TA6.3]** بناء `GET /api/tenant/data-health`:
  - كشف الحسابات المكررة: `profiles` بنفس `national_id` + `tenant_id`
  - كشف الطلاب المتجاوزين: `student_profiles.earned_credit_hours >= majors.total_credits`

### 🎨 الواجهة الأمامية

- [ ] **[FR-SA3.1]** صفحة God View Dashboard: Bento Grid بإحصائيات `tenants` + استهلاك `ai_token_usage`
- [ ] **[FR-SA1.1]** Wizard إنشاء مستأجر: نموذج ثلاثي الخطوات (بيانات الجامعة → الخطة → التأكيد)
- [ ] **[FR-TA1.1]** صفحة Branding: معاينة مباشرة لألوان `tenants.primary_color` على نموذج تجريبي
- [ ] **[FR-TA3.1]** واجهة استيراد CSV: Drag & Drop + Progress Bar + تقرير الأخطاء (الصفوف غير الصالحة)
- [ ] **[FR-TA6.2]** صفحة Audit Log: جدول قابل للتصفية والتصدير (للقراءة فقط)

---

## 🧪 خطة الاختبار

- [ ] اختبار وحدة: الـ `current_tenant_id()` function تعيد الـ tenant الصحيح من JWT
- [ ] اختبار RLS: التحقق من عدم رؤية Tenant A لبيانات Tenant B (في `tenants`, `profiles`, `enrollments`)
- [ ] اختبار pg_cron: محاكاة `generate_renewal_invoices()` مع اشتراك ينتهي خلال 25 يوماً
- [ ] اختبار E2E: Super Admin ينشئ جامعة → Tenant Admin يُسجِّل الدخول ويرى بيانات جامعته فقط

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
