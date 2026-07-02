"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export async function getProfileData() {
  const { user, profile } = await getUser();
  const supabase = await createClient();

  let studentProfile = null;
  let facultyProfile = null;

  if (profile.role === "student") {
    const [spRes, smRes] = await Promise.all([
      supabase
        .from("student_profiles")
        .select("*")
        .eq("profile_id", profile.id)
        .single(),
      supabase
        .from("student_majors")
        .select("major_id, majors(name, code, departments(name)), academic_levels(level_number, name)")
        .eq("student_id", profile.id)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);
    studentProfile = { ...(spRes.data || {}), ...(smRes.data || {}) };
  }

  if (profile.role === "faculty") {
    const { data } = await supabase
      .from("faculty_profiles")
      .select("*, departments(name, code)")
      .eq("profile_id", profile.id)
      .single();
    facultyProfile = data;
  }

  let tenantName = null;
  if (profile.tenant_id) {
    const { data } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", profile.tenant_id)
      .single();
    tenantName = data?.name;
  }

  return {
    user: { id: user.id, email: user.email },
    profile,
    studentProfile,
    facultyProfile,
    tenantName,
  };
}

export async function updateProfile(formData: FormData) {
  const { profile } = await getUser();
  const supabase = await createClient();

  const phone = formData.get("phone") as string;
  const gender = formData.get("gender") as string;

  const updates: Record<string, unknown> = {};
  if (phone !== null) updates.phone = phone || null;
  if (gender) updates.gender = gender;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (error) throw new Error(error.message);
  }

  const rolePath = {
    super_admin: "/super-admin",
    tenant_admin: "/tenant-admin",
    academic_management: "/academic-management",
    head_of_department: "/academic-management",
    secretary: "/tenant-admin",
    ticket_technician: "/tenant-admin",
    lecturer: "/faculty",
    faculty: "/faculty",
    student: "/student",
  }[profile.role] || "";

  revalidatePath(`${rolePath}/profile`);
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();

  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!newPassword || newPassword.length < 6) {
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("كلمة المرور غير متطابقة");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function uploadAvatar(formData: FormData) {
  const { profile } = await getUser();
  const supabase = await createClient();

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) throw new Error("لم يتم تحديد ملف");

  const filePath = `${profile.tenant_id || "system"}/${profile.id}/avatar.webp`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      contentType: "image/webp",
    });

  if (uploadError) throw new Error("فشل رفع الصورة: " + uploadError.message);

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", profile.id);

  if (updateError) throw new Error(updateError.message);

  const rolePath = {
    super_admin: "/super-admin",
    tenant_admin: "/tenant-admin",
    academic_management: "/academic-management",
    head_of_department: "/academic-management",
    secretary: "/tenant-admin",
    ticket_technician: "/tenant-admin",
    lecturer: "/faculty",
    faculty: "/faculty",
    student: "/student",
  }[profile.role] || "";

  revalidatePath(`${rolePath}/profile`);

  return avatarUrl;
}
