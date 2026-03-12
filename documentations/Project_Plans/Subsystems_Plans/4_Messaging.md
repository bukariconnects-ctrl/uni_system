# 💬 النظام الفرعي 4: المراسلات والتفاعل — v2.0
### Messaging & Interaction System
**محدَّث بمراجع قاعدة البيانات الفعلية**

---

## 📌 نظرة عامة

| الحقل | التفاصيل |
|---|---|
| **هدف النظام** | تواصل آمن ومنظَّم داخل الجامعة: رسائل مباشرة + قنوات المقررات |
| **الأدوار المرتبطة** | `faculty` (Admin القناة) + `student` (عضو) + `academic_management` (إشراف) |
| **الأولوية** | 🟠 عالية |
| **المتطلب الرئيسي** | SR-4 / FR-FM4 / FR-ST4 |
| **ملف SQL** | `part2_lms_messaging_ai_ticketing.sql` — القسم 8 |

---

## 🗄️ خريطة مخطط قاعدة البيانات

| الجدول | الغرض | حقول مهمة |
|---|---|---|
| `conversations` | المحادثات المباشرة (1-to-1) | `participant_a/b UUID`, `last_message_at` — `CHECK (participant_a <> participant_b)` |
| `channels` | القنوات الجماعية | `section_id`, `channel_type ENUM`, `is_readonly BOOLEAN` |
| `channel_members` | أعضاء القنوات | `is_admin BOOLEAN`, `muted_until TIMESTAMPTZ` |
| `messages` | الرسائل (مباشرة + قناة) | `message_type ENUM`, `is_pinned`, `is_deleted`, `reply_to_id` — CHECK يضمن صحة الهدف |
| `message_attachments` | مرفقات الرسائل | `mime_type` — **CHECK يمنع الملفات التنفيذية** |

### ENUMs ذات الصلة

```sql
CREATE TYPE message_type AS ENUM ('direct', 'channel');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
CREATE TYPE channel_type AS ENUM ('course', 'department', 'announcement', 'direct');
```

### Triggers والدوال الحرجة

| Trigger / Function | يعمل على | الوصف |
|---|---|---|
| `auto_create_course_channel()` | `sections` (AFTER INSERT) | ينشئ `channels` تلقائياً بـ `channel_type='course'` |
| `trg_auto_create_course_channel` | `sections` | يُشغِّل الدالة أعلاه |
| `auto_add_to_course_channel()` | `enrollments` (AFTER INSERT/UPDATE) | عند `status='enrolled'` → `INSERT INTO channel_members` / عند `dropped/dismissed` → `DELETE` |
| `trg_auto_channel_membership` | `enrollments` | يُشغِّل الدالة أعلاه |
| `update_conversation_last_message()` | `messages` (AFTER INSERT) | يُحدِّث `conversations.last_message_at` |
| `trg_update_conversation_timestamp` | `messages` | يُشغِّل الدالة أعلاه |

### قيد أمان الملفات (من SQL)

```sql
-- يمنع رفع الملفات التنفيذية على مستوى قاعدة البيانات
CONSTRAINT chk_no_executable CHECK (
    mime_type NOT IN (
        'application/x-msdownload',  -- .exe
        'application/x-executable',
        'application/x-bat',          -- .bat
        'application/x-sh'            -- .sh
    )
)
```

### قيد صحة الرسالة (من SQL)

```sql
CONSTRAINT chk_message_target CHECK (
    (message_type = 'direct'  AND conversation_id IS NOT NULL AND channel_id IS NULL) OR
    (message_type = 'channel' AND channel_id IS NOT NULL      AND conversation_id IS NULL)
)
-- يضمن أن الرسالة المباشرة ترتبط بمحادثة فقط، وقناة الرسالة ترتبط بقناة فقط
```

---

## 🔐 سياسات RLS المُطبَّقة

| السياسة | الجدول | النطاق |
|---|---|---|
| `tenant_participants_read_conversations` | `conversations` | يقرأ فقط من هو `participant_a` أو `participant_b` |
| `tenant_create_conversations` | `conversations` | INSERT: المستخدم يجب أن يكون طرفاً في المحادثة |
| `channel_members_read_channels` | `channels` | يقرأ القنوات التي هو عضو فيها (أو Admin) |
| `admin_manage_channels` | `channels` | Academic Management: تعديل إعدادات القناة (`is_readonly`) |
| `read_own_direct_messages` | `messages` | قراءة الرسائل المباشرة: الرسالة في محادثة أنت طرف فيها |
| `read_channel_messages` | `messages` | قراءة رسائل القنوات: عضو في القناة |
| `send_messages` | `messages` | INSERT: `sender_id = current_profile_id()` فقط |
| `sender_delete_own_message` | `messages` | UPDATE: المُرسِل فقط يُحدِّث رسالته (`is_deleted=TRUE`) |
| `channel_admin_manage_messages` | `messages` | المحاضر (Admin القناة): تثبيت/حذف الرسائل |
| `read_own_message_attachments` | `message_attachments` | قراءة مرفقات الرسائل التي أنت طرف فيها |
| `members_read_channel_members` | `channel_members` | قراءة أعضاء القنوات التي أنت عضو فيها |

> **ملاحظة أداء:** سياسات `messages` تستخدم استخراج JWT مباشر (`current_setting('request.jwt.claims')`) بدلاً من دوال helper لتجنب التأخر على الجداول ذات الحجم الكبير.

---

## ✅ قائمة المهام التفصيلية للمطورين

### 💌 الرسائل المباشرة (Direct Messages)

