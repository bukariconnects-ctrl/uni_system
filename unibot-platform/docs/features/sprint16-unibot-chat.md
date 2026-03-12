# Sprint 16: UniBot Chat & AI Interaction
## [FR-ST5.1, SR-6, NFR-AI1]

### الوصف
بناء واجهة المساعد الذكي UniBot للطلاب مع RAG Query Pipeline وCitation Chips وAnti-Hallucination System Prompt.

### المكونات

#### 1. RAG Chat API
- `src/app/api/ai/chat/route.ts`
- يستقبل رسالة المستخدم → يُحوّلها لـ embedding → يبحث في `ai_document_chunks` عبر pgvector (Cosine Similarity) → يبني System Prompt مع السياق → يستدعي OpenAI Chat API → يُسجّل الرد مع `source_chunk_ids`
- Anti-Hallucination: System Prompt يفرض الإجابة فقط من السياق المُوفَّر
- Personal Context: يُضيف التكاليف القادمة للطالب في System Prompt

#### 2. match_chunks Database Function
- `supabase/migrations/20260308001000_match_chunks_function.sql`
- دالة `SECURITY DEFINER` تبحث في chunks عبر HNSW Cosine Similarity
- تُرجع Top-5 chunks الأقرب دلالياً مع `page_number` و `timestamp_sec`

#### 3. Student UniBot Chat UI
- `src/app/student/unibot/actions.ts` — جلب المحادثات والرسائل
- `src/app/student/unibot/page.tsx` — Server Component
- `src/app/student/unibot/unibot-client.tsx` — واجهة Chat كاملة
  - قائمة محادثات في الشريط الجانبي
  - AI Gradient header (from-ai-light to-ai-lavender)
  - رسائل فقاعية مع تمييز User/Assistant
  - Citation Chips تعرض رقم الصفحة أو الثانية
  - عند النقر على Citation → يعرض محتوى المصدر
  - No-Answer Card بلون رمادي عند عدم وجود إجابة
  - أسئلة مقترحة للبدء السريع
  - Loading animation (bouncing dots)

#### 4. Sidebar Update
- `src/app/student/components/sidebar.tsx` — إضافة رابط UniBot مع أيقونة Sparkles
