# Sprint 11: التكاليف والتسليمات [FR-FM2.1, FR-FM2.2, FR-ST2.2]

## الوصف
بناء نظام التكاليف الكامل: إنشاء التكاليف من المحاضر، تسليم الطلاب مع رفع الملفات، وتصحيح التسليمات مع الملاحظات.

## Server Actions

### المحاضر
- `getAssignments(sectionId?)` — جلب التكاليف
- `createAssignment(formData)` — إنشاء تكليف جديد
- `toggleAssignmentPublish(id, published)` — نشر/إلغاء نشر
- `deleteAssignment(id)` — حذف تكليف
- `getSubmissions(assignmentId)` — جلب تسليمات تكليف محدد
- `gradeSubmission(id, formData)` — تصحيح مع درجة وملاحظات
- `requestResubmission(id)` — طلب إعادة تسليم

### الطالب
- `getStudentAssignments()` — تكاليف المقررات المسجلة (منشورة فقط)
- `getMySubmissions()` — تسليماتي
- `submitAssignment(formData)` — تسليم مع رفع ملف عبر Supabase Storage
  - التحقق من `due_date` و `allow_late`
  - `UNIQUE(assignment_id, student_id)` يمنع التسليم المزدوج
  - `status = 'late'` تلقائياً إذا تجاوز الموعد

## الملفات
- `src/app/faculty/assignments/actions.ts`
- `src/app/faculty/assignments/page.tsx`
- `src/app/faculty/assignments/assignments-client.tsx`
- `src/app/student/assignments/actions.ts`
- `src/app/student/assignments/page.tsx`
- `src/app/student/assignments/assignments-client.tsx`
