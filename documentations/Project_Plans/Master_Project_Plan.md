# 🎓 خطة مشروع UniBot الشاملة — النسخة المحدّثة
### Master Project Plan v2.0 — مدعومة بمخطط قاعدة البيانات الفعلي
**التاريخ:** مارس 2026 | **التقنية:** Next.js + Supabase | **النموذج:** SaaS متعدد المستأجرين

---

> **📌 ملاحظة الإصدار v2.0:** هذه النسخة محدَّثة بعد الانتهاء من تصميم قاعدة البيانات الكاملة. كل مهمة في الخطط الفرعية تستشهد بالجداول والمُشغِّلات (Triggers) وسياسات RLS الفعلية الموجودة في ملفي SQL.

---

## 📋 نظرة عامة على المشروع

| الحقل | التفاصيل |
|---|---|
| **اسم المشروع** | UniBot — المنصة الأكاديمية الذكية |
| **النموذج المعماري** | SaaS متعدد المستأجرين (Multi-Tenant via RLS) |
| **Stack التقني** | Next.js 14+ (App Router) + Supabase (DB + Auth + Storage + Realtime) |
| **الذكاء الاصطناعي** | pgvector (HNSW) + LLM API + Edge Functions |
| **إجمالي الجداول** | **52 جدولاً** (26 في Part1 + 26 في Part2) |
| **ENUMs المُعرَّفة** | **26 ENUM** |
| **سياسات RLS** | **~110 سياسة** (50 في Part1 + 60 في Part2) |
| **وظائف pg_cron** | **4 وظائف** مجدولة |
| **الأنظمة الفرعية** | 8 أنظمة فرعية |
| **الأدوار (Actors)** | 5 أدوار رئيسية (ENUM: `user_role`) |

---

## 🗺️ خريطة الطريق الشاملة (Roadmap)

```
[المرحلة 1: التأسيس] → [المرحلة 2: قاعدة البيانات ✅] → [المرحلة 3: الخلفية] → [المرحلة 4: الواجهة] → [المرحلة 5: الذكاء الاصطناعي]
     أسبوعان              ✅ مكتملة                        4 أسابيع               6 أسابيع                3 أسابيع
```

---

## ✅ المرحلة الثانية: تصميم قاعدة البيانات — **[مكتملة]**

> 🎉 **تم الانتهاء من هذه المرحلة بالكامل.** ملفا SQL (`part1_core_system.sql` و `part2_lms_messaging_ai_ticketing.sql`) تم إنشاؤهما وتطبيقهما على Supabase.

### ملخص ما تم إنجازه:

| الفئة | التفاصيل |
|---|---|
| **الملف 1** | `part1_core_system.sql` — 26 جدولاً، 26 ENUM، ~50 سياسة RLS |
| **الملف 2** | `part2_lms_messaging_ai_ticketing.sql` — 26 جدولاً، ~60 سياسة RLS، 4 pg_cron jobs |
| **Extensions** | `uuid-ossp`, `pgvector`, `pg_cron` — مُفعَّلة |
| **الامتثال للمتطلبات** | كل جدول يستشهد بكودات FR (مثل FR-SA1.1, FR-FM1.3) |

---

## 🏗️ ملخص معمارية قاعدة البيانات

### استراتيجية العزل متعدد المستأجرين (Multi-Tenancy via RLS)

> **الخيار المُطبَّق:** كل جدول يحتوي على `tenant_id` + سياسات RLS تستخدم دوال مساعدة لاستخراج الـ `tenant_id` من JWT.

**الدوال المساعدة المُعرَّفة في SQL:**
```sql
-- استخراج tenant_id من JWT
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID ...
-- استخراج دور المستخدم من JWT  
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT ...
-- استخراج profile_id من Supabase Auth
CREATE OR REPLACE FUNCTION current_profile_id() RETURNS UUID ...
```

**نمط RLS للعزل:**
- `super_admin`: وصول كامل لكل البيانات عبر جميع الجداول
- `tenant_admin`: وصول لبيانات `tenant_id = current_tenant_id()` فقط
- `academic_management`: قراءة بيانات المستأجر + كتابة محدودة النطاق
- `faculty`: قراءة/كتابة على شعبه (`sections`) فقط
- `student`: قراءة/كتابة على بياناته الشخصية فقط

### pgvector للذكاء الاصطناعي (RAG Pipeline)

