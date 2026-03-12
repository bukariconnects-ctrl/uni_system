"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { SemesterType } from "@/lib/types/database";

export async function getSemesters() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("semesters")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createSemester(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const academic_year = formData.get("academic_year") as string;
  const semester_type = formData.get("semester_type") as SemesterType;
  const name = formData.get("name") as string;
  const start_date = formData.get("start_date") as string;
  const end_date = formData.get("end_date") as string;
  const reg_start = formData.get("reg_start") as string;
  const reg_end = formData.get("reg_end") as string;
  const add_drop_start = formData.get("add_drop_start") as string;
  const add_drop_end = formData.get("add_drop_end") as string;

  const { error } = await supabase.from("semesters").insert({
    tenant_id: profile.tenant_id,
    academic_year,
    semester_type,
    name,
    start_date,
    end_date,
    reg_start: reg_start || null,
    reg_end: reg_end || null,
    add_drop_start: add_drop_start || null,
    add_drop_end: add_drop_end || null,
    status: "planning",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/calendar");
}

export async function updateSemester(id: string, formData: FormData) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const start_date = formData.get("start_date") as string;
  const end_date = formData.get("end_date") as string;
  const reg_start = formData.get("reg_start") as string;
  const reg_end = formData.get("reg_end") as string;
  const add_drop_start = formData.get("add_drop_start") as string;
  const add_drop_end = formData.get("add_drop_end") as string;
  const grade_freeze_at = formData.get("grade_freeze_at") as string;

  const { error } = await supabase
    .from("semesters")
    .update({
      start_date,
      end_date,
      reg_start: reg_start || null,
      reg_end: reg_end || null,
      add_drop_start: add_drop_start || null,
      add_drop_end: add_drop_end || null,
      grade_freeze_at: grade_freeze_at || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/calendar");
}

export async function updateSemesterStatus(
  id: string,
  status: "planning" | "active" | "archived"
) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "archived") {
    updateData.grade_freeze_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("semesters")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/calendar");
}
