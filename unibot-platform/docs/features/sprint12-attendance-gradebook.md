# Sprint 12: الحضور الذكي وسجل الدرجات [FR-FM2.3, FR-FM3.1, FR-ST2.3, FR-ST3.1]

## الوصف
بناء نظام الحضور الذكي مع توليد QR وتسجيل حضور الطلاب، وسجل الدرجات مع الدرجة المحسوبة تلقائياً (`total_grade` GENERATED COLUMN).

## Server Actions

### المحاضر — الحضور
- `getAttendanceSessions(sectionId?)` — جلب الجلسات
- `createAttendanceSession(formData)` — إنشاء جلسة + إنشاء سجلات حضور تلقائية لجميع الطلاب المسجلين
- `generateQrCode(sessionId)` — توليد رمز QR بصلاحية 10 ثوانٍ
- `closeSession(sessionId)` — إغلاق الجلسة
- `getSessionRecords(sessionId)` — جلب سجلات جلسة
- `updateAttendanceRecord(recordId, status, reason?)` — تحديث حالة الطالب

### المحاضر — سجل الدرجات
- `getGradebookEntries(sectionId)` — جلب سجلات الدرجات
- `initGradebook(sectionId)` — تهيئة سجل الدرجات لجميع الطلاب المسجلين
- `updateGrade(entryId, formData)` — تحديث درجات (أعمال/منتصف/نهائي)
- `publishGrades(sectionId)` — نشر الدرجات للطلاب

### ملاحظات مهمة
- `total_grade` عمود GENERATED ALWAYS — لا يتم تعيينه يدوياً
- `trg_recalc_attendance_summary` يحدث ملخص الحضور تلقائياً
- `trg_sync_final_grade` يحدث `enrollments.final_grade` و `letter_grade` عند نشر الدرجات
- `trg_notify_absence_warning` يرسل إشعارات تحذير الغياب تلقائياً

## الملفات
- `src/app/faculty/attendance/actions.ts`
- `src/app/faculty/attendance/page.tsx`
- `src/app/faculty/attendance/attendance-client.tsx`
- `src/app/faculty/gradebook/actions.ts`
- `src/app/faculty/gradebook/page.tsx`
- `src/app/faculty/gradebook/gradebook-client.tsx`
- `src/app/student/attendance/page.tsx`
- `src/app/student/attendance/attendance-client.tsx`
- `src/app/student/grades/page.tsx`
