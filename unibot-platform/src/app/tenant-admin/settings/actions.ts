"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function updateBranding(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const logo_url = formData.get("logo_url") as string;
  const primary_color = formData.get("primary_color") as string;
  const secondary_color = formData.get("secondary_color") as string;
  const welcome_message = formData.get("welcome_message") as string;

  const { error } = await supabase
    .from("tenants")
    .update({
      logo_url: logo_url || null,
      primary_color,
      secondary_color,
      welcome_message: welcome_message || null,
    })
    .eq("id", profile.tenant_id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/settings");
}

export async function updateLocalization(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const timezone = formData.get("timezone") as string;
  const default_language = formData.get("default_language") as string;

  const { error } = await supabase
    .from("tenants")
    .update({ timezone, default_language })
    .eq("id", profile.tenant_id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/settings");
}

export async function updateAbsenceThreshold(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const absence_limit_count = parseInt(
    formData.get("absence_limit_count") as string,
    10
  );

  const { error } = await supabase
    .from("tenants")
    .update({ absence_limit_count })
    .eq("id", profile.tenant_id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/settings");
}
