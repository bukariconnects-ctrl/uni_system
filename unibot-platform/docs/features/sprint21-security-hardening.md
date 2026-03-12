# Sprint 21: Security & RLS Hardening
## [NFR-SEC2, NFR-SEC4]

### الوصف
تدقيق أمني شامل لجميع API Route Handlers وتطبيق التحقق من الملفات المرفوعة لمنع البرمجيات الخبيثة.

### المكونات

#### 1. API Route Security Audit
- **`/api/analytics/compute-risk`** — أُضيف:
  - تحقق من الجلسة (`supabase.auth.getUser()`)
  - فحص الدور (`academic_management`, `tenant_admin`, `super_admin`)
  - عزل المستأجر (tenant_id isolation) — لا يمكن للمستخدم الوصول لبيانات مستأجر آخر
- **`/api/ai/chat`** — ✅ آمن مسبقاً (يتحقق من user + profile)
- **`/api/ai/ingest`** — ✅ آمن مسبقاً (يستخدم requireRole)

#### 2. File Upload Security (NFR-SEC4: Malware Prevention)
- `src/lib/security/file-validator.ts` — وحدة تحقق مركزية:
  - **Blocked Extensions:** .exe, .bat, .cmd, .com, .msi, .scr, .ps1, .vbs, .sh, .dll, إلخ (26 امتداد)
  - **Blocked MIME Types:** application/x-msdownload, application/x-executable, إلخ (10 أنواع)
  - **Allowed MIME Prefixes:** image/*, video/*, audio/*, text/*, PDF, Office docs, ZIP
  - **Size Validation:** فحص حجم الملف مع حد أقصى قابل للتخصيص
  - **Functions:** `validateFile()`, `validateUploadMime()`

#### 3. Integration Points
- `src/app/faculty/materials/actions.ts` → `uploadMaterial()` — فحص قبل الرفع (50MB حد أقصى)
- `src/app/student/assignments/actions.ts` → `submitAssignment()` — فحص قبل الرفع (50MB حد أقصى)

### الملفات المُنشأة
- `src/lib/security/file-validator.ts`

### الملفات المُعدَّلة
- `src/app/api/analytics/compute-risk/route.ts` — إضافة auth + role + tenant isolation
- `src/app/faculty/materials/actions.ts` — إضافة validateFile()
- `src/app/student/assignments/actions.ts` — إضافة validateFile()

### نتائج التدقيق
| API Route | Auth | Role Check | Tenant Isolation |
|-----------|------|------------|------------------|
| `/api/ai/chat` | ✅ | ✅ (via profile) | ✅ (profile.tenant_id) |
| `/api/ai/ingest` | ✅ | ✅ (requireRole) | ✅ (doc.tenant_id) |
| `/api/analytics/compute-risk` | ✅ **Fixed** | ✅ **Fixed** | ✅ **Fixed** |
