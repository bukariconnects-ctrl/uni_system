"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getDepartmentStaff(departmentId: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("department_staff")
    .select(`
      id, role, is_active, assigned_at,
      profiles!inner(id, first_name, last_name, email, phone)
    `)
    .eq("department_id", departmentId)
    .order("assigned_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAvailableProfiles(departmentId: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  // Get profiles that have academic_management role and are NOT already staff in this dept,
  // plus faculty members who could be assigned as department staff
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role")
    .in("role", ["academic_management", "faculty", "lecturer"])
    .eq("account_status", "active")
    .order("first_name");

  if (error) throw new Error(error.message);

  // Exclude profiles already assigned to this department
  const existingStaff = await getDepartmentStaff(departmentId);
  const existingIds = new Set(existingStaff.map((s: any) => s.profiles?.id));
  const existingFromProfiles = existingStaff.map((s: any) => s.profiles?.id).filter(Boolean);

  return (data || []).filter((p: any) => !existingFromProfiles.includes(p.id));
}

export async function addStaffMember(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const department_id = formData.get("department_id") as string;
  const profile_id = formData.get("profile_id") as string;
  const role = formData.get("role") as string;

  if (!department_id || !profile_id || !role) {
    throw new Error("جميع الحقول مطلوبة");
  }

  if (!["head_of_department", "secretary", "ticket_technician"].includes(role)) {
    throw new Error("دور غير صالح");
  }

  const { error } = await supabase.from("department_staff").insert({
    tenant_id: profile.tenant_id,
    department_id,
    profile_id,
    role,
    is_active: true,
  });

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      throw new Error("هذا المستخدم معيّن بالفعل في هذا القسم");
    }
    throw new Error(error.message);
  }

  revalidatePath("/tenant-admin/departments/staff");
}

export async function removeStaffMember(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("department_staff")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/departments/staff");
}

export async function toggleStaffStatus(id: string, isActive: boolean) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("department_staff")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/departments/staff");
}

export async function getDepartmentsWithStaff() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("departments")
    .select(`
      id, name, code,
      colleges!inner(name, code),
      department_staff(
        id, role, is_active,
        profiles!inner(id, first_name, last_name)
      )
    `)
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  if (error) throw new Error(error.message);
  return data || [];
}
