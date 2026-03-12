# 🤖 النظام الفرعي 6: المساعد الذكي UniBot AI — v2.0
### Smart Virtual Assistant — RAG Pipeline
**محدَّث بمراجع قاعدة البيانات الفعلية**

---

## 📌 نظرة عامة

| الحقل | التفاصيل |
|---|---|
| **هدف النظام** | موظف رقمي على مدار الساعة يُجيب من قاعدة معرفة معتمدة فقط — لا hallucination |
| **الأدوار المرتبطة** | `student` (أساسي) + `tenant_admin` (إدارة قاعدة المعرفة) + `faculty` (الموافقة على المحتوى) |
| **الأولوية** | 🟠 عالية — الميزة التنافسية الأبرز |
| **المتطلب الرئيسي** | SR-6 / FR-TA5 / FR-FM1.3 / FR-ST5 / NFR-AI1 / NFR-SEC3 |
| **ملف SQL** | `part2_lms_messaging_ai_ticketing.sql` — القسم 10 |

---

## 🗄️ خريطة مخطط قاعدة البيانات

| الجدول | الغرض | حقول مهمة |
|---|---|---|
| `ai_knowledge_documents` | وثائق قاعدة المعرفة | `doc_type ENUM`, `is_active BOOLEAN`, `section_id=NULL` للوائح / `section_id≠NULL` للمواد |
| `ai_document_chunks` | قطع النصوص + Embeddings | `embedding vector(1536)` — OpenAI dim / `page_number INT` / `timestamp_sec INT` / `chunk_index` |
| `chatbot_conversations` | جلسات المحادثة مع UniBot | `user_id`, `is_active BOOLEAN`, `session_id VARCHAR(100)` |
| `chatbot_messages` | رسائل المحادثة | `role VARCHAR (user/assistant/system)` / `source_chunk_ids UUID[]` — مصادر الاقتباس |
| `student_recommendations` | التوصيات الأكاديمية | `sent_by=NULL` = نظام تلقائي / `sent_by≠NULL` = مُرسَلة من محاضر |
| `ai_token_usage` | تتبع استهلاك Tokens | `model VARCHAR`, `prompt_tokens`, `completion_tokens`, `cost_usd` |

### ENUMs ذات الصلة

```sql
CREATE TYPE ai_document_type AS ENUM ('regulation','course_material','handbook','policy','other');
```

### الـ Index الحرج (HNSW للبحث الدلالي)

```sql
-- HNSW: أسرع من IVFFlat في الـ ANN search (Approximate Nearest Neighbor)
CREATE INDEX idx_chunks_embedding ON ai_document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
-- m=16: عدد الروابط لكل عقدة / ef_construction=64: دقة بناء الـ Index
-- البحث يستخدم: ORDER BY embedding <=> query_vector LIMIT 5
```

### pg_cron ذات الصلة

```sql
-- أرشفة جلسات UniBot القديمة (أكثر من 90 يوم) — كل أحد 03:00
SELECT cron.schedule('archive-old-chatbot-sessions', '0 3 * * 0', $$
    UPDATE chatbot_conversations
    SET is_active = FALSE, ended_at = NOW()
    WHERE is_active = TRUE AND created_at < NOW() - INTERVAL '90 days';
$$);
```

---

## 🔐 سياسات RLS المُطبَّقة