```sql
-- HNSW Index للبحث التقريبي السريع (أسرع من IVFFlat)
CREATE INDEX idx_chunks_embedding ON ai_document_chunks
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

- **الجدول:** `ai_document_chunks` — يخزن chunks النصوص + embedding من OpenAI (1536 بُعداً)
- **البحث:** Cosine Similarity عبر HNSW index
- **الأمان:** `source_chunk_ids UUID[]` في `chatbot_messages` لتتبع مصادر كل إجابة (Citations)

### pg_cron للعمليات المجدولة

| الوظيفة | الجدولة | الوصف |
|---|---|---|
| `refresh-student-risk-levels` | يومياً 02:00 | تحديث `student_profiles.risk_level` من `student_risk_scores` |
| `send-risk-alerts` | يومياً 02:30 | إرسال تنبيهات للمحاضرين عن طلاب الخطر |
| `generate-renewal-invoices` | أول كل شهر 08:00 | توليد فواتير التجديد للاشتراكات المنتهية |
| `archive-old-chatbot-sessions` | أسبوعياً الأحد 03:00 | أرشفة محادثات UniBot القديمة (+90 يوم) |

---

## 🚀 المرحلة الأولى: إعداد البيئة والتأسيس

- [ ] تهيئة مشروع Next.js 14+ بـ App Router + TypeScript strict
- [ ] إعداد Supabase Project (Production + Staging)
- [ ] تطبيق ملفَّي SQL على قاعدة البيانات (`part1` ثم `part2`)
- [ ] إعداد Supabase Auth مع JWT Custom Claims (لحقل `tenant_id` و`role`)
- [ ] إعداد Supabase Realtime للـ `messages` و`notifications`
- [ ] إعداد Supabase Storage للمحتوى التعليمي (`course_materials.file_url`)
- [ ] إعداد متغيرات البيئة + CI/CD Pipeline + Vercel

---

## ⚙️ المرحلة الثالثة: تطوير الخلفية (Backend APIs)

### بنية المشروع المقترحة لـ Next.js

```
app/
├── api/
│   ├── tenants/           → POST/GET/PATCH (جدول: tenants)
│   ├── academic/          → colleges, departments, majors, courses
│   ├── semesters/         → semesters, sections, schedules
│   ├── lms/               → course_materials, assignments, submissions
│   ├── attendance/        → attendance_sessions, attendance_records
│   ├── gradebook/         → gradebook_entries
│   ├── messaging/         → conversations, channels, messages
│   ├── circulars/         → circulars, notifications
│   ├── ai/                → ai_knowledge_documents, chatbot_conversations
│   ├── analytics/         → student_risk_scores, course_risk_flags
│   └── tickets/           → tickets, ticket_messages, approval_workflows
└── (routes)/              → Pages
```

### المهام الحرجة للـ Backend

- [ ] إعداد Supabase Client للطرف الخادم (`createServerClient`) مع قراءة JWT Claims
- [ ] middleware لحماية المسارات حسب `user_role` ENUM وتمرير `tenant_id` للـ JWT
- [ ] تطبيق Zod Schemas لكل الـ 26 ENUM والجداول الرئيسية
- [ ] بناء Edge Function للـ RAG Pipeline (Embedding → pgvector Search → LLM)
- [ ] بناء Edge Function لحساب `student_risk_scores` (يُستدعى يومياً من pg_cron)

---

## 🎨 المرحلة الرابعة: تطوير الواجهة الأمامية

> 📖 **راجع القسم التالي لنظام التصميم الكامل.**

### المكونات الحرجة للواجهة

- [ ] **AuthProvider** مع استخراج `tenant_id` و`role` من JWT لتحديد الـ Layout الصحيح
- [ ] **TenantTheme** — تطبيق `tenants.primary_color` و`tenants.logo_url` ديناميكياً
- [ ] **RealTimeListener** — اشتراك Supabase لجداول `messages` و`notifications`
- [ ] **RiskZoneWidget** — يقرأ من `student_risk_scores` بسياسة `faculty_admin_read_risk_scores`
- [ ] **CitationChip** — يشير لـ `ai_document_chunks.page_number` أو `timestamp_sec`

---

## 🤖 المرحلة الخامسة: تكامل الذكاء الاصطناعي

### RAG Pipeline التفصيلي

```
[رفع الملف course_materials + is_ai_approved=TRUE]
    ↓
[Edge Function: Document Ingestion]
    → استخراج النص (PDF parser)
    → Chunking (500-1000 token chunks)
    → OpenAI Embeddings API (vector(1536))
    → INSERT into ai_document_chunks (embedding, page_number, timestamp_sec)
    → UPDATE ai_knowledge_documents SET total_chunks = N
    ↓
[عند سؤال الطالب في chatbot_conversations]
    ↓
[Edge Function: RAG Query]
    → Embed السؤال
    → SELECT ... FROM ai_document_chunks 
      ORDER BY embedding <=> query_vector LIMIT 5  (HNSW search)
    → بناء Prompt مع context
    → LLM API call
    → INSERT into chatbot_messages (role='assistant', source_chunk_ids=[...])
    ↓
[الواجهة: عرض الإجابة + Citation Chips]
    → كل Chip يشير لـ chunk.page_number أو chunk.timestamp_sec
