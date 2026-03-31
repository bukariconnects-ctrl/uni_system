"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getPlans() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("price_monthly", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createPlan(formData: FormData) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const price_monthly = parseFloat(formData.get("price_monthly") as string);
  const max_users = parseInt(formData.get("max_users") as string);
  const max_storage_gb = parseInt(formData.get("max_storage_gb") as string);
  const featuresRaw = formData.get("features") as string;

  let features = {};
  try {
    features = featuresRaw ? JSON.parse(featuresRaw) : {};
  } catch {
    features = {};
  }

  const { error } = await supabase.from("subscription_plans").insert({
    name,
    price_monthly,
    max_users,
    max_storage_gb,
    features,
    is_active: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/super-admin/plans");
}

export async function updatePlan(id: string, formData: FormData) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const price_monthly = parseFloat(formData.get("price_monthly") as string);
  const max_users = parseInt(formData.get("max_users") as string);
  const max_storage_gb = parseInt(formData.get("max_storage_gb") as string);
  const is_active = formData.get("is_active") === "true";
  const featuresRaw = formData.get("features") as string;

  let features = {};
  try {
    features = featuresRaw ? JSON.parse(featuresRaw) : {};
  } catch {
    features = {};
  }

  const { error } = await supabase
    .from("subscription_plans")
    .update({
      name,
      price_monthly,
      max_users,
      max_storage_gb,
      features,
      is_active,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/super-admin/plans");
}

export async function deletePlan(id: string) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("subscription_plans")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/super-admin/plans");
}
