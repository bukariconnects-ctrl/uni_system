# 👑 الدور 1: المشرف العام (Super Admin) — v2.0
### Platform Owner — Database Access & RLS Scope
**محدَّث بمراجع سياسات RLS الفعلية**

---

## 📌 ملخص الدور

| الحقل | التفاصيل |
|---|---|
| **الرمز في DB** | `user_role ENUM = 'super_admin'` |
| **القيد في DB** | `profiles.tenant_id = NULL` ← يُميِّزه عن بقية المستخدمين |
| **JWT Claims** | `{ role: 'super_admin', tenant_id: null }` |
| **المرجع** | FR-SA1 → FR-SA5 / part1_core_system.sql القسم 6 |

---

## 🔐 سياسات RLS — نطاق وصول Super Admin

### جداول بصلاحية كاملة (ALL: SELECT + INSERT + UPDATE + DELETE)

| الجدول | اسم السياسة | الشرط |
|---|---|---|
| `subscription_plans` | `super_admin_all_on_subscription_plans` | `current_user_role() = 'super_admin'` |
| `tenants` | `super_admin_all_on_tenants` | `current_user_role() = 'super_admin'` |
| `subscriptions` | `super_admin_all_subscriptions` | `current_user_role() = 'super_admin'` |
| `invoices` | `super_admin_all_invoices` | `current_user_role() = 'super_admin'` |
| `profiles` | `super_admin_all_on_profiles` | `current_user_role() = 'super_admin'` |
| `system_announcements` | `super_admin_manage_announcements` | `current_user_role() = 'super_admin'` |
| `colleges` (+ deps, majors...) | `tenant_admin_write_colleges` | `role IN ('tenant_admin', 'super_admin')` |
| `ai_document_chunks` | `service_manage_chunks` | `current_user_role() = 'super_admin'` |
| `ai_token_usage` | `super_admin_read_token_usage` | `current_user_role() = 'super_admin'` |

### جداول يراها لكنها محجوبة بالقيود التصميمية

> **مهم جداً:** رغم أن RLS تُتيح قراءة `profiles` للـ Super Admin، إلا أن **الواجهة والـ API يحجبان** عرض:
> - `gradebook_entries` — لا API مُعرَّف لـ Super Admin
> - `messages/conversations` — لا API مُعرَّف
> - `tickets` — `admin_manage_all_tickets` يتطلب `tenant_id = current_tenant_id()` → Super Admin بـ `tenant_id=NULL` مستثنى
> - `attendance_records` — `faculty_manage_attendance_records` يتطلب tenant context

### جداول لا توجد سياسة تسمح له بها تلقائياً

| الجدول | السبب |
|---|---|
| `student_risk_scores` | فقط `faculty_admin_read_risk_scores` تشترط `tenant_id = current_tenant_id()` |
| `approval_workflows` | تشترط `tenant_id = current_tenant_id()` |
| `chatbot_messages` | `user_manage_own_chatbot_msgs` — مرتبطة بـ `user_id` |

---

## 🗄️ الجداول التي يتعامل معها مباشرةً

| الجدول | العملية | الغرض |
|---|---|---|
| `tenants` | INSERT / UPDATE / PATCH status | إنشاء وإدارة الجامعات |
| `subscription_plans` | CRUD | تعريف وتسعير الخطط |
| `subscriptions` | SELECT / UPDATE | مراقبة الاشتراكات |
| `invoices` | SELECT + (يُنشئها pg_cron تلقائياً) | مراقبة الفواتير |
| `system_announcements` | INSERT / UPDATE | إعلانات المنصة |
| `profiles` | SELECT عام + UPDATE للـ Tenant Admins | Impersonation + دعم |
| `audit_logs` | SELECT فقط | مراقبة الأنشطة (read-only) |
| `ai_token_usage` | SELECT | مراقبة استهلاك AI لكل جامعة |
| `ai_document_chunks` | كامل (عبر Service Role في Edge Functions) | إدارة RAG Pipeline |

---

## ✅ قائمة مهام Super Admin مع ربط دقيق بالDB

- [ ] **[FR-SA1.1]** إنشاء مستأجر جديد:
  - `INSERT INTO tenants (name, subdomain, admin_email, plan_id, absence_threshold=25.00)`
  - إنشاء Supabase Auth User → `INSERT INTO profiles (id=auth_uid, tenant_id=NEW.tenant_id, role='tenant_admin', ...)`
  - `INSERT INTO subscriptions (tenant_id, plan_id, start_date, end_date, auto_renew=TRUE)`
- [ ] **[FR-SA1.3]** تغيير حالة الجامعة:
  - `UPDATE tenants SET status='suspended/deleted', deleted_at=NOW() WHERE id=X`
  - يُسجَّل في `audit_logs` بـ `action='status_change'`
- [ ] **[FR-SA2.1]** إدارة خطط الاشتراك:
  - `INSERT/UPDATE INTO subscription_plans (name ENUM, price_monthly, max_users, max_storage_gb, features JSONB)`
- [ ] **[FR-SA2.2]** التحقق من pg_cron `generate-renewal-invoices`:
  - يولِّد `INSERT INTO invoices (status='sent')` تلقائياً للاشتراكات المنتهية خلال 30 يوماً
- [ ] **[FR-SA3.1]** God View Dashboard:
  - `SELECT status, COUNT(*) FROM tenants GROUP BY status`
  - `SELECT tenant_id, SUM(cost_usd) FROM ai_token_usage GROUP BY tenant_id`
- [ ] **[FR-SA3.4]** إعلانات المنصة:
  - `INSERT INTO system_announcements (title, body, is_active=TRUE, expires_at)`
  - سياسة `all_read_active_announcements` تُظهرها لجميع Tenant Admins
- [ ] **[FR-SA4.2]** مراقبة AI Token Usage:
  - `SELECT model, SUM(total_tokens), SUM(cost_usd) FROM ai_token_usage GROUP BY tenant_id, model`
- [ ] **[FR-SA5.1]** Hard Delete:
  - `DELETE FROM ai_document_chunks WHERE tenant_id=X` (CASCADE من `ai_knowledge_documents`)
  - `UPDATE tenants SET status='deleted', deleted_at=NOW()`
  - `INSERT INTO audit_logs (action='data_wipe', target_table='tenants', target_id=X)`
- [ ] **[FR-SA5.3]** Impersonation (دخول كـ Tenant Admin):
  - توليد JWT مؤقت بـ `tenant_id=TARGET`
  - `INSERT INTO audit_logs (actor_id=SA_ID, action='impersonate', target_id=TA_ID, ip_address)`

---

## 🎨 واجهات Super Admin

| الصفحة | يقرأ من | يكتب في |
|---|---|---|
| **God View Dashboard** | `tenants`, `ai_token_usage` | — |
| **إدارة المستأجرين** | `tenants`, `subscriptions` | `tenants.status` |
| **Wizard إنشاء مستأجر** | `subscription_plans` | `tenants`, `profiles`, `subscriptions` |
| **خطط الاشتراك** | `subscription_plans` | `subscription_plans` |
| **الفواتير** | `invoices` | `invoices.status` |
| **إعداد LLM** | env vars | env vars |
| **Audit Log** | `audit_logs` | — (قراءة فقط) |

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
