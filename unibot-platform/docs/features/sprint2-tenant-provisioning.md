# Sprint 2: إنشاء وإدارة الجامعات [FR-SA1.1 إلى FR-SA1.4]

## الوصف
بناء نظام إنشاء الجامعات الجديدة (Tenant Provisioning) عبر معالج ثلاثي الخطوات، مع إمكانية تغيير حالة الجامعة وتعديل حصصها.

## Server Actions
- `getTenants()` — جلب جميع الجامعات مع اشتراكاتها
- `getActivePlans()` — جلب الخطط النشطة
- `createTenant(formData)` — إنشاء جامعة جديدة (tenant + auth user + profile + subscription)
- `updateTenantStatus(id, status)` — تغيير حالة الجامعة (active/suspended/deleted)
- `updateTenantQuota(id, max_users, max_storage_gb)` — تعديل حصص الجامعة

## الجداول المُستخدمة
| الجدول | العمليات |
|---|---|
| `tenants` | INSERT, UPDATE, SELECT |
| `profiles` | INSERT |
| `subscriptions` | INSERT |
| `subscription_plans` | SELECT |
| `auth.users` | CREATE (Admin API) |

## سير عمل إنشاء جامعة (FR-SA1.1)
1. INSERT INTO `tenants` (name, subdomain, admin_email, plan_id, ...)
2. CREATE Auth User عبر Supabase Admin API مع app_metadata: { tenant_id, role }
3. INSERT INTO `profiles` (id=auth_uid, tenant_id, role='tenant_admin', ...)
4. INSERT INTO `subscriptions` (tenant_id, plan_id, status='active', ...)
5. في حالة فشل أي خطوة: Rollback الخطوات السابقة

## المعالج ثلاثي الخطوات (Wizard)
- **الخطوة 1:** بيانات الجامعة (الاسم، النطاق، بريد المدير، كلمة المرور)
- **الخطوة 2:** اختيار خطة الاشتراك + تخصيص الحصص
- **الخطوة 3:** مراجعة وتأكيد

## سياسات RLS المعتمدة
- `super_admin_all_on_tenants` — صلاحية كاملة
- `super_admin_all_on_profiles` — إنشاء ملفات المديرين
- `super_admin_all_subscriptions` — إنشاء الاشتراكات

## الملفات
- `src/app/super-admin/tenants/actions.ts`
- `src/app/super-admin/tenants/page.tsx`
- `src/app/super-admin/tenants/tenants-client.tsx`
