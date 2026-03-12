# Sprint 10: المحتوى التعليمي وخطط المقررات [FR-FM1.1, FR-FM1.2, FR-FM1.3, FR-ST2.1]

## الوصف
بناء بوابات المحاضر والطالب مع واجهات رفع المحتوى التعليمي وإدارة خطط المقررات.

## Server Actions

### المحاضر
- `getFacultySections()` — شعب المحاضر
- `getMaterials(sectionId?)` — المواد التعليمية
- `uploadMaterial(formData)` — رفع مادة مع Supabase Storage
- `togglePublish(id, published)` — نشر/إلغاء نشر
- `toggleAiApproved(id, approved)` — تفعيل/إلغاء اعتماد AI
- `deleteMaterial(id)` — حذف مادة
- `getSyllabi()` — خطط المقررات
- `upsertSyllabus(formData)` — إنشاء/تعديل خطة (UPSERT)
- `submitSyllabus(id)` — تقديم الخطة للاعتماد

### الطالب
- عرض المواد المنشورة فقط (`is_published=TRUE`) عبر RLS

## مكونات UI
- **AI-Approved Toggle** — زر بأيقونة ✨ Sparkles مع تدرج AI gradient عند التفعيل
- **Drag & Drop Upload Zone** — منطقة رفع ملفات بحدود متقطعة
- **Weekly Accordion** — تجميع المواد حسب الأسبوع
- **Student Download Button** — زر تحميل مباشر

## الملفات
- `src/app/faculty/layout.tsx`
- `src/app/faculty/components/sidebar.tsx`
- `src/app/faculty/page.tsx`
- `src/app/faculty/materials/actions.ts`
- `src/app/faculty/materials/page.tsx`
- `src/app/faculty/materials/materials-client.tsx`
- `src/app/student/layout.tsx`
- `src/app/student/components/sidebar.tsx`
- `src/app/student/page.tsx`
- `src/app/student/materials/page.tsx`
- `src/app/student/materials/materials-client.tsx`
- أنواع TypeScript الجديدة في `database.ts`
