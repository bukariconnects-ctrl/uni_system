"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getColleges() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("colleges")
    .select("*, departments(*, majors(*, academic_levels(*)))")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createCollege(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const dean_id = formData.get("dean_id") as string;

  const { error } = await supabase.from("colleges").insert({
    tenant_id: profile.tenant_id,
    name,
    code: code || null,
    dean_id: dean_id || null,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("كود الكلية مكرر، يرجى استخدام كود آخر");
    throw new Error(error.message);
  }
  revalidatePath("/tenant-admin/academic");
}

export async function updateCollege(id: string, formData: FormData) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const dean_id = formData.get("dean_id") as string;

  const { error } = await supabase
    .from("colleges")
    .update({ name, code: code || null, dean_id: dean_id || null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/academic");
}

export async function deleteCollege(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("colleges").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/academic");
}

export async function createDepartment(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const college_id = formData.get("college_id") as string;
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const head_id = formData.get("head_id") as string;

  const { error } = await supabase.from("departments").insert({
    tenant_id: profile.tenant_id,
    college_id,
    name,
    code: code || null,
    head_id: head_id || null,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("كود القسم مكرر، يرجى استخدام كود آخر");
    throw new Error(error.message);
  }
  revalidatePath("/tenant-admin/academic");
}

export async function updateDepartment(id: string, formData: FormData) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const head_id = formData.get("head_id") as string;

  const { error } = await supabase
    .from("departments")
    .update({ name, code: code || null, head_id: head_id || null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/academic");
}

export async function deleteDepartment(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("departments").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/academic");
}

export async function createMajor(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const department_id = formData.get("department_id") as string;
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const total_credits = parseInt(formData.get("total_credits") as string);
  const duration_years = parseInt(formData.get("duration_years") as string);

  const { data: major, error } = await supabase
    .from("majors")
    .insert({
      tenant_id: profile.tenant_id,
      department_id,
      name,
      code: code || null,
      total_credits,
      duration_years,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("كود التخصص مكرر، يرجى استخدام كود آخر");
    throw new Error(error.message);
  }

  if (major && duration_years > 0) {
    const levelNames = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع"];
    const levels = Array.from({ length: duration_years }, (_, i) => ({
      tenant_id: profile.tenant_id,
      major_id: major.id,
      level_number: i + 1,
      name: `المستوى ${levelNames[i] || (i + 1)}`,
    }));

    const { error: levelsError } = await supabase.from("academic_levels").insert(levels);
    if (levelsError) {
      console.error("Error creating academic levels:", levelsError);
    }
  }

  revalidatePath("/tenant-admin/academic");
}

export async function updateMajor(id: string, formData: FormData) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const total_credits = parseInt(formData.get("total_credits") as string);
  const duration_years = parseInt(formData.get("duration_years") as string);

  const { error } = await supabase
    .from("majors")
    .update({ name, code: code || null, total_credits, duration_years })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/academic");
}

export async function deleteMajor(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("majors").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/academic");
}

export async function createLevel(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const major_id = formData.get("major_id") as string;
  const level_number = parseInt(formData.get("level_number") as string);
  const name = formData.get("name") as string;

  const { error } = await supabase.from("academic_levels").insert({
    tenant_id: profile.tenant_id,
    major_id,
    level_number,
    name: name || null,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("رقم المستوى مكرر في هذا التخصص");
    throw new Error(error.message);
  }
  revalidatePath("/tenant-admin/academic");
}

export async function updateLevel(id: string, formData: FormData) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const level_number = parseInt(formData.get("level_number") as string);
  const name = formData.get("name") as string;

  const { error } = await supabase
    .from("academic_levels")
    .update({ level_number, name: name || null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/academic");
}

export async function deleteLevel(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("academic_levels").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/academic");
}

export async function getFacultyMembers() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("tenant_id", profile.tenant_id)
    .in("role", ["faculty", "academic_management"])
    .eq("account_status", "active")
    .order("first_name");

  if (error) throw new Error(error.message);
  return data || [];
}
