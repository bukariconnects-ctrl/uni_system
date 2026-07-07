import { createServiceClient } from "@/lib/supabase/server";

/**
 * Fetch actual storage usage per tenant from storage.objects.
 * Call with no filter to get ALL tenants' storage (for super admin),
 * or with a tenant_id_filter to get one tenant (for tenant admin).
 */
export async function getStorageUsageBytes(
  tenantIdFilter?: string
): Promise<{ tenant_id: string; total_bytes: number }[]> {
  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient.rpc("calculate_tenant_storage", {
    tenant_id_filter: tenantIdFilter ?? null,
  });

  if (error) {
    console.error("Failed to calculate storage usage:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    tenant_id: row.tenant_id,
    total_bytes: Number(row.total_bytes) || 0,
  }));
}

/**
 * Fetch actual storage usage in GB per tenant.
 */
export async function getStorageUsageGb(
  tenantIdFilter?: string
): Promise<{ tenant_id: string; storage_gb: number }[]> {
  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient.rpc("get_tenant_storage_gb", {
    tenant_id_filter: tenantIdFilter ?? null,
  });

  if (error) {
    console.error("Failed to get storage GB:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    tenant_id: row.tenant_id,
    storage_gb: Number(row.storage_gb) || 0,
  }));
}
