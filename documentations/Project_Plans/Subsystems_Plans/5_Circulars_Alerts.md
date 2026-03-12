# 📢 النظام الفرعي 5: التعاميم والتنبيهات الذكية — v2.0
### Smart Circulars & Notifications System
**محدَّث بمراجع قاعدة البيانات الفعلية**

---

## 📌 نظرة عامة

| الحقل | التفاصيل |
|---|---|
| **هدف النظام** | بث المعلومات الرسمية بدقة + تنبيهات تلقائية ذكية مُدمَجة في قاعدة البيانات |
| **الأدوار المرتبطة** | `academic_management` + `tenant_admin` (مُنشئ) + جميع المستخدمين (مُستقبِل) |
| **الأولوية** | 🟠 عالية |
| **المتطلب الرئيسي** | SR-5 / FR-AM4 / FR-TA6.1 / FR-SA3.4 |
| **ملف SQL** | `part2_lms_messaging_ai_ticketing.sql` — القسم 9 |

---

## 🗄️ خريطة مخطط قاعدة البيانات

| الجدول | الغرض | حقول مهمة |
|---|---|---|
| `circulars` | التعاميم الرسمية المُنشأة يدوياً | `target_type ENUM`, `target_id UUID`, `is_mandatory BOOLEAN`, `tenant_id NULL` = تعميم شامل من Super Admin |
| `notifications` | التنبيهات التلقائية والمُرسَلة | `notification_type ENUM`, `reference_table/reference_id` للربط |
| `system_announcements` | إعلانات Super Admin لمديري الجامعات | `is_active BOOLEAN`, `expires_at TIMESTAMPTZ` |

### ENUMs ذات الصلة

```sql
CREATE TYPE circular_target_type AS ENUM (
    'all',          -- جميع مستخدمي الجامعة
    'department',   -- قسم محدد (target_id → departments.id)
    'major',        -- تخصص محدد (target_id → majors.id)
    'level',        -- مستوى دراسي (target_id → academic_levels.id)
    'section',      -- شعبة محددة (target_id → sections.id)
    'faculty',      -- أعضاء هيئة التدريس فقط
    'students'      -- الطلاب فقط
);

CREATE TYPE notification_type AS ENUM (
    'circular',          -- تعميم رسمي
    'absence_warning',   -- تحذير اقتراب من حد الغياب
    'absence_dismissal', -- تجاوز حد الغياب (حرمان)
    'grade_released',    -- نشر الدرجات
    'assignment_due',    -- تذكير موعد تسليم
    'ticket_update',     -- تحديث حالة تذكرة
    'system',            -- رسالة نظام
    'risk_alert',        -- تنبيه طالب في منطقة الخطر
    'recommendation',    -- توصية أكاديمية
    'schedule_change',   -- تغيير في الجدول الدراسي
    'cancellation'       -- إلغاء محاضرة
);
```

### Triggers والدوال التلقائية

| Trigger / Function | يعمل على | الوصف |
|---|---|---|
| `notify_absence_warning()` | `attendance_summaries` (AFTER INSERT/UPDATE) | يُدرج في `notifications` عند تجاوز 70% من حد الغياب (`absence_warning`) أو تجاوز الحد كاملاً (`absence_dismissal`) |
| `trg_notify_absence_warning` | `attendance_summaries` | يُشغِّل الدالة أعلاه |
| `notify_ticket_status_change()` | `tickets` (AFTER UPDATE) | يُدرج في `notifications` بنوع `'ticket_update'` عند تغيُّر الحالة |
| `trg_notify_ticket_status` | `tickets` | يُشغِّل الدالة أعلاه |
| `send_risk_alerts()` | pg_cron (يومياً 02:30) | يُدرج `'risk_alert'` notifications للمحاضرين عن طلاب `risk_level IN ('high','critical')` |

### كيف تعمل التنبيهات التلقائية (من SQL)

