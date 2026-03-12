# 👨‍🎓 الدور 5: الطلاب (Students) — v2.0
### Students — RLS Scope & DB Access
**محدَّث بمراجع سياسات RLS الفعلية**

---

## 📌 ملخص الدور

| الحقل | التفاصيل |
|---|---|
| **الرمز في DB** | `user_role ENUM = 'student'` |
| **القيد في DB** | `profiles.tenant_id ≠ NULL` + سجل في `student_profiles` |
| **JWT Claims** | `{ role: 'student', tenant_id: 'UUID', profile_id: 'UUID' }` |
| **النطاق الحرج** | `enrollments WHERE student_id = current_profile_id()` فقط |
| **المرجع** | FR-ST1 → FR-ST6 |

---

## 🔐 سياسات RLS — نطاق وصول Student

### صلاحيات محدودة للغاية (الحماية القصوى)

| السياسة | الجدول | الشرط الحرج |
|---|---|---|
| `student_read_own_profile` | `profiles` | `id = current_profile_id()` (قراءة فقط) |
| `student_update_own_profile` | `profiles` | `id = current_profile_id()` (تعديل محدود) |
| `student_read_own_student_profile` | `student_profiles` | `profile_id = current_profile_id()` |
| `student_read_own_enrollments` | `enrollments` | `student_id = current_profile_id()` |
| `student_read_own_majors` | `student_majors` | `student_id = current_profile_id()` |
| `student_read_published_materials` | `course_materials` | `is_published=TRUE AND section_id IN (شعبي المسجَّلة و status='enrolled')` |
| `student_read_published_assignments` | `assignments` | `is_published=TRUE AND section_id IN (شعبي)` |
| `student_manage_own_submissions` | `submissions` | `student_id = current_profile_id()` — INSERT + UPDATE |
| `student_read_own_grades` | `gradebook_entries` | `student_id = current_profile_id() AND is_published=TRUE` |
| `student_read_own_attendance_sessions` | `attendance_sessions` | `section_id IN (شعبي المسجَّلة)` |
| `student_checkin_attendance` | `attendance_records` | **INSERT فقط** — `session_id IN (SELECT id FROM attendance_sessions WHERE is_open=TRUE)` |
| `student_read_own_attendance_records` | `attendance_records` | `student_id = current_profile_id()` |
| `student_read_own_attendance_summary` | `attendance_summaries` | `student_id = current_profile_id()` |
| `tenant_participants_read_conversations` | `conversations` | `participant_a=me OR participant_b=me` |
| `read_own_direct_messages` | `messages` | `conversation_id IN (محادثاتي)` |
| `read_channel_messages` | `messages` | `channel_id IN (قنواتي كعضو)` |
| `send_messages` | `messages` | `sender_id = current_profile_id()` |
| `user_read_own_notifications` | `notifications` | `recipient_id = current_profile_id()` |
| `user_mark_own_notification_read` | `notifications` | UPDATE: `recipient_id = current_profile_id()` |
| `user_manage_own_chatbot_conv` | `chatbot_conversations` | `user_id = current_profile_id()` |
| `user_manage_own_chatbot_msgs` | `chatbot_messages` | `conversation_id IN (جلساتي)` |
| `student_read_own_risk_score` | `student_risk_scores` | `student_id = current_profile_id()` |
| `student_read_own_recommendations` | `student_recommendations` | `student_id = current_profile_id()` |
| `user_create_own_ticket` | `tickets` | INSERT: `created_by = current_profile_id()` |
| `user_read_own_tickets` | `tickets` | `created_by = current_profile_id()` |
| `user_read_own_ticket_messages` | `ticket_messages` | `is_internal=FALSE` فقط (لا يرى الداخلية) |
| `user_read_own_ticket_attachments` | `ticket_attachments` | مرفقات تذاكره فقط |

### ما لا يستطيع الطالب فعله إطلاقاً (RLS تمنع)

| الجدول | لماذا مرفوض |
|---|---|
| `profiles` (للآخرين) | `student_read_own_profile` تقتصر على `id=current_profile_id()` |
| `gradebook_entries` (غير المنشور) | `student_read_own_grades` تشترط `is_published=TRUE` |
| `attendance_records` (للآخرين) | `student_id = current_profile_id()` صارمة |
| `attendance_sessions` (INSERT) | لا سياسة INSERT للطالب — فقط `student_checkin_attendance` |
| `ticket_messages` (`is_internal=TRUE`) | شرط `is_internal=FALSE` صريح في السياسة |
| `sections/schedules/courses` (كتابة) | لا سياسة كتابة للطالب |
| `circulars` (إنشاء) | Academic Management + Tenant Admin فقط |

---

## 🗄️ الجداول التي يتعامل معها مع العمليات المحددة

### المسار الأكاديمي

