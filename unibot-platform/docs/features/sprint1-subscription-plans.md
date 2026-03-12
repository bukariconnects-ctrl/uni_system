# Sprint 1: إدارة خطط الاشتراك [FR-SA2.1]

## الوصف
بناء واجهة CRUD كاملة لإدارة خطط الاشتراك (Basic/Pro/Enterprise) من قبل المشرف العام.

## Server Actions
- `getPlans()` — جلب جميع الخطط مرتبة بالسعر
- `createPlan(formData)` — إنشاء خطة جديدة
- `updatePlan(id, formData)` — تعديل خطة موجودة
- `deletePlan(id)` — حذف خطة

## الجداول المُستخدمة
| الجدول | العمليات |
|---|---|
| `subscription_plans` | SELECT, INSERT, UPDATE, DELETE |

## أعمدة الجدول المُستخدمة
- `name` — ENUM: `subscription_plan` (basic, pro, enterprise)
- `price_monthly` — NUMERIC
- `max_users` — INTEGER
- `max_storage_gb` — INTEGER
- `features` — JSONB
- `is_active` — BOOLEAN

## سياسات RLS المعتمدة
- `super_admin_all_on_subscription_plans` — صلاحية كاملة للمشرف العام
- `authenticated_read_subscription_plans` — قراءة لجميع المستخدمين

## الملفات
- `src/app/super-admin/plans/actions.ts` — Server Actions
- `src/app/super-admin/plans/page.tsx` — Server Component
- `src/app/super-admin/plans/plans-client.tsx` — Client Component (الجدول + النماذج)
