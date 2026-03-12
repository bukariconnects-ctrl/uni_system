# Sprint 9: الجدولة الذكية والقاعات [FR-TA4.1, FR-AM2.1, FR-AM2.2]

## الوصف
بناء نظام إدارة القاعات لمدير الجامعة، وبناء الجدول الدراسي الأسبوعي للإدارة الأكاديمية مع كشف التعارضات تلقائياً عبر trigger قاعدة البيانات.

## Server Actions

### القاعات (Tenant Admin)
- `getVenues()` — جلب القاعات
- `createVenue(formData)` / `updateVenue(id, formData)` / `deleteVenue(id)`

### الجدول الدراسي (Academic Management)
- `getSchedules()` — جلب الجدول مع الشعب والقاعات والمحاضرين
- `getSectionsForSchedule()` — الشعب المفتوحة
- `getVenuesForSchedule()` — القاعات النشطة
- `createSchedule(formData)` — إنشاء موعد جديد (**مع معالجة أخطاء التعارض**)
- `updateSchedule(id, formData)` — تعديل موعد (**مع معالجة أخطاء التعارض**)
- `updateScheduleStatus(id, status)` — نشر/تحويل لمسودة
- `deleteSchedule(id)` — حذف موعد

## معالجة التعارضات (CRITICAL)
قاعدة البيانات تحتوي على trigger `trg_check_schedule_conflicts` يرمي أخطاء SQL:

| نوع التعارض | رسالة DB | الرسالة العربية في الواجهة |
|---|---|---|
| `SPATIAL_CONFLICT` | Venue is already booked | تعارض مكاني: القاعة محجوزة في نفس الوقت |
| `FACULTY_CONFLICT` | Instructor is already scheduled | تعارض المحاضر: المحاضر لديه محاضرة أخرى في نفس الوقت |
| `STUDENT_CONFLICT` | Mandatory course at same level | تعارض طلابي: مقرر إجباري في نفس المستوى مجدول في نفس الوقت |

### آلية المعالجة:
1. Server Action يلتقط `error.message` من Supabase
2. دالة `parseConflictError()` تفحص الرسالة وتحولها لرسالة عربية واضحة
3. Client Component يعرض رسالة التعارض بتنسيق تحذيري مميز (خلفية صفراء + أيقونة تحذير)

## الجداول المُستخدمة
| الجدول | العمليات | القيود |
|---|---|---|
| `venues` | CRUD | `UNIQUE(tenant_id, code)` |
| `schedules` | CRUD | `CHECK(start_time < end_time)` + trigger `trg_check_schedule_conflicts` |
| `sections` | SELECT | — |

## واجهة المستخدم

### القاعات (Tenant Admin)
- بطاقات شبكية تعرض: اسم، نوع، سعة، مبنى، طابق، تجهيزات
- ألوان مختلفة حسب نوع القاعة (محاضرات/مختبر/مدرج)
- مؤشرات بصرية للبروجكتور والتكييف

### الجدول الدراسي (Academic Management)
- **فلتر يومي** — عرض الكل أو يوم محدد
- **عرض مجمّع باليوم** — كل يوم بلون مختلف
- كل محاضرة تعرض: الوقت، المقرر، الشعبة، المحاضر، القاعة، الحالة
- أزرار: تعديل / نشر / تحويل لمسودة / حذف
- **رسائل التعارض** تظهر بتنسيق تحذيري واضح

## الملفات
- `src/app/tenant-admin/venues/actions.ts`
- `src/app/tenant-admin/venues/page.tsx`
- `src/app/tenant-admin/venues/venues-client.tsx`
- `src/app/academic-management/schedules/actions.ts`
- `src/app/academic-management/schedules/page.tsx`
- `src/app/academic-management/schedules/schedules-client.tsx`
