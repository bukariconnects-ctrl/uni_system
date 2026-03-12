"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { VenueType } from "@/lib/types/database";

export async function getVenues() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createVenue(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("venues").insert({
    tenant_id: profile.tenant_id,
    name: formData.get("name") as string,
    code: (formData.get("code") as string) || null,
    venue_type: formData.get("venue_type") as VenueType,
    capacity: parseInt(formData.get("capacity") as string) || 30,
    building: (formData.get("building") as string) || null,
    floor: (formData.get("floor") as string) || null,
    has_projector: formData.get("has_projector") === "true",
    has_ac: formData.get("has_ac") === "true",
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("كود القاعة مكرر، يرجى استخدام كود آخر");
    throw new Error(error.message);
  }
  revalidatePath("/tenant-admin/venues");
}

export async function updateVenue(id: string, formData: FormData) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("venues")
    .update({
      name: formData.get("name") as string,
      code: (formData.get("code") as string) || null,
      venue_type: formData.get("venue_type") as VenueType,
      capacity: parseInt(formData.get("capacity") as string) || 30,
      building: (formData.get("building") as string) || null,
      floor: (formData.get("floor") as string) || null,
      has_projector: formData.get("has_projector") === "true",
      has_ac: formData.get("has_ac") === "true",
      is_active: formData.get("is_active") === "true",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/venues");
}

export async function deleteVenue(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("venues").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/venues");
}
