"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getAnnouncements() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("system_announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createAnnouncement(formData: FormData) {
  const { profile } = await requireRole(["super_admin"]);
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const expires_at = formData.get("expires_at") as string;

  const { error } = await supabase.from("system_announcements").insert({
    title,
    body,
    is_active: true,
    expires_at: expires_at || null,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/super-admin/announcements");
}

export async function toggleAnnouncement(id: string, is_active: boolean) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("system_announcements")
    .update({ is_active })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/super-admin/announcements");
}

export async function deleteAnnouncement(id: string) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("system_announcements")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/super-admin/announcements");
}