```sql
-- مثال: notify_absence_warning() — تُدرج عند وصول 70% من الحد لأول مرة
INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
VALUES (
    NEW.tenant_id,
    NEW.student_id,
    'absence_warning',
    'تحذير: اقتراب من حد الغياب',
    'نسبة غيابك اقتربت من الحد المسموح به (' || v_threshold || '%). تنبّه!',
    'attendance_summaries',
    NEW.id  -- للربط المرجعي
);
```

---

## 🔐 سياسات RLS المُطبَّقة

| السياسة | الجدول | النطاق |
|---|---|---|
| `admin_manage_circulars` | `circulars` | Super Admin: كامل / Tenant Admin + Academic Management: بيانات جامعتهم |
| `tenant_read_published_circulars` | `circulars` | جميع المستخدمين: قراءة المنشورة + غير المنتهية (`expires_at > NOW()` أو NULL) |
| `user_read_own_notifications` | `notifications` | كل مستخدم: إشعاراته فقط (`recipient_id = current_profile_id()`) |
| `user_mark_own_notification_read` | `notifications` | كل مستخدم: تحديث `is_read=TRUE` على إشعاراته فقط |
| `system_insert_notifications` | `notifications` | INSERT: أي مستخدم ضمن المستأجر (يُستخدم بالـ Triggers والـ Edge Functions) |
| `super_admin_manage_announcements` | `system_announcements` | Super Admin: كامل |
| `all_read_active_announcements` | `system_announcements` | جميع المستخدمين: قراءة النشطة (`is_active=TRUE AND expires_at > NOW()`) |

---

## ✅ قائمة المهام التفصيلية للمطورين

### 📋 إنشاء التعاميم (Academic Management / Tenant Admin)

- [ ] **[FR-AM4.1]** بناء `POST /api/circulars`:
  - `INSERT INTO circulars (tenant_id, created_by, title, body, target_type, target_id, is_mandatory, is_published=FALSE)`
  - `target_type` ENUM يحدد مجال الاستهداف:
    - `'all'` → `target_id = NULL`
    - `'department'` → `target_id = departments.id`
    - `'major'` → `target_id = majors.id`
    - `'level'` → `target_id = academic_levels.id`
    - `'section'` → `target_id = sections.id`
    - `'faculty'` / `'students'` → `target_id = NULL` (حسب دور المستخدم)
- [ ] **[FR-AM4.1]** بناء `PATCH /api/circulars/{id}/publish`:
  - `UPDATE circulars SET is_published=TRUE, published_at=NOW()`
  - ثم **إنشاء `notifications`** لكل مستخدم مستهدف (Server-Side logic):
    - استعلام يحدد المستخدمين بناءً على `target_type/target_id`
    - `INSERT INTO notifications (..., notification_type='circular', reference_table='circulars', reference_id=circular_id)`
- [ ] **[FR-TA6.1]** بناء `POST /api/tenant/announcement`:
  - تعميم شامل بـ `target_type='all'` و`is_mandatory=TRUE` — يظهر كـ Banner إلزامي
- [ ] **[FR-SA3.4]** بناء `POST /api/admin/system-announcements`:
  - `INSERT INTO system_announcements (title, body, is_active=TRUE, expires_at)`
  - يظهر للـ Tenant Admins جميعاً في لوحات تحكمهم

### 🔔 منطق استهداف التعاميم (Server Logic)

- [ ] **[FR-AM4.1]** بناء دالة `resolveCircularTargets(circular_id)` في Edge Function:
  ```
  switch (target_type):
    'all'        → SELECT id FROM profiles WHERE tenant_id=X
    'department' → SELECT p.id FROM profiles p JOIN faculty_departments fd ON p.id=fd.faculty_id WHERE fd.department_id=target_id
                   UNION SELECT p.id FROM ... students in that department
    'section'    → SELECT student_id FROM enrollments WHERE section_id=target_id AND status='enrolled'
    'faculty'    → SELECT id FROM profiles WHERE tenant_id=X AND role='faculty'
    'students'   → SELECT id FROM profiles WHERE tenant_id=X AND role='student'
  ```
  - Batch INSERT في `notifications` لتجنب الـ N+1 queries