```

### pg_cron Risk Score Job

- **الـ Cron Job** يُشغِّل `send_risk_alerts()` يومياً 02:30
- الدالة تقرأ من `student_risk_scores` حيث `risk_level IN ('high','critical')` و`alert_sent=FALSE`
- تُدرج في `notifications` ثم تُعيِّن `alert_sent=TRUE`

---

## 🎨 نظام التصميم والمرئيات (UI/UX Design System)

> **مصدر:** `theme.md`

### لوحة الألوان

| الاستخدام | اللون | القيمة (مع القيمة الافتراضية في DB) |
|---|---|---|
| **Header والعلامة التجارية** | Academic Navy | `#2A4365` (قابل للتخصيص: `tenants.primary_color` — افتراضي `#1E40AF`) |
| **الأزرار الأساسية** | Action Blue | `#3182CE` |
| **عناصر UniBot AI** | AI Gradient | `#EBF8FF` → `#E9D8FD` |
| **خلفية التطبيق** | Cool Gray | `#F7FAFC` |
| **بطاقات** | Pure White | `#FFFFFF` |
| **نصوص رئيسية** | Dark Slate | `#1A202C` |
| **نصوص ثانوية** | Medium Gray | `#718096` |
| **خطر عالٍ (risk_level='high')** | Red | `#E53E3E` |
| **تحذير (risk_level='medium')** | Orange | `#DD6B20` |
| **آمن (risk_level='low')** | Green | `#38A169` |

### مكونات UI الحرجة

| المكوّن | الجدول المرتبط | الوصف |
|---|---|---|
| **AI-Approved Toggle** | `course_materials.is_ai_approved` | ✨ مفتاح تبديل بحالة زرقاء نشطة |
| **Risk Zone Badge** | `student_risk_scores.risk_level` | Pill Tag بألوان ENUM (low/medium/high/critical) |
| **Citation Chip** | `ai_document_chunks.page_number/timestamp_sec` | شريحة قابلة للنقر تنقل لمصدر الاقتباس |
| **My Progress Path** | `student_profiles.earned_credit_hours/total_credit_hours` | شريط تقدم نحو التخرج |
| **DND Badge** | `profiles.is_dnd_active` | نقطة حمراء على صورة المحاضر |
| **Tenant Banner** | `tenants.logo_url/primary_color` | شعار الجامعة وألوانها الديناميكية |

---

## 📦 قائمة التحقق الرئيسية

### خطط الأنظمة الفرعية (`/Subsystems_Plans/`)
- [ ] [1. إدارة المنصة والمستأجرين](./Subsystems_Plans/1_Platform_Management.md) — `tenants, subscriptions, invoices, audit_logs`
- [ ] [2. الشؤون الأكاديمية والهيكل](./Subsystems_Plans/2_Academic_Affairs.md) — `colleges, departments, majors, courses, semesters, sections, schedules`
- [ ] [3. LMS وإدارة الحضور](./Subsystems_Plans/3_LMS_Attendance.md) — `course_materials, assignments, submissions, gradebook_entries, attendance_*`
- [ ] [4. المراسلات والتفاعل](./Subsystems_Plans/4_Messaging.md) — `conversations, channels, messages, message_attachments`
- [ ] [5. التعاميم والتنبيهات الذكية](./Subsystems_Plans/5_Circulars_Alerts.md) — `circulars, notifications`
- [ ] [6. المساعد الذكي UniBot](./Subsystems_Plans/6_UniBot_AI.md) — `ai_knowledge_documents, ai_document_chunks, chatbot_*`
- [ ] [7. التحليلات والتنبؤ](./Subsystems_Plans/7_Analytics.md) — `student_risk_scores, course_risk_flags, student_recommendations`
- [ ] [8. نظام التذاكر الأكاديمية](./Subsystems_Plans/8_Ticketing.md) — `tickets, ticket_messages, ticket_attachments, approval_workflows`

### خطط الأدوار (`/Actors_Plans/`)
- [ ] [1. المشرف العام (Super Admin)](./Actors_Plans/1_Super_Admin.md)
- [ ] [2. مدير الجامعة (Tenant Admin)](./Actors_Plans/2_Tenant_Admin.md)
- [ ] [3. الإدارة الأكاديمية](./Actors_Plans/3_Academic_Management.md)
- [ ] [4. أعضاء هيئة التدريس](./Actors_Plans/4_Faculty.md)
- [ ] [5. الطلاب](./Actors_Plans/5_Students.md)

---

## 🔒 المتطلبات غير الوظيفية — التحقق من التطبيق

| المعيار | المتطلب | الحالة في DB |
|---|---|---|
| **NFR-SEC1: عزل البيانات** | عزل تام بين الجامعات | ✅ RLS + `tenant_id` في كل جدول |
| **NFR-SEC2: التشفير** | TLS 1.2+ + Bcrypt | ✅ Supabase SSL + Auth module |
| **NFR-SEC3: خصوصية AI** | لا تدريب بالبيانات الخاصة | ✅ Private embeddings في `ai_document_chunks` |
| **NFR-SEC4: فحص الملفات** | منع الملفات التنفيذية | ✅ CHECK constraint في `message_attachments.mime_type` |
| **NFR-AI1: Anti-Hallucination** | رفض الإجابة خارج قاعدة المعرفة | 🔧 Prompt Engineering في Edge Function |
| **NFR-AI2: تحديث التنبؤات كل 24h** | Batch Processing يومي | ✅ pg_cron `refresh-student-risk-levels` عند 02:00 |
| **NFR-USE3: Dark Mode** | وضع داكن أصلي | 🔧 next-themes |

---

*📝 آخر تحديث: مارس 2026 | الإصدار: 2.0 — مدعوم بمخطط قاعدة البيانات الفعلي*
