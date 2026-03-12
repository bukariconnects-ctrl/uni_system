# Sprint 3: لوحة التحكم الشاملة والإعلانات [FR-SA3.1, FR-SA3.4]

## الوصف
بناء لوحة التحكم الرئيسية للمشرف العام (God View Dashboard) بتصميم Bento Grid، مع نظام إعلانات المنصة.

## لوحة التحكم (God View Dashboard)
### الإحصائيات المعروضة
- **إجمالي الجامعات** — `SELECT COUNT(*) FROM tenants`
- **الجامعات النشطة** — `tenants WHERE status='active'`
- **الجامعات المعلّقة** — `tenants WHERE status='suspended'`
- **الجامعات المحذوفة** — `tenants WHERE status='deleted'`
- **استخدام التخزين** — `SUM(storage_used_gb) / SUM(max_storage_gb) FROM tenants`
- **استهلاك AI Tokens** — `SUM(total_tokens), SUM(cost_usd) FROM ai_token_usage`
- **الإيرادات المحصّلة** — `SUM(amount) FROM invoices WHERE status='paid'`

### الجداول المُستخدمة
| الجدول | العمليات |
|---|---|
| `tenants` | SELECT (id, status, storage_used_gb, max_storage_gb) |
| `ai_token_usage` | SELECT (tenant_id, total_tokens, cost_usd) |
| `invoices` | SELECT (status, amount) |

## نظام الإعلانات (FR-SA3.4)
### Server Actions
- `getAnnouncements()` — جلب جميع الإعلانات
- `createAnnouncement(formData)` — إنشاء إعلان جديد
- `toggleAnnouncement(id, is_active)` — تفعيل/إخفاء إعلان
- `deleteAnnouncement(id)` — حذف إعلان

### الجداول المُستخدمة
| الجدول | العمليات |
|---|---|
| `system_announcements` | SELECT, INSERT, UPDATE, DELETE |

### سياسات RLS المعتمدة
- `super_admin_manage_announcements` — صلاحية كاملة للمشرف
- `all_read_active_announcements` — قراءة للجميع (النشطة + غير المنتهية)

## الملفات
- `src/app/super-admin/page.tsx` (تعديل — God View Dashboard)
- `src/app/super-admin/announcements/actions.ts`
- `src/app/super-admin/announcements/page.tsx`
- `src/app/super-admin/announcements/announcements-client.tsx`
