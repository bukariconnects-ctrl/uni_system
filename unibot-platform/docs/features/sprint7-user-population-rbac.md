# Sprint 7: إدارة المستخدمين والأدوار [FR-TA3.1, FR-TA3.2, FR-TA3.3]

## الوصف
بناء أداة استيراد المستخدمين بالجملة عبر CSV، وإدارة الأدوار المخصصة (RBAC)، مع واجهة عرض وتعليق المستخدمين.

## Server Actions

### استيراد المستخدمين
- `bulkImportUsers(rows)` — استيراد جماعي يقوم بـ:
  1. إنشاء مستخدم في `auth.users` عبر Admin API
  2. إنشاء `profiles` مع `tenant_id` و `role`
  3. إنشاء `student_profiles` + ربط `student_majors` (للطلاب)
  4. إنشاء `faculty_profiles` + ربط `faculty_departments` (للمحاضرين)
  - يُرجع عدد الناجح وقائمة الأخطاء لكل سطر

### إدارة المستخدمين
- `getUsers()` — جلب المستخدمين مع `student_profiles` و `faculty_profiles`
- `updateUserStatus(userId, status)` — تعليق/تفعيل المستخدم

### الأدوار المخصصة (RBAC)
- `getCustomRoles()` — جلب الأدوار مع المستخدمين المعينين
- `createCustomRole(formData)` — إنشاء دور مخصص
- `deleteCustomRole(id)` — حذف دور
- `assignCustomRole(formData)` — تعيين دور لمستخدم
- `removeCustomRoleAssignment(profileId, roleId)` — إزالة تعيين

## الجداول المُستخدمة
| الجدول | العمليات | القيود |
|---|---|---|
| `profiles` | SELECT, INSERT, UPDATE | `CHECK(role='super_admin' OR tenant_id IS NOT NULL)` |
| `student_profiles` | INSERT | `UNIQUE(tenant_id, student_number)` |
| `faculty_profiles` | INSERT | `UNIQUE(tenant_id, employee_id)` |
| `student_majors` | INSERT | `PK(student_id, major_id)` |
| `faculty_departments` | INSERT | `PK(faculty_id, department_id)` |
| `custom_roles` | CRUD | `UNIQUE(tenant_id, name)` |
| `profile_custom_roles` | INSERT, DELETE | `PK(profile_id, custom_role_id)` |

## واجهة المستخدم
- **3 تبويبات**: قائمة المستخدمين / استيراد CSV / الأدوار المخصصة
- CSV Parser مبني بـ JavaScript الأصلي (بدون مكتبات خارجية)
- عرض نتائج الاستيراد: عدد الناجح + قائمة الأخطاء
- مثال CSV مُجهز للنسخ
- تعيين/إزالة الأدوار من المستخدمين مباشرة

## الملفات
- `src/app/tenant-admin/users/actions.ts`
- `src/app/tenant-admin/users/page.tsx`
- `src/app/tenant-admin/users/users-client.tsx`