| السياسة | الجدول | النطاق |
|---|---|---|
| `tenant_admin_manage_ai_docs` | `ai_knowledge_documents` | Tenant Admin + Faculty + Super Admin: إدارة وثائق جامعتهم |
| `tenant_read_active_ai_docs` | `ai_knowledge_documents` | جميع مستخدمي الجامعة: قراءة الوثائق النشطة (`is_active=TRUE`) |
| `service_manage_chunks` | `ai_document_chunks` | Super Admin فقط (يُمثِّل العمليات الخلفية / Edge Functions بـ Service Role) |
| `tenant_read_chunks` | `ai_document_chunks` | جميع مستخدمي الجامعة: قراءة الـ chunks من وثائق نشطة |
| `user_manage_own_chatbot_conv` | `chatbot_conversations` | كل مستخدم: جلساته فقط (`user_id = current_profile_id()`) |
| `user_manage_own_chatbot_msgs` | `chatbot_messages` | كل مستخدم: رسائل جلساته فقط |
| `student_read_own_recommendations` | `student_recommendations` | الطالب: توصياته فقط |
| `faculty_admin_manage_recommendations` | `student_recommendations` | Faculty + Admin: إنشاء/قراءة جميع التوصيات |
| `super_admin_read_token_usage` | `ai_token_usage` | Super Admin: كل الاستهلاك |
| `tenant_admin_read_own_token_usage` | `ai_token_usage` | Tenant Admin: استهلاك جامعته فقط |

> **NFR-SEC3:** الـ embeddings خاصة بكل مستأجر — `tenant_id` في `ai_document_chunks` → لا تُشارَك بيانات الجامعة مع جامعة أخرى ولا تُستخدَم لتدريب نماذج عامة.

---

## ✅ قائمة المهام التفصيلية للمطورين

### 🔧 RAG Pipeline — Document Ingestion (Edge Function)

- [ ] **[FR-TA5.1 / FR-FM1.3]** بناء Edge Function `ingestion-pipeline`:
  1. استقبال `document_id` من `ai_knowledge_documents`
  2. تنزيل الملف من Supabase Storage عبر `file_url`
  3. استخراج النص (PDF → `pdf-parse` / فيديو → transcript API)
  4. تقسيم النص: chunks من 500-1000 token مع overlap 100 token
  5. لكل chunk: استدعاء `OpenAI Embeddings API` (model: `text-embedding-3-small`, dim: 1536)
  6. `INSERT INTO ai_document_chunks (tenant_id, document_id, chunk_index, content, page_number, timestamp_sec, embedding, token_count)`
     - سياسة RLS: Edge Function تستخدم **Service Role Key** للتخطي
  7. `UPDATE ai_knowledge_documents SET total_chunks = COUNT(*) WHERE id = document_id`

- [ ] **[FR-TA5.2]** بناء `DELETE /api/knowledge/{id}`:
  - `UPDATE ai_knowledge_documents SET is_active=FALSE`
  - حذف الـ chunks: `DELETE FROM ai_document_chunks WHERE document_id=X` (CASCADE)
  - UniBot يتوقف فوراً عن الإجابة منها (سياسة `tenant_read_chunks` تشترط `is_active=TRUE`)

- [ ] **[FR-FM1.3]** ربط AI-Approved Toggle بـ Pipeline:
  - عند `UPDATE course_materials SET is_ai_approved=TRUE`:
    - `INSERT INTO ai_knowledge_documents (tenant_id, section_id, material_id, doc_type='course_material', ...)`
    - استدعاء Ingestion Pipeline
  - عند `is_ai_approved=FALSE`:
    - `UPDATE ai_knowledge_documents SET is_active=FALSE WHERE material_id=X`

### 🧠 RAG Query Pipeline — Chat API (Edge Function)

- [ ] **[FR-ST5.1]** بناء Edge Function `rag-chat`:
  ```
  Input: { user_id, tenant_id, conversation_id, user_message }
  
  1. INSERT INTO chatbot_messages (role='user', content=user_message)
  2. Embed user_message → OpenAI Embeddings API → query_vector(1536)
  3. SELECT id, content, page_number, timestamp_sec
     FROM ai_document_chunks
     WHERE tenant_id = tenant_id AND document_id IN (
         SELECT id FROM ai_knowledge_documents WHERE is_active=TRUE AND tenant_id=tenant_id
     )
     ORDER BY embedding <=> query_vector  -- HNSW Cosine Similarity
     LIMIT 5
  4. بناء System Prompt:
     - "أنت UniBot. أجب فقط من السياق التالي. إذا لم تجد الإجابة، اعتذر بوضوح."
     - إضافة الـ 5 chunks كـ context
  5. LLM API call (model من env vars)
  6. INSERT INTO chatbot_messages (role='assistant', content=response, source_chunk_ids=[chunk_ids])
  7. INSERT INTO ai_token_usage (tenant_id, user_id, model, prompt_tokens, completion_tokens, cost_usd)
  8. Return: { response, source_chunks[{id, page_number, timestamp_sec}] }
  ```

