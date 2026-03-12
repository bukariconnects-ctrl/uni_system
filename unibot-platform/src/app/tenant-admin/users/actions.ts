"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/types/database";

export async function getUsers() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*, student_profiles(*), faculty_profiles(*)")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getMajors() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("majors")
    .select("id, name, code")
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  return data || [];
}

export async function getDepartmentsForUsers() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("departments")
    .select("id, name, code")
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  return data || [];
}

interface CsvRow {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  student_number?: string;
  employee_id?: string;
  major_id?: string;
  department_id?: string;
  enrollment_year?: string;
  specialization?: string;
  national_id?: string;
  phone?: string;
  gender?: string;
}

export async function bulkImportUsers(rows: CsvRow[]) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();
  const admin = await createAdminClient();

  const results: { success: number; errors: string[] } = {
    success: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.email || !row.first_name || !row.last_name || !row.role) {
      results.errors.push(`سطر ${rowNum}: بيانات ناقصة (email, first_name, last_name, role مطلوبة)`);
      continue;
    }

    const role = row.role as UserRole;
    if (!["student", "faculty", "academic_management"].includes(role)) {
      results.errors.push(`سطر ${rowNum}: الدور "${row.role}" غير صالح`);
      continue;
    }

    try {
      const tempPassword = `UniBot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { data: authUser, error: authError } =
        await admin.auth.admin.createUser({
          email: row.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            role,
            tenant_id: profile.tenant_id,
          },
        });

      if (authError) {
        results.errors.push(`سطر ${rowNum}: ${authError.message}`);
        continue;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: authUser.user.id,
        tenant_id: profile.tenant_id,
        role,
        first_name: row.first_name,
        last_name: row.last_name,
        national_id: row.national_id || null,
        phone: row.phone || null,
        gender: row.gender || null,
        account_status: "active",
      });

      if (profileError) {
        results.errors.push(`سطر ${rowNum}: خطأ في الملف الشخصي — ${profileError.message}`);
        continue;
      }

      if (role === "student" && row.student_number) {
        const { error: spError } = await supabase
          .from("student_profiles")
          .insert({
            profile_id: authUser.user.id,
            tenant_id: profile.tenant_id,
            student_number: row.student_number,
            enrollment_year: row.enrollment_year
              ? parseInt(row.enrollment_year)
              : null,
          });

        if (spError) {
          results.errors.push(`سطر ${rowNum}: خطأ في بيانات الطالب — ${spError.message}`);
          continue;
        }

        if (row.major_id) {
          await supabase.from("student_majors").insert({
            student_id: authUser.user.id,
            major_id: row.major_id,
            tenant_id: profile.tenant_id,
            is_primary: true,
          });
        }
      }

      if ((role === "faculty" || role === "academic_management") && row.employee_id) {
        const { error: fpError } = await supabase
          .from("faculty_profiles")
          .insert({
            profile_id: authUser.user.id,
            tenant_id: profile.tenant_id,
            employee_id: row.employee_id,
            specialization: row.specialization || null,
          });

        if (fpError) {
          results.errors.push(`سطر ${rowNum}: خطأ في بيانات المحاضر — ${fpError.message}`);
          continue;
        }

        if (row.department_id) {
          await supabase.from("faculty_departments").insert({
            faculty_id: authUser.user.id,
            department_id: row.department_id,
            tenant_id: profile.tenant_id,
            is_primary: true,
          });
        }
      }

      results.success++;
    } catch (e: unknown) {
      results.errors.push(
        `سطر ${rowNum}: ${e instanceof Error ? e.message : "خطأ غير متوقع"}`
      );
    }
  }

  revalidatePath("/tenant-admin/users");
  return results;
}

export async function updateUserStatus(
  userId: string,
  status: "active" | "suspended" | "terminated"
) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ account_status: status })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/users");
}

export async function getCustomRoles() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("custom_roles")
    .select("*, profile_custom_roles(profile_id, profiles!profile_custom_roles_profile_id_fkey(first_name, last_name))")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createCustomRole(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const scope = formData.get("scope") as string;
  const permissionsStr = formData.get("permissions") as string;

  let permissions = {};
  try {
    if (permissionsStr) permissions = JSON.parse(permissionsStr);
  } catch {
    permissions = {};
  }

  const { error } = await supabase.from("custom_roles").insert({
    tenant_id: profile.tenant_id,
    name,
    description: description || null,
    scope: scope || null,
    permissions,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate"))
      throw new Error("اسم الدور مكرر، يرجى استخدام اسم آخر");
    throw new Error(error.message);
  }
  revalidatePath("/tenant-admin/users");
}

export async function deleteCustomRole(id: string) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("custom_roles").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/users");
}

export async function assignCustomRole(formData: FormData) {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const profile_id = formData.get("profile_id") as string;
  const custom_role_id = formData.get("custom_role_id") as string;

  const { error } = await supabase.from("profile_custom_roles").insert({
    profile_id,
    custom_role_id,
    assigned_by: profile.id,
  });

  if (error) {
    if (error.message.includes("duplicate"))
      throw new Error("هذا الدور مُعيّن بالفعل لهذا المستخدم");
    throw new Error(error.message);
  }
  revalidatePath("/tenant-admin/users");
}

export async function removeCustomRoleAssignment(
  profileId: string,
  customRoleId: string
) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("profile_custom_roles")
    .delete()
    .eq("profile_id", profileId)
    .eq("custom_role_id", customRoleId);

  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/users");
}