| الجدول | العملية | قيد مهم |
|---|---|---|
| `student_profiles` | SELECT | `earned_credit_hours, cumulative_gpa, risk_level, risk_score` |
| `student_majors` | SELECT | `is_primary BOOLEAN` |
| `enrollments` | SELECT | `enrollment_status ENUM`, `final_grade`, `letter_grade` |
| `attendance_summaries` | SELECT | `absence_percentage`, `is_dismissed` |
| `gradebook_entries` | SELECT (is_published=TRUE) | `total_grade` (Generated Column — محسوبة آلياً) |

### LMS — التعلم

| الجدول | العملية | قيد |
|---|---|---|
| `course_materials` | SELECT (is_published=TRUE) | `section_id IN (شعبي)` + RLS |
| `assignments` | SELECT (is_published=TRUE) | `due_date` صارم — بعد الإغلاق يُرفض |
| `submissions` | INSERT / UPDATE | `UNIQUE(assignment_id, student_id)` — تسليم واحد |

### الحضور

| الجدول | العملية | قيد حرج |
|---|---|---|
| `attendance_records` | **INSERT فقط** | `session_id IN (SELECT id WHERE is_open=TRUE)` |
| `attendance_sessions` | SELECT | `section_id IN (شعبي المسجَّلة)` |

### التواصل

| الجدول | العملية | قيد |
|---|---|---|
| `conversations` | INSERT + SELECT | `participant_a/b = current_profile_id()` |
| `messages` | INSERT + SELECT | `sender_id = current_profile_id()` |
| `message_attachments` | INSERT | CHECK: لا ملفات `.exe/.bat/.sh` |

### UniBot

| الجدول | العملية |
|---|---|
| `chatbot_conversations` | INSERT + SELECT (جلساته) |
| `chatbot_messages` | INSERT (role='user') + SELECT |

### التذاكر

| الجدول | العملية | Trigger |
|---|---|---|
| `tickets` | INSERT + SELECT (تذاكره) + UPDATE rating | `trg_generate_ticket_number` عند INSERT |
| `ticket_messages` | INSERT + SELECT (is_internal=FALSE فقط) | — |
| `ticket_attachments` | INSERT + SELECT (تذاكره) | — |

---

## ✅ قائمة مهام Student مع ربط DB

### 🏠 لوحة التحكم والمسار الأكاديمي

- [ ] **[FR-ST1.1]** جدول اليوم/الأسبوع:
  - `SELECT schedules JOIN sections ON ... WHERE section_id IN (enrollments WHERE student_id=me AND status='enrolled')`
- [ ] **[FR-ST1.2]** شريط التخرج (My Progress Path):
  - `SELECT earned_credit_hours, total_credit_hours FROM student_profiles WHERE profile_id=me`
  - شريط = `earned_credit_hours / majors.total_credits * 100%`
  - يُحدَّث تلقائياً من Trigger `calculate_student_gpa()` عند نشر الدرجات
- [ ] **[FR-ST1.3]** حاسبة المعدل الافتراضي:
  - Client-side calculation: محاكاة `calculate_student_gpa()` بدرجات افتراضية
  - بدون أي تغيير في DB — حساب في الـ Frontend فقط

### 📖 LMS — التعلم والتقديم

- [ ] **[FR-ST2.1]** تصفح المحتوى:
  - `SELECT * FROM course_materials WHERE is_published=TRUE AND section_id IN (شعبي) ORDER BY week_number`
  - سياسة `student_read_published_materials` تُطبَّق تلقائياً
- [ ] **[FR-ST2.2]** تسليم التكليف:
  - التحقق: `assignments.due_date > NOW()` أو `allow_late=TRUE`
  - `INSERT INTO submissions (student_id=me, assignment_id, file_url, status)`
  - إذا `NOW() > due_date AND allow_late=TRUE` → `status='late'`
  - UNIQUE `(assignment_id, student_id)` — منع التسليم المزدوج
- [ ] **[FR-ST2.3]** درجاتي:
  - `SELECT total_grade, coursework_grade, midterm_grade, final_grade FROM gradebook_entries WHERE student_id=me AND is_published=TRUE`
  - `total_grade` Generated Column — لا عملية حسابية في الـ Frontend

### ✅ الحضور

- [ ] **[FR-ST3.1 — QR]** مسح QR Code:
  - التحقق من صحة `qr_code` token + `qr_expires_at > NOW()`
  - `INSERT INTO attendance_records (student_id=me, session_id, status='present', method='qr_code', check_in_time=NOW())`
  - **سياسة `student_checkin_attendance`**: تشترط `session_id IN (WHERE is_open=TRUE)` — لا تسجيل على جلسات مغلقة
  - **يُشغِّل Trigger `trg_recalc_attendance_summary`** → `recalculate_attendance_summary()`
  - إذا تجاوز 70% → **Trigger `trg_notify_absence_warning`** → `notifications ('absence_warning'/'absence_dismissal')`
- [ ] **[FR-ST3.1 — Geo]** الحضور بالموقع:
  - حساب المسافة (Haversine) ← `attendance_sessions.geo_latitude/longitude/geo_radius_m`
  - نفس منطق INSERT + Triggers
