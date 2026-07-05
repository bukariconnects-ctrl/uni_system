"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { TenantStatus } from "@/lib/types/database";

export async function getTenants() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenants")
    .select("*, subscriptions(*, subscription_plans(name))")
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getActivePlans() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createTenant(formData: FormData) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const name = formData.get("name") as string;
  const subdomain = formData.get("subdomain") as string;
  const admin_email = formData.get("admin_email") as string;
  const admin_password = formData.get("admin_password") as string;
  const admin_first_name = formData.get("admin_first_name") as string;
  const admin_last_name = formData.get("admin_last_name") as string;
  const plan_id = formData.get("plan_id") as string;
  const max_users = parseInt(formData.get("max_users") as string);
  const max_storage_gb = parseInt(formData.get("max_storage_gb") as string);

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name,
      subdomain,
      admin_email,
      plan_id,
      max_users,
      max_storage_gb,
      status: "active",
      primary_color: "#1E40AF",
      secondary_color: "#3B82F6",
      absence_limit_count: 5,
      timezone: "Asia/Riyadh",
      default_language: "ar",
    })
    .select()
    .single();

  if (tenantError) throw new Error(tenantError.message);

  const { data: authUser, error: authError } =
    await adminClient.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      app_metadata: {
        tenant_id: tenant.id,
        role: "tenant_admin",
      },
    });

  if (authError) {
    await supabase.from("tenants").delete().eq("id", tenant.id);
    throw new Error(authError.message);
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authUser.user.id,
    tenant_id: tenant.id,
    role: "tenant_admin",
    first_name: admin_first_name,
    last_name: admin_last_name,
    email: admin_email,
    account_status: "active",
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authUser.user.id);
    await supabase.from("tenants").delete().eq("id", tenant.id);
    throw new Error(profileError.message);
  }

  const { error: subError } = await supabase.from("subscriptions").insert({
    tenant_id: tenant.id,
    plan_id,
    status: "active",
    start_date: new Date().toISOString(),
    end_date: new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000
    ).toISOString(),
    auto_renew: true,
  });

  if (subError) throw new Error(subError.message);

  revalidatePath("/super-admin/tenants");
  return tenant;
}

export async function updateTenantStatus(id: string, status: TenantStatus) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "deleted") {
    updateData.deleted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("tenants")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/super-admin/tenants");
}

export async function updateTenantQuota(
  id: string,
  max_users: number,
  max_storage_gb: number
) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("tenants")
    .update({ max_users, max_storage_gb })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/super-admin/tenants");
}
