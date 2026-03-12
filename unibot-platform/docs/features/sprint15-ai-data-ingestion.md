# Sprint 15: AI Data Ingestion — RAG Pipeline
## [FR-TA5.1, FR-FM1.3, FR-TA5.2]

### الوصف
بناء خط أنابيب استيعاب البيانات للذكاء الاصطناعي (RAG Pipeline) الذي يقوم بتقطيع الوثائق وتحويلها إلى embeddings باستخدام OpenAI API وتخزينها في `ai_document_chunks` عبر pgvector.

### المكونات

#### 1. API Route — Ingestion Pipeline
- `src/app/api/ai/ingest/route.ts`
- يستقبل `document_id` → يُنزّل الملف → يقطّعه (800 token مع overlap 100) → يُولّد embeddings عبر `text-embedding-3-small` (1536 dims) → يُدرج في `ai_document_chunks`
- يستخدم `createAdminClient()` (Service Role) لتجاوز RLS عند الإدراج
- يُسجّل استهلاك Tokens في `ai_token_usage`

#### 2. Tenant Admin Knowledge Base
- `src/app/tenant-admin/knowledge/actions.ts` — CRUD للوثائق + استدعاء Pipeline
- `src/app/tenant-admin/knowledge/page.tsx` + `knowledge-client.tsx` — واجهة رفع/إدارة الوثائق
- Drag & Drop upload zone مع عرض حالة الوثائق (نشط/معطّل)
- أزرار: إعادة فهرسة، تفعيل/تعطيل، حذف

#### 3. ربط AI-Approved Toggle بـ Pipeline
- `src/app/faculty/materials/actions.ts` — تعديل `toggleAiApproved()`
- عند `is_ai_approved=TRUE`: إنشاء/تفعيل `ai_knowledge_documents` + استدعاء Pipeline
- عند `is_ai_approved=FALSE`: تعطيل الوثيقة (`is_active=false`)

#### 4. Sidebar Update
- `src/app/tenant-admin/components/sidebar.tsx` — إضافة رابط "قاعدة المعرفة" مع أيقونة BrainCircuit

### التبعيات المُضافة
- `openai` — مكتبة OpenAI الرسمية

### الأنواع المُضافة في `database.ts`
- `AiDocumentType`, `AiKnowledgeDocument`, `AiDocumentChunk`
- `ChatbotConversation`, `ChatbotMessage`, `StudentRecommendation`
- `StudentRiskScore`, `CourseRiskFlag`
- `TicketStatus`, `TicketPriority`, `TicketCategory`, `ApprovalStatus`
- `Ticket`, `TicketMessage`, `TicketAttachment`, `ApprovalWorkflow`
