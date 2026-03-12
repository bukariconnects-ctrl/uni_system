# 🎫 النظام الفرعي 8: نظام التذاكر الأكاديمية — v2.0
### Academic Ticketing System
**محدَّث بمراجع قاعدة البيانات الفعلية**

---

## 📌 نظرة عامة

| الحقل | التفاصيل |
|---|---|
| **هدف النظام** | أتمتة الطلبات والطعون والشكاوى مع تتبع شفاف + AI Pre-resolution قبل فتح التذكرة |
| **الأدوار المرتبطة** | `student` + `faculty` (مُقدِّم) + `academic_management` + `tenant_admin` (مُعالِج) |
| **الأولوية** | 🟡 متوسطة |
| **المتطلب الرئيسي** | SR-8 / FR-AM5 / FR-FM6 / FR-ST6 |
| **ملف SQL** | `part2_lms_messaging_ai_ticketing.sql` — القسم 12 |

---

## 🗄️ خريطة مخطط قاعدة البيانات

| الجدول | الغرض | حقول مهمة |
|---|---|---|
| `tickets` | التذاكر الرئيسية | `ticket_number VARCHAR (auto-generated)`, `category ENUM`, `priority ENUM`, `status ENUM`, `ai_attempted BOOLEAN`, `ai_suggestion TEXT`, `rating SMALLINT` |
| `ticket_messages` | Thread المحادثة | `is_internal BOOLEAN` — الرسائل الداخلية لا يراها المُقدِّم |
| `ticket_attachments` | مرفقات التذاكر | `mime_type`, `file_url` |
| `approval_workflows` | مسارات الموافقة متعددة الخطوات | `step_order INT`, `status ENUM (pending/approved/rejected)`, `decision_notes TEXT` |

### ENUMs ذات الصلة

```sql
CREATE TYPE ticket_status AS ENUM ('open','in_progress','pending_info','resolved','closed','rejected');
CREATE TYPE ticket_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE ticket_category AS ENUM (
    'grade_appeal',       -- طعن في درجة
    'absence_excuse',     -- عذر غياب
    'registration_issue', -- مشكلة تسجيل
    'schedule_change',    -- طلب تغيير جدول
    'venue_issue',        -- مشكلة قاعة
    'technical_problem',  -- مشكلة تقنية
    'administrative',     -- إداري عام
    'other'               -- أخرى
);
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
```

### Triggers والدوال الحرجة

| Trigger / Function | يعمل على | الوصف |
|---|---|---|
| `generate_ticket_number()` | `tickets` (BEFORE INSERT) | يُولِّد `ticket_number = 'TKT-XXXXXX'` تسلسلياً لكل مستأجر |
| `trg_generate_ticket_number` | `tickets` | يُشغِّل الدالة أعلاه |
| `notify_ticket_status_change()` | `tickets` (AFTER UPDATE) | عند تغيُّر `status` → `INSERT INTO notifications` للمُقدِّم |
| `trg_notify_ticket_status` | `tickets` | يُشغِّل الدالة أعلاه |
| `update_ticket_search_vector()` | `tickets` (BEFORE INSERT/UPDATE) | GIN Full-Text Search index على `title + description + ticket_number` |
| `trg_tickets_update_search_vector` | `tickets` | يُشغِّل الدالة أعلاه |

### كيف يعمل توليد رقم التذكرة (من SQL)

```sql
CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS TRIGGER AS $$
DECLARE v_count INT;
BEGIN
    SELECT COUNT(*) + 1 INTO v_count FROM tickets WHERE tenant_id = NEW.tenant_id;
    NEW.ticket_number := 'TKT-' || LPAD(v_count::TEXT, 6, '0');
    -- يُولِّد: TKT-000001, TKT-000002, ... بشكل مستقل لكل جامعة
    RETURN NEW;
END; $$;
```

---

## 🔐 سياسات RLS المُطبَّقة

