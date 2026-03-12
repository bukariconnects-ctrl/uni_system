CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding extensions.vector(1536),
    match_tenant_id UUID,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    page_number INT,
    timestamp_sec INT,
    document_id UUID,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.content,
        c.page_number,
        c.timestamp_sec,
        c.document_id,
        1 - (c.embedding <=> query_embedding) AS similarity
    FROM ai_document_chunks c
    JOIN ai_knowledge_documents d ON d.id = c.document_id
    WHERE c.tenant_id = match_tenant_id
      AND d.is_active = TRUE
      AND d.tenant_id = match_tenant_id
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
