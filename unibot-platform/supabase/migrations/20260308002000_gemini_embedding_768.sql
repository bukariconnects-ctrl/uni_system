DROP INDEX IF EXISTS idx_chunks_embedding;

ALTER TABLE ai_document_chunks
  ALTER COLUMN embedding TYPE extensions.vector(768)
  USING embedding::extensions.vector(768);

CREATE INDEX idx_chunks_embedding ON ai_document_chunks
  USING hnsw (embedding extensions.vector_cosine_ops) WITH (m = 16, ef_construction = 64);

DROP FUNCTION IF EXISTS match_chunks(extensions.vector, uuid, int);

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding extensions.vector(768),
  match_tenant_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  page_number int,
  timestamp_sec int,
  similarity float
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
  FROM ai_document_chunks adc
  WHERE adc.tenant_id = match_tenant_id
  ORDER BY adc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
