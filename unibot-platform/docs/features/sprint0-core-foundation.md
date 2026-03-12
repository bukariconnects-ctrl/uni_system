# Sprint 0: التأسيس الأساسي والمصادقة

## الوصف
تأسيس البنية التحتية الأساسية لمشروع UniBot بما يشمل عملاء Supabase SSR، حماية المسارات، ونظام التصميم.

## الملفات المُنشأة

### عملاء Supabase SSR
- `src/lib/supabase/server.ts` — عميل الخادم (Server Components) + عميل Admin (Service Role)
- `src/lib/supabase/client.ts` — عميل المتصفح (Client Components)
- `src/lib/supabase/middleware.ts` — عميل Middleware لتحديث الجلسات

### المصادقة وحماية المسارات
- `src/middleware.ts` — Middleware رئيسي يحمي المسارات ويوجه المستخدمين حسب أدوارهم
- `src/lib/auth/get-user.ts` — دوال مساعدة لاستخراج بيانات المستخدم والتحقق من الصلاحيات

### أنواع TypeScript
- `src/lib/types/database.ts` — تعريفات الأنواع المطابقة لـ ENUMs وجداول قاعدة البيانات

### نظام التصميم
- `src/app/globals.css` — ألوان UniBot من theme.md باستخدام Tailwind CSS v4

### الصفحات
- `src/app/layout.tsx` — Layout رئيسي بخط Inter ودعم RTL
- `src/app/login/page.tsx` — صفحة تسجيل الدخول
- `src/app/unauthorized/page.tsx` — صفحة عدم الصلاحية
- `src/app/super-admin/layout.tsx` — Layout المشرف العام مع Sidebar
- `src/app/super-admin/components/sidebar.tsx` — شريط التنقل الجانبي
- `src/app/super-admin/page.tsx` — لوحة تحكم المشرف (placeholder)

## منطق التوجيه في Middleware
| الدور | المسار |
|---|---|
| `super_admin` | `/super-admin` |
| `tenant_admin` | `/tenant-admin` |
| `academic_management` | `/academic` |
| `faculty` | `/faculty` |
| `student` | `/student` |

## الجداول المُستخدمة
- `profiles` — للتحقق من الدور و tenant_id