- [ ] **[NFR-AI1]** تطبيق **Anti-Hallucination System Prompt** الإلزامي:
  ```
  "إذا لم يكن السياق المُوفَّر كافياً للإجابة، قل بالضبط:
   'لم أجد معلومات كافية حول هذا الموضوع في قاعدة معرفتي. يُرجى التواصل مع المختص المعني.'
   لا تُجب بمعلومات من خارج السياق."
  ```

- [ ] **[FR-ST5.1]** بناء `POST /api/chatbot/conversations`:
  - `INSERT INTO chatbot_conversations (tenant_id, user_id, is_active=TRUE)`
- [ ] **[FR-ST5.3]** بناء منطق التذكيرات الشخصية عبر UniBot:
  - استعلام: `SELECT a.title, a.due_date FROM assignments a JOIN enrollments e ON e.section_id = a.section_id WHERE e.student_id = user_id AND a.due_date > NOW()`
  - تضمين هذه البيانات في System Prompt لـ UniBot لإجابات مُخصَّصة

### 🔑 واجهة إدارة قاعدة المعرفة (Tenant Admin)

- [ ] **[FR-TA5.1]** بناء `GET /api/knowledge`:
  - `SELECT * FROM ai_knowledge_documents WHERE tenant_id=X ORDER BY created_at DESC`
  - يُعيد: `title, doc_type, total_chunks, is_active, created_at`
- [ ] **[FR-SA4.1]** بناء واجهة تحديث LLM Config في متغيرات البيئة (Vercel env panel او DB config table)
- [ ] **[FR-SA4.2]** بناء `GET /api/admin/token-usage`:
  - من `ai_token_usage` مجمَّعة بـ `tenant_id + model`
  - يُعيد: التكلفة الإجمالية لكل جامعة

### 🎨 الواجهة الأمامية

- [ ] **[SR-6]** صفحة UniBot — تخطيط Split-Screen:
  - **يسار (70%):** PDF Viewer (أو Video Player) — يُشغِّل `ai_document_chunks.page_number/timestamp_sec`
  - **يمين (30%):** Chat Interface
- [ ] **[FR-ST5.1]** مكوّن **Citation Chip**:
  - بيانات من `chatbot_messages.source_chunk_ids` → استعلام `ai_document_chunks` بالـ IDs
  - كل Chip: `📄 ص. ${page_number}` أو `🎬 ${timestamp_sec}s`
  - عند النقر: تمرير عارض PDF للصفحة أو تعيين `currentTime` للفيديو
- [ ] **[SR-6]** مكوّن **Streaming Response**: عرض رد UniBot كلمةً بكلمة عبر `ReadableStream`
- [ ] **[NFR-AI1]** مكوّن **No-Answer Card**: بطاقة رمادية مع رسالة الاعتذار الإلزامية
- [ ] **[FR-TA5.1]** صفحة **Knowledge Base Manager**: قائمة الوثائق مع Badge الحالة + Drag & Drop Upload

---

## 🧪 خطة الاختبار

- [ ] اختبار وحدة: HNSW search — سؤال عن مفهوم في مادة → التحقق من استرجاع الـ Top-5 chunks الأقرب
- [ ] اختبار Anti-Hallucination: سؤال خارج قاعدة المعرفة → التحقق من رسالة الاعتذار الإلزامية
- [ ] اختبار Citation: رد UniBot يحمل `source_chunk_ids` → ظهور Citation Chips في الواجهة
- [ ] اختبار RLS: طالب من جامعة A يستعلم → يحصل على chunks من `tenant_id=A` فقط
- [ ] اختبار pg_cron: بعد 90 يوم → `chatbot_conversations.is_active=FALSE`

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