- [ ] **[FR-ST3.2]** ملخص غيابي:
  - `SELECT absence_percentage, is_dismissed, total_sessions, attended_sessions FROM attendance_summaries WHERE student_id=me`

### 💬 التواصل

- [ ] **[FR-ST4.1]** مراسلة المحاضر:
  - `INSERT INTO conversations (participant_a=me, participant_b=FACULTY_ID)` ON CONFLICT DO NOTHING
  - `INSERT INTO messages (message_type='direct', conversation_id, sender_id=me, body)`
  - **CHECK**: `message_attachments.mime_type NOT IN (...)` — منع الملفات التنفيذية
- [ ] **[FR-ST4.3]** مشاركة في قناة المقرر:
  - `INSERT INTO messages (message_type='channel', channel_id, sender_id=me, body)`
  - يتطلب: `channel_members WHERE profile_id=me AND channel_id=X` + `channels.is_readonly=FALSE`

### 🤖 UniBot AI

- [ ] **[FR-ST5.1]** سؤال علمي:
  - `INSERT INTO chatbot_conversations (user_id=me, is_active=TRUE)`
  - `INSERT INTO chatbot_messages (role='user', content=QUESTION)`
  - Edge Function: Embed → pgvector Search (`embedding <=>`) → LLM → Response
  - `INSERT INTO chatbot_messages (role='assistant', content=RESPONSE, source_chunk_ids=[...])`
  - ← `source_chunk_ids` يُعيد `ai_document_chunks.page_number/timestamp_sec` للـ Citation Chips
- [ ] **[FR-ST5.3]** تذكيرات شخصية:
  - UniBot يستعلم `assignments WHERE section_id IN (شعبي) AND due_date > NOW()` ويضمّنها في System Prompt

### 🎫 التذاكر

- [ ] **[FR-ST6.1]** فتح تذكرة:
  - **AI Pre-resolution أولاً** → استدعاء UniBot بـ `description`
  - إذا وُجدت إجابة → `INSERT INTO tickets (..., ai_attempted=TRUE, ai_suggestion=RESPONSE, status='closed')`
  - إذا لم توجد → `INSERT INTO tickets (..., ai_attempted=TRUE, status='open')`
  - Trigger `trg_generate_ticket_number` → `ticket_number='TKT-XXXXXX'`
- [ ] **[FR-ST6.3]** تتبع تذكرتي:
  - `SELECT * FROM tickets WHERE created_by=me ORDER BY created_at DESC`
  - Supabase Realtime: `channel('ticket:TICKET_ID').on('UPDATE')` للتحديث الفوري
- [ ] **[FR-ST6.3]** تقييم الخدمة:
  - `UPDATE tickets SET rating=X WHERE id=T AND created_by=me AND status='resolved'`
  - CHECK: `rating BETWEEN 1 AND 5` في DB

---

## 📊 حالات DB الحرجة التي تؤثر على تجربة الطالب

| الحالة في DB | التأثير على الطالب في الواجهة |
|---|---|
| `attendance_summaries.is_dismissed = TRUE` | ظهور تحذير حرمان + تغيير `enrollments.status='dismissed'` |
| `gradebook_entries.is_published = TRUE` | ظهور الدرجات في "درجاتي" |
| `tickets.status = 'resolved'` | ظهور زر "تقييم الخدمة" |
| `assignments.due_date < NOW()` و `allow_late=FALSE` | رفض زر "تسليم" |
| `channels.is_readonly = TRUE` | `textarea` معطل في قناة المقرر |
| `profiles.is_dnd_active = TRUE` (للمحاضر) | ظهور `dnd_message` عند فتح محادثة |
| `student_profiles.risk_level = 'high'` | (لا يُظهَر للطالب في الواجهة — للإدارة والمحاضر فقط) |

---

## 🎨 واجهات Student مع الجداول المرتبطة

| الصفحة | يقرأ من | يكتب في |
|---|---|---|
| **لوحة التحكم** | `schedules (شعبي), student_profiles, notifications` | — |
| **My Progress Path** | `student_profiles.earned_credit_hours, majors.total_credits` | — |
| **محتوى المقرر** | `course_materials (is_published=TRUE)` | — |
| **التكاليف** | `assignments (is_published=TRUE)` | `submissions` |
| **درجاتي** | `gradebook_entries (is_published=TRUE)` | — |
| **حضوري** | `attendance_summaries, attendance_sessions` | `attendance_records (INSERT)` |
| **الرسائل** | `conversations, messages` | `conversations, messages` |
| **قناة المقرر** | `channels, messages` | `messages (إذا is_readonly=FALSE)` |
| **UniBot** | `chatbot_conversations, chatbot_messages, ai_document_chunks` | `chatbot_messages` |
| **حاسبة GPA** | `student_profiles, courses.credit_hours` | — (Frontend فقط) |
| **تذاكري** | `tickets (created_by=me)` | `tickets, ticket_messages, ticket_attachments` |
| **إشعاراتي** | `notifications (recipient_id=me)` | `notifications.is_read=TRUE` |

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
