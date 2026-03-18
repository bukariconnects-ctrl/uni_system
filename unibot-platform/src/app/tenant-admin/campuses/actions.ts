"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getCampuses() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campuses")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createCampus(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const location = formData.get("location") as string;

  const { error } = await supabase.from("campuses").insert({
    tenant_id: profile.tenant_id,
    name,
    location: location || null,
    is_active: true,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("اسم الفرع مكرر، يرجى استخدام اسم آخر");
    throw new Error(error.message);
  }
  revalidatePath("/tenant-admin/campuses");
}

export async function updateCampus(id: string, formData: FormData) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const location = formData.get("location") as string;
  const is_active = formData.get("is_active") === "true";

  const { error } = await supabase
    .from("campuses")
    .update({ name, location: location || null, is_active })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/campuses");
}

export async function deleteCampus(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("campuses").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/campuses");
}

export async function cloneCollegeToCampus(
  sourceCollegeId: string,
  targetCampusId: string
) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("clone_college_to_campus", {
    p_source_college_id: sourceCollegeId,
    p_target_campus_id: targetCampusId,
    p_tenant_id: profile.tenant_id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/tenant-admin/campuses");
  revalidatePath("/tenant-admin/academic");

  return data as string;
}

export async function getCollegesForCloning() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("colleges")
    .select("id, name, code, campus_id, campuses(name)")
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  if (error) throw new Error(error.message);
  return data || [];
}
