# Sprint 4: إعداد مدير الجامعة والتهيئة العامة [FR-TA1.1, FR-TA1.2, FR-TA1.3]

## الوصف
بناء واجهة مدير الجامعة (Tenant Admin) مع لوحة التحكم، إعدادات العلامة التجارية، التوطين، ونسبة الحرمان، بالإضافة إلى إدارة التقويم الأكاديمي.

## لوحة تحكم مدير الجامعة
### الإحصائيات المعروضة
- إجمالي المستخدمين — `SELECT COUNT(*) FROM profiles WHERE tenant_id=X`
- عدد الطلاب — `profiles WHERE role='student'`
- أعضاء هيئة التدريس — `profiles WHERE role='faculty'`
- الفصل الدراسي الحالي — `semesters WHERE status='active'`
- معلومات الجامعة — من جدول `tenants`

## إعدادات الجامعة (FR-TA1.1, FR-TA1.3)

### العلامة التجارية (FR-TA1.1)
- `updateBranding(formData)` — تحديث `tenants.logo_url`, `primary_color`, `secondary_color`, `welcome_message`
- CHECK constraint في DB: `primary_color ~ '^#[0-9A-Fa-f]{6}$'`

### التوطين (FR-TA1.3)
- `updateLocalization(formData)` — تحديث `tenants.timezone`, `default_language`

### نسبة الحرمان
- `updateAbsenceThreshold(formData)` — تحديث `tenants.absence_threshold`
- CHECK constraint في DB: `BETWEEN 0 AND 100`

## التقويم الأكاديمي (FR-TA1.2)

### Server Actions
- `getSemesters()` — جلب الفصول الدراسية
- `createSemester(formData)` — إنشاء فصل جديد
- `updateSemester(id, formData)` — تعديل تواريخ الفصل
- `updateSemesterStatus(id, status)` — تغيير حالة الفصل (planning → active → archived)

### أعمدة `semesters` المُستخدمة
- `academic_year`, `semester_type` (ENUM: fall/spring/summer)
- `name`, `start_date`, `end_date`
- `reg_start`, `reg_end`, `add_drop_start`, `add_drop_end`
- `grade_freeze_at`, `status` (ENUM: planning/active/archived)
- UNIQUE constraint: `(tenant_id, academic_year, semester_type)`

### سياسات RLS المعتمدة
- `tenant_admin_update_own_tenant` — تعديل بيانات الجامعة
- `admin_write_semesters` — إدارة الفصول الدراسية
- `tenant_read_semesters` — قراءة الفصول

## الملفات
### Tenant Admin Layout
- `src/app/tenant-admin/layout.tsx`
- `src/app/tenant-admin/components/sidebar.tsx`
- `src/app/tenant-admin/page.tsx`

### الإعدادات
- `src/app/tenant-admin/settings/actions.ts`
- `src/app/tenant-admin/settings/page.tsx`
- `src/app/tenant-admin/settings/settings-client.tsx`

### التقويم الأكاديمي
- `src/app/tenant-admin/calendar/actions.ts`
- `src/app/tenant-admin/calendar/page.tsx`
- `src/app/tenant-admin/calendar/calendar-client.tsx`