| السياسة | الجدول | النطاق |
|---|---|---|
| `user_create_own_ticket` | `tickets` | INSERT: `created_by = current_profile_id()` فقط |
| `user_read_own_tickets` | `tickets` | الطالب/المحاضر: يقرأ تذاكره هو فقط |
| `user_update_own_ticket` | `tickets` | المُقدِّم: تعديل تذكرته (`status IN ('open','closed')` فقط) |
| `admin_manage_all_tickets` | `tickets` | Academic Management + Tenant Admin: صلاحية كاملة |
| `user_read_own_ticket_messages` | `ticket_messages` | المُقدِّم: رسائل تذاكره (غير الداخلية `is_internal=FALSE`) |
| `admin_read_all_ticket_messages` | `ticket_messages` | Admins: كل الرسائل بما فيها الداخلية |
| `participants_send_ticket_messages` | `ticket_messages` | INSERT: المُقدِّم أو المُعيَّن له أو Admin |
| `user_read_own_ticket_attachments` | `ticket_attachments` | المُقدِّم: مرفقات تذاكره |
| `admin_read_all_ticket_attachments` | `ticket_attachments` | Admins: كل المرفقات |
| `admin_manage_approval_workflows` | `approval_workflows` | Academic Management: إنشاء مسارات الموافقة |
| `approver_read_own_workflow` | `approval_workflows` | المُوافِق: قراءة مسارات هو مُعيَّن لها |
| `approver_decide_workflow` | `approval_workflows` | المُوافِق: تحديث قراره (`approved/rejected`) فقط |

---

## ✅ قائمة المهام التفصيلية للمطورين

### 📝 تقديم التذاكر (Students & Faculty)

- [ ] **[FR-ST6.1]** بناء `POST /api/tickets`:
  - `INSERT INTO tickets (tenant_id, created_by=current_user, category, priority='medium', title, description, related_section_id, ai_attempted=FALSE)`
  - **يُشغِّل `trg_generate_ticket_number` تلقائياً** → `ticket_number = 'TKT-XXXXXX'`
  - **يُشغِّل `trg_notify_ticket_status` تلقائياً** عند أي تغيير لاحق

- [ ] **[FR-ST6.2]** تطبيق **AI Pre-resolution** قبل إرسال التذكرة:
  - عند بدء كتابة التذكرة (أو عند النقر "إرسال"):
    1. استدعاء RAG Chat API بـ `description` الطالب
    2. إذا وجدت إجابة → عرض `ai_suggestion` في بطاقة صفراء: "وجدنا إجابة محتملة..."
       - زر "هذا يحل مشكلتي" → `POST /api/tickets` مع `ai_attempted=TRUE, ai_suggestion=RESPONSE, status='closed'` (تلقائي)
       - زر "سأواصل فتح التذكرة" → مواصلة الإرسال مع `ai_attempted=TRUE, ai_suggestion=RESPONSE`
    3. إذا لم توجد → `ai_attempted=FALSE`
  - هذا يُقلِّل العبء على الإدارة الأكاديمية

- [ ] **[FR-ST6.1 / FR-FM6.1]** بناء `POST /api/tickets/{id}/attachments`:
  - رفع الملف لـ Storage → `INSERT INTO ticket_attachments (ticket_id, uploaded_by, file_name, file_url, mime_type)`

- [ ] **[FR-FM6.2 / FR-ST6.3]** بناء `POST /api/tickets/{id}/messages`:
  - `INSERT INTO ticket_messages (ticket_id, sender_id=current_user, body, is_internal=FALSE)`
  - سياسة `participants_send_ticket_messages` تضمن الإدراج فقط للأطراف المعنية

### 🔧 معالجة التذاكر (Academic Management)

- [ ] **[FR-AM5.1]** بناء `GET /api/tickets` مع فلاتر:
  - `status`, `priority`, `category`, `date_range`, `assigned_to`
  - Full-Text Search: `WHERE tickets.search_vector @@ to_tsquery($query)` (GIN Index)
  - سياسة `admin_manage_all_tickets` تُعيد جميع تذاكر الجامعة

