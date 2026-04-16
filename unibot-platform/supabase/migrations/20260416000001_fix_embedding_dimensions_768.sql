-- =============================================================================
-- Migration: Fix embedding column dimensions for gemini-embedding-2-preview
-- =============================================================================
-- Problem:
--   The `embedding` column was created as vector(1536) (OpenAI-era default).
--   The migration 20260308002000_gemini_embedding_768.sql that was meant to
--   change it to vector(768) was never applied to the remote DB.
--   Now that we use gemini-embedding-2-preview with outputDimensionality=768
--   (MRL scaling), every INSERT fails:
--       "expected 1536 dimensions, not 768"
--
-- Fix:
--   1. Drop HNSW index (required before ALTER COLUMN TYPE)
--   2. Clear existing chunks   (they were built with vector(1536) / wrong model)
--   3. ALTER COLUMN TYPE from vector(1536) → vector(768)
--   4. Recreate HNSW index
--   5. Replace match_chunks function signature: vector(1536) → vector(768)
-- =============================================================================

-- Step 1: Drop HNSW index (can't ALTER TYPE while index exists)
DROP INDEX IF EXISTS public.idx_chunks_embedding;

-- Step 2: Clear all existing chunk rows
-- (They were embedded with a different model/dimension — must reindex anyway)
DELETE FROM public.ai_document_chunks;

-- Step 3: Change embedding column from vector(1536) → vector(768)
-- Safe to do with USING NULL because the table is now empty
ALTER TABLE public.ai_document_chunks
  ALTER COLUMN embedding TYPE extensions.vector(768)
  USING embedding::text::extensions.vector(768);

-- Step 4: Recreate HNSW index for vector(768) with cosine similarity
CREATE INDEX idx_chunks_embedding
  ON public.ai_document_chunks
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Step 5: Drop old match_chunks functions (both possible signatures)
DROP FUNCTION IF EXISTS public.match_chunks(extensions.vector(1536), uuid, integer);
DROP FUNCTION IF EXISTS public.match_chunks(extensions.vector(768),  uuid, integer);
DROP FUNCTION IF EXISTS public.match_chunks(extensions.vector,       uuid, integer);

-- Step 6: Create updated match_chunks function with vector(768)
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding  extensions.vector(768),
  match_tenant_id  uuid,
  match_count      int DEFAULT 5
)
RETURNS TABLE (
  id              uuid,
  content         text,
  page_number     int,
  timestamp_sec   int,
  similarity      float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    adc.id,
    adc.content,
    adc.page_number,
    adc.timestamp_sec,
    1 - (adc.embedding <=> query_embedding) AS similarity
  FROM public.ai_document_chunks adc
  WHERE adc.tenant_id = match_tenant_id
  ORDER BY adc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Reset total_chunks to 0 on all documents (chunks were cleared)
UPDATE public.ai_knowledge_documents SET total_chunks = 0;
