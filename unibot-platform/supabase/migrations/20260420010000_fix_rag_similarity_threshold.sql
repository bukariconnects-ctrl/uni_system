-- ================================================================
-- Fix RAG: Add similarity threshold + course materials indexing
-- ================================================================

-- 1. Update match_chunks to filter by minimum similarity score
--    Prevents irrelevant policy chunks from appearing for personal questions
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding  extensions.vector(768),
  match_tenant_id  uuid,
  match_count      int     DEFAULT 5,
  min_similarity   float   DEFAULT 0.45   -- only return genuinely relevant chunks
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
    AND 1 - (adc.embedding <=> query_embedding) >= min_similarity
  ORDER BY adc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