- [ ] **[FR-AM5.2]** بناء `POST /api/tickets/{id}/reply` (Admin Internal Reply):
  - `INSERT INTO ticket_messages (is_internal=FALSE)` للرد العلني
  - `INSERT INTO ticket_messages (is_internal=TRUE)` للملاحظة الداخلية (لا يراها المُقدِّم)

- [ ] **[FR-AM5.3]** بناء `PATCH /api/tickets/{id}/assign`:
  - `UPDATE tickets SET assigned_to=TARGET_PROFILE_ID, status='in_progress'`
  - **يُشغِّل `trg_notify_ticket_status` تلقائياً** → إشعار للمُقدِّم بـ `'ticket_update'`

- [ ] **[FR-AM5.4]** بناء مسار الموافقة `POST /api/tickets/{id}/workflow`:
  - `INSERT INTO approval_workflows (ticket_id, approver_id, step_order, status='pending')`
  - دعم مراحل متعددة: خطوة 1 (رئيس القسم) → خطوة 2 (العميد) → إلخ

- [ ] **[FR-AM5.4]** بناء `PATCH /api/workflows/{id}/decide`:
  - `UPDATE approval_workflows SET status='approved/rejected', decision_notes=Y, decided_at=NOW()`
  - سياسة `approver_decide_workflow` تضمن أن المُوافِق هو من يُحدِّث فقط
  - إذا اكتملت كل الخطوات → تحديث `tickets.status='resolved'`

- [ ] **[FR-AM5.5]** بناء `PATCH /api/tickets/{id}/resolve`:
  - `UPDATE tickets SET status='resolved', resolved_at=NOW()`
  - **يُشغِّل `trg_notify_ticket_status`** → إشعار فوري للمُقدِّم

### 📋 تتبع التذاكر (Requester View)

- [ ] **[FR-ST6.3]** بناء `GET /api/tickets/my-tickets`:
  - قراءة من `tickets` بسياسة `user_read_own_tickets`
  - مُرتَّبة بـ `created_at DESC`

- [ ] **[FR-ST6.3]** بناء `PATCH /api/tickets/{id}/rate`:
  - `UPDATE tickets SET rating=X WHERE id=T AND created_by=current_profile_id() AND status='resolved'`
  - التحقق: `CHECK (rating BETWEEN 1 AND 5)` موجود في DB

- [ ] **[FR-ST6.3]** إعداد Supabase Realtime على `tickets`:
  - `channel('tickets:TICKET_ID').on('UPDATE', callback)` لتحديث الحالة فورياً

### 🎨 الواجهة الأمامية

- [ ] **[FR-ST6.1]** نموذج فتح التذكرة بـ 3 خطوات: (1) النوع والوصف → (2) AI Pre-resolution Card → (3) إرسال أو إلغاء
- [ ] **[FR-ST6.2]** مكوّن **AI Pre-resolution Card**: بطاقة صفراء تعرض `ai_suggestion` مع زرين
- [ ] **[FR-ST6.3]** صفحة **تذاكري**: جدول مع Pill Badges (`status ENUM` → ألوان مختلفة)
- [ ] **[FR-AM5.1]** لوحة **إدارة التذاكر**: Kanban أو جدول مع فلاتر متقدمة + Full-Text Search
- [ ] **[FR-AM5.4]** مكوّن **Approval Workflow Timeline**: خطوات أفقية مع حالة كل خطوة

---

## 🧪 خطة الاختبار

- [ ] اختبار Trigger: إنشاء تذكرة → `ticket_number = 'TKT-000001'` (أول تذكرة في الجامعة)
- [ ] اختبار Trigger: تغيير `tickets.status` → إنشاء `notifications` تلقائياً للمُقدِّم
- [ ] اختبار AI Pre-resolution: سؤال موجود في اللوائح → عرض `ai_suggestion`
- [ ] اختبار Approval Workflow: مسار خطوتين → اعتماد الخطوة 1 → اعتماد الخطوة 2 → `status='resolved'`
- [ ] اختبار RLS: الطالب لا يقرأ تذاكر طالب آخر (`user_read_own_tickets`)
- [ ] اختبار is_internal: الطالب لا يرى رسائل `is_internal=TRUE` من الإدارة

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