### 📬 قراءة التنبيهات والتعاميم (All Users)

- [ ] **[FR-ST1.x]** بناء `GET /api/notifications`:
  - قراءة من `notifications` بسياسة `user_read_own_notifications`
  - مُرتَّبة بـ `created_at DESC`
  - فلترة `is_read=FALSE` للـ Badge العددي
- [ ] **[FR-ST1.x]** بناء `PATCH /api/notifications/{id}/read`:
  - `UPDATE notifications SET is_read=TRUE, read_at=NOW() WHERE id=X AND recipient_id=current_profile_id()`
- [ ] **[FR-ST1.x]** بناء `PATCH /api/notifications/mark-all-read`:
  - `UPDATE notifications SET is_read=TRUE, read_at=NOW() WHERE recipient_id=current_profile_id() AND is_read=FALSE`
- [ ] **[FR-ST1.x]** إعداد Supabase Realtime على `notifications`:
  - `channel('notifications:USER_ID').on('INSERT', callback)` لإظهار التنبيه الفوري
- [ ] **[FR-ST1.x]** بناء `GET /api/circulars`:
  - قراءة من `circulars` بسياسة `tenant_read_published_circulars`
  - التعاميم الإلزامية (`is_mandatory=TRUE`) تُعرَض كـ Banner مُعلَّق في الأعلى

### 🔔 التنبيهات التلقائية (System — Triggers)

- [ ] **[تلقائي — Trigger]** التحقق من عمل `trg_notify_absence_warning`:
  - عند `attendance_summaries.absence_percentage >= threshold * 0.7` لأول مرة → `'absence_warning'`
  - عند `absence_percentage >= threshold` لأول مرة → `'absence_dismissal'`
- [ ] **[تلقائي — Trigger]** التحقق من عمل `trg_notify_ticket_status`:
  - عند `tickets.status` يتغير → `INSERT INTO notifications (..., 'ticket_update', ...)`
- [ ] **[تلقائي — pg_cron]** التحقق من عمل `send_risk_alerts()`:
  - يُشغَّل يومياً 02:30 → يُدرج `'risk_alert'` لمحاضري الشعب التي تحوي طلاب `risk_level='high/critical'`
  - يُعيِّن `student_risk_scores.alert_sent=TRUE` لمنع الإرسال المكرر

### 🎨 الواجهة الأمامية

- [ ] **[FR-AM4.1]** مكوّن **Audience Selector**: Dropdown Tree بـ `target_type` ENUM + بحث بـ `target_id`
- [ ] **[FR-TA6.1]** مكوّن **Mandatory Banner**: شريط أصفر/أحمر ثابت في أعلى الصفحة لـ `is_mandatory=TRUE`
- [ ] **[FR-ST1.x]** مكوّن **Notification Bell**: بـ Badge عددي للإشعارات غير المقروءة + Dropdown بآخر 10
- [ ] **[FR-ST3.2]** تصميم **Alert Card**: بطاقة حمراء بارزة لـ `'absence_dismissal'` + برتقالية لـ `'absence_warning'`
- [ ] **[FR-ST1.x]** صفحة **التعاميم**: قائمة مُرتَّبة مع Pill Badge لنوع الاستهداف (`للطلاب` / `لقسم كذا`)

---

## 🧪 خطة الاختبار

- [ ] اختبار Trigger: تسجيل غياب حتى 70% من الحد → التحقق من `notifications.notification_type = 'absence_warning'`
- [ ] اختبار Trigger: تغيير `tickets.status` → التحقق من إنشاء `notification_type='ticket_update'` للمُقدِّم
- [ ] اختبار pg_cron: تشغيل `send_risk_alerts()` يدوياً → التحقق من إنشاء `risk_alert` notifications + `alert_sent=TRUE`
- [ ] اختبار RLS: مستخدم لا يقرأ إشعارات شخص آخر
- [ ] اختبار Realtime: إنشاء `notification` → ظهوره فورياً في الـ Bell دون إعادة تحميل الصفحة

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