- [ ] **[FR-ST4.1]** بناء `POST /api/conversations`:
  - `INSERT INTO conversations (tenant_id, participant_a=current_user, participant_b=TARGET_ID)`
  - CHECK DB: `participant_a <> participant_b` — يمنع المحادثة مع النفس
  - إذا وُجدت المحادثة → `ON CONFLICT DO NOTHING` وإعادة الموجودة
- [ ] **[FR-ST4.1]** بناء `POST /api/messages` (Direct):
  - التحقق: `message_type='direct'` + `conversation_id` فقط (بدون `channel_id`)
  - `INSERT INTO messages (tenant_id, message_type='direct', conversation_id, sender_id, body)`
  - **يُشغِّل `trg_update_conversation_timestamp`** تلقائياً
  - Supabase Realtime: `channel('conversations:CONV_ID')` للإرسال الفوري
- [ ] **[FR-ST4.1]** بناء `POST /api/messages/{id}/attachments`:
  - رفع الملف لـ Storage → `INSERT INTO message_attachments (message_id, file_name, file_url, mime_type)`
  - **CHECK DB يمنع الملفات التنفيذية** — معالجة خطأ الـ DB برسالة واضحة للمستخدم
- [ ] **[FR-ST4.3]** بناء `GET /api/conversations`:
  - قراءة محادثات المستخدم بسياسة `tenant_participants_read_conversations`
  - مُرتَّبة بـ `last_message_at DESC`

### 📢 قنوات المقررات (Course Channels)

- [ ] **[تلقائي — Trigger]** التحقق من عمل `trg_auto_create_course_channel`:
  - عند `INSERT INTO sections` → ينشئ `channels` بـ `channel_type='course'` و`name = "CourseNameـ SectionCode (Semester)"`
- [ ] **[تلقائي — Trigger]** التحقق من عمل `trg_auto_channel_membership`:
  - عند `INSERT INTO enrollments WHERE status='enrolled'` → `INSERT INTO channel_members (..., is_admin=FALSE)`
  - عند `UPDATE enrollments SET status='dropped/dismissed/withdrawn'` → `DELETE FROM channel_members`
- [ ] **[FR-ST4.3]** بناء `POST /api/messages` (Channel):
  - `INSERT INTO messages (message_type='channel', channel_id, sender_id, body)`
  - التحقق: `channel_members` يحتوي على `profile_id=current_user` للقناة
  - التحقق: `channels.is_readonly=FALSE` — إذا TRUE يُرفض INSERT
- [ ] **[FR-FM4.1]** بناء `PATCH /api/messages/{id}/pin`:
  - `UPDATE messages SET is_pinned=TRUE WHERE id=X`
  - سياسة `channel_admin_manage_messages` تضمن أن المحاضر فقط يُثبِّت
- [ ] **[FR-FM4.1]** بناء `PATCH /api/messages/{id}` (Soft Delete):
  - `UPDATE messages SET is_deleted=TRUE, deleted_at=NOW(), deleted_by=current_profile_id()`
  - المحاضر يحذف أي رسالة في قناته / الطالب يحذف رسائله فقط
- [ ] **[FR-FM4.1]** بناء `PATCH /api/channels/{id}/readonly`:
  - `UPDATE channels SET is_readonly=TRUE/FALSE WHERE id=X`
  - سياسة `admin_manage_channels` — Academic Management + Tenant Admin فقط

### ⏰ ساعات المكتب وDND (Faculty)

- [ ] **[FR-FM4.2]** بناء `PATCH /api/faculty/office-hours`:
  - `UPDATE faculty_profiles SET office_hours=[{day:'sunday', start:'10:00', end:'12:00'}, ...]`
  - `office_hours` حقل JSONB في `faculty_profiles`
- [ ] **[FR-FM4.3]** بناء `PATCH /api/profile/dnd`:
  - `UPDATE profiles SET is_dnd_active=TRUE, dnd_message='سأعود خلال ساعتين'`
  - الواجهة: تُظهر نقطة حمراء على avatar المحاضر + رسالة DND عند بدء المراسلة

### 🎨 الواجهة الأمامية

- [ ] **[FR-ST4.1]** صفحة الرسائل: تخطيط Split-Screen — قائمة المحادثات (يسار) + نافذة الدردشة (يمين)
  - Supabase Realtime subscription على `messages` للتحديث الفوري
- [ ] **[FR-ST4.3]** واجهة قناة المقرر: عرض الرسائل مع نقاط التمييز (📌 مثبَّت / 🗑️ محذوف)
- [ ] **[FR-FM4.3]** مكوّن DND Badge: نقطة حمراء `🔴` على صورة المحاضر مع tooltip يُظهر `dnd_message`
- [ ] **[FR-ST4.2]** منع رفع الملفات التنفيذية: فلترة بالـ Frontend أولاً + معالجة خطأ CHECK constraint من DB

---

## 🧪 خطة الاختبار

- [ ] اختبار Trigger: إنشاء `section` جديدة → التحقق من `channels` ينشأ تلقائياً
- [ ] اختبار Trigger: تسجيل طالب (`status='enrolled'`) → التحقق من `channel_members` يُضاف
- [ ] اختبار Trigger: إسقاط الطالب (`status='dropped'`) → التحقق من `channel_members` يُحذف
- [ ] اختبار CHECK: محاولة رفع `.exe` → التحقق من رفض DB بـ CHECK constraint
- [ ] اختبار RLS: الطالب لا يقرأ محادثات شخص آخر
- [ ] اختبار Realtime: إرسال رسالة → تحديث فوري على الشاشة الأخرى

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
