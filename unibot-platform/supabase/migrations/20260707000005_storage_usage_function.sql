-- ============================================================
-- Migration: Add storage usage calculation function
--
-- Creates a function that queries storage.objects directly
-- to calculate actual storage used per tenant (in bytes).
-- This replaces the never-populated tenants.storage_used_gb
-- default of 0 with real data from the storage layer.
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_tenant_storage(tenant_id_filter UUID DEFAULT NULL)
RETURNS TABLE(tenant_id UUID, total_bytes BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = storage, public
AS $$
BEGIN
  RETURN QUERY
  WITH file_sizes AS (
    SELECT
      o.name,
      (o.metadata->>'size')::BIGINT AS sz
    FROM storage.objects o
    WHERE o.bucket_id IN ('course-materials', 'submissions', 'avatars')
      AND o.name ~ '^[0-9a-f\-]{36}/'
  )
  SELECT
    SPLIT_PART(fs.name, '/', 1)::UUID,
    SUM(fs.sz)::BIGINT
  FROM file_sizes fs
  WHERE (tenant_id_filter IS NULL OR SPLIT_PART(fs.name, '/', 1)::UUID = tenant_id_filter)
  GROUP BY SPLIT_PART(fs.name, '/', 1)::UUID;
END;
$$;

-- Also create a convenience function that returns GB directly
CREATE OR REPLACE FUNCTION public.get_tenant_storage_gb(tenant_id_filter UUID DEFAULT NULL)
RETURNS TABLE(tenant_id UUID, storage_gb NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = storage, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cts.tenant_id,
    ROUND(cts.total_bytes::NUMERIC / (1024*1024*1024), 4) AS storage_gb
  FROM public.calculate_tenant_storage(tenant_id_filter) cts;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE 'Created calculate_tenant_storage() and get_tenant_storage_gb() functions';
END $$;
