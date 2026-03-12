# Sprint 22: Gemini AI Migration & Performance
## [NFR-PER2, NFR-AI1]

### الوصف
ترحيل كامل من OpenAI API إلى Google Gemini API لجميع وظائف الذكاء الاصطناعي (Chat + Embeddings).

### التغييرات

#### 1. Supabase Migration
- `supabase/migrations/20260308002000_gemini_embedding_768.sql`
  - تغيير `ai_document_chunks.embedding` من `vector(1536)` إلى `vector(768)`
  - إعادة إنشاء HNSW index بـ `m=16, ef_construction=64`
  - إعادة إنشاء `match_chunks()` بتوقيع `vector(768)`

#### 2. Ingest Route Migration
- **ملف:** `src/app/api/ai/ingest/route.ts`
- **قبل:** OpenAI `text-embedding-3-small` (1536 dims)
- **بعد:** Google `text-embedding-004` (768 dims)
- **SDK:** `@google/generative-ai` → `GoogleGenerativeAI`
- **Method:** `genAI.getGenerativeModel({ model: "text-embedding-004" }).embedContent(text)`

#### 3. Chat Route Migration
- **ملف:** `src/app/api/ai/chat/route.ts`
- **قبل:** OpenAI `gpt-4o-mini` + `text-embedding-3-small`
- **بعد:** Google `gemini-2.5-flash` + `text-embedding-004`
- **SDK:** `GoogleGenerativeAI` مع `systemInstruction` للـ anti-hallucination prompt
- **Method:** `chatModel.generateContent()` مع `generationConfig`
- **Token Tracking:** `usageMetadata.promptTokenCount` + `candidatesTokenCount`

#### 4. Environment Variable
```
GEMINI_API_KEY=AIzaSyBFMk0w4p2IrG02DKj52oByw1JaOMPo3RU
```

### الحزم المُضافة
- `@google/generative-ai` — Google Generative AI SDK

### الحزم المُزالة (قابلة للإزالة)
- `openai` — لم يعد مُستخدماً (يمكن إزالتها بـ `npm uninstall openai`)

### Model Mapping
| الوظيفة | OpenAI (قبل) | Gemini (بعد) |
|---------|-------------|-------------|
| Chat | gpt-4o-mini | gemini-2.5-flash |
| Embeddings | text-embedding-3-small (1536d) | text-embedding-004 (768d) |

### Anti-Hallucination (NFR-AI1)
- نفس الـ System Prompt محفوظ بالكامل
- `systemInstruction` في Gemini يعادل `system` role في OpenAI
- temperature=0.3 + maxOutputTokens=1000
