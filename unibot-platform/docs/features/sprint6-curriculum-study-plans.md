# Sprint 6: المقررات والخطط الدراسية [FR-TA2.3, FR-TA2.4]

## الوصف
بناء كتالوج المقررات الدراسية وربطها بالخطط الدراسية (المستويات) وتعريف المتطلبات السابقة.

## Server Actions

### كتالوج المقررات
- `getCourses()` — جلب المقررات مع أسماء الأقسام
- `createCourse(formData)` / `updateCourse(id, formData)` / `deleteCourse(id)`

### الخطة الدراسية
- `getStudyPlanData()` — جلب المستويات والمقررات والخطة والمتطلبات
- `addStudyPlanCourse(formData)` — ربط مقرر بمستوى دراسي
- `removeStudyPlanCourse(id)` — حذف مقرر من الخطة

### المتطلبات السابقة
- `addPrerequisite(formData)` — إضافة متطلب سابق مع فحص `CHECK(course_id <> prerequisite_id)`
- `removePrerequisite(id)` — حذف متطلب

## الجداول المُستخدمة
| الجدول | العمليات | القيود |
|---|---|---|
| `courses` | CRUD | `UNIQUE(tenant_id, code)` |
| `study_plan_courses` | INSERT, DELETE | `UNIQUE(academic_level_id, course_id, semester_type)` |
| `course_prerequisites` | INSERT, DELETE | `UNIQUE(course_id, prerequisite_id)` + `CHECK(course_id <> prerequisite_id)` |

## واجهة المستخدم
- **3 تبويبات**: كتالوج المقررات / الخطة الدراسية / المتطلبات السابقة
- كل تبويب يدعم: إنشاء/تعديل/حذف مع نماذج مدمجة
- عرض نوع المقرر (نظري/عملي/مختلط) بألوان مميزة
- عرض نوع المقرر في الخطة (إجباري بالأحمر / اختياري بالأخضر)

## الملفات
- `src/app/tenant-admin/courses/actions.ts`
- `src/app/tenant-admin/courses/page.tsx`
- `src/app/tenant-admin/courses/courses-client.tsx`
