# Sprint 5: الهيكل الأكاديمي [FR-TA2.1, FR-TA2.2]

## الوصف
بناء الشجرة التنظيمية للجامعة: الكليات → الأقسام → التخصصات → المستويات الدراسية، مع واجهة شجرية قابلة للطي.

## Server Actions
- `getColleges()` — جلب الكليات مع الأقسام والتخصصات والمستويات (nested select)
- `createCollege(formData)` / `updateCollege(id, formData)` / `deleteCollege(id)`
- `createDepartment(formData)` / `updateDepartment(id, formData)` / `deleteDepartment(id)`
- `createMajor(formData)` / `updateMajor(id, formData)` / `deleteMajor(id)`
- `createLevel(formData)` / `updateLevel(id, formData)` / `deleteLevel(id)`
- `getFacultyMembers()` — جلب أعضاء هيئة التدريس لاختيار العميد/رئيس القسم

## الجداول المُستخدمة
| الجدول | العمليات | القيود |
|---|---|---|
| `colleges` | SELECT, INSERT, UPDATE, DELETE | `UNIQUE(tenant_id, code)` |
| `departments` | SELECT, INSERT, UPDATE, DELETE | `UNIQUE(tenant_id, code)` |
| `majors` | SELECT, INSERT, UPDATE, DELETE | `UNIQUE(tenant_id, code)` |
| `academic_levels` | SELECT, INSERT, UPDATE, DELETE | `UNIQUE(major_id, level_number)` |
| `profiles` | SELECT (faculty only) | — |

## سياسات RLS المعتمدة
- `tenant_read_colleges` / `tenant_admin_write_colleges`
- `tenant_read_departments` / `tenant_admin_write_departments`
- `tenant_read_majors` / `admin_write_majors`
- `tenant_read_academic_levels` / `admin_write_academic_levels`

## واجهة المستخدم
- **شجرة قابلة للطي** — كلية → أقسام → تخصصات → مستويات
- كل مستوى يدعم: إنشاء/تعديل/حذف مع نماذج مدمجة
- اختيار العميد/رئيس القسم من قائمة أعضاء هيئة التدريس
- معالجة أخطاء UNIQUE constraints برسائل عربية واضحة

## الملفات
- `src/lib/types/database.ts` (تعديل — إضافة أنواع جديدة)
- `src/app/tenant-admin/academic/actions.ts`
- `src/app/tenant-admin/academic/page.tsx`
- `src/app/tenant-admin/academic/academic-client.tsx`
- `src/app/tenant-admin/components/sidebar.tsx` (تعديل — إضافة روابط جديدة)
