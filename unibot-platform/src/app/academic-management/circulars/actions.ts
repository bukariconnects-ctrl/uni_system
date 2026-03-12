"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getCirculars() {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("circulars")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createCircular(formData: FormData) {
  const { profile } = await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { error } = await supabase.from("circulars").insert({
    tenant_id: profile.tenant_id,
    created_by: profile.id,
    title: formData.get("title") as string,
    body: formData.get("body") as string,
    target_type: formData.get("target_type") as string,
    target_id: (formData.get("target_id") as string) || null,
    is_mandatory: formData.get("is_mandatory") === "true",
    is_published: false,
    expires_at: (formData.get("expires_at") as string) || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/circulars");
}

export async function publishCircular(id: string) {
  await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("circulars")
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/circulars");
}

export async function deleteCircular(id: string) {
  await requireRole(["academic_management"]);
  const supabase = await createClient();

  const { error } = await supabase.from("circulars").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/academic-management/circulars");
}
