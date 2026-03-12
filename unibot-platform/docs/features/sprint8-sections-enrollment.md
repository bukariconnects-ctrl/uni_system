# Sprint 8: إدارة الشعب والتسجيل الجماعي [FR-AM1.2, FR-AM1.3, FR-AM1.5]

## الوصف
بناء واجهة الإدارة الأكاديمية الكاملة: لوحة تحكم، إدارة الشعب (فتح/إغلاق/دمج/تعيين محاضر)، والتسجيل الجماعي للطلاب.

## Server Actions

### الشعب الدراسية
- `getSections()` — جلب الشعب مع المقرر والفصل والمحاضر
- `getCoursesForSections()` / `getSemestersForSections()` / `getFacultyForSections()`
- `createSection(formData)` — فتح شعبة جديدة
- `updateSectionStatus(id, status)` — فتح/إغلاق/أرشفة
- `updateSectionInstructor(id, instructorId)` — تعيين/تغيير محاضر
- `mergeSection(sourceId, targetId)` — دمج شعبة في أخرى

### التسجيل الجماعي
- `getOpenSections()` — الشعب المفتوحة للتسجيل
- `getStudents()` — الطلاب النشطون
- `batchEnroll(sectionId, semesterId, studentIds[])` — تسجيل جماعي مع عدّاد النجاح والأخطاء
- `getEnrollments()` — سجل التسجيلات (آخر 200)
- `updateEnrollmentStatus(id, status)` — سحب/إعادة تسجيل

## الجداول المُستخدمة
| الجدول | العمليات | القيود |
|---|---|---|
| `sections` | CRUD | `UNIQUE(tenant_id, semester_id, course_id, section_code)` |
| `enrollments` | INSERT, UPDATE | `UNIQUE(student_id, section_id)` — trigger يحدّث `enrolled_count` تلقائياً |
| `profiles` | SELECT | — |
| `semesters` | SELECT | — |
| `courses` | SELECT | — |

## واجهة المستخدم

### لوحة تحكم الإدارة الأكاديمية
- إحصائيات: عدد الشعب، الطلاب المسجلون، المحاضرات المجدولة
- تنبيه إذا لم يكن هناك فصل نشط

### إدارة الشعب
- إنشاء شعب جديدة مع اختيار المقرر والفصل والمحاضر
- أزرار: إغلاق / إعادة فتح / أرشفة / دمج / تعيين محاضر
- عرض نسبة الامتلاء (enrolled_count/max_capacity)

### التسجيل الجماعي
- **تبويبان**: تسجيل جماعي / سجل التسجيلات
- اختيار شعبة → تحديد طلاب متعددين (checkboxes) → تسجيل دفعة واحدة
- عرض نتائج التسجيل: عدد الناجح + الأخطاء

## الملفات
- `src/app/academic-management/layout.tsx`
- `src/app/academic-management/components/sidebar.tsx`
- `src/app/academic-management/page.tsx`
- `src/app/academic-management/sections/actions.ts`
- `src/app/academic-management/sections/page.tsx`
- `src/app/academic-management/sections/sections-client.tsx`
- `src/app/academic-management/enrollments/actions.ts`
- `src/app/academic-management/enrollments/page.tsx`
- `src/app/academic-management/enrollments/enrollments-client.tsx`
