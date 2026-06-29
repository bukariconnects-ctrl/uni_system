"use server";


import { createClient, createServiceClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/types/database";

export async function getUsers() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      student_profiles(*),
      faculty_profiles(*),
      student_majors(major_id, majors(name, code)),
      faculty_departments(department_id, departments(name, code)),
      profile_custom_roles(custom_role_id, custom_roles(name))
    `)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getColleges() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("colleges")
    .select("id, name, code")
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  return data || [];
}

export async function getAcademicLevels() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("academic_levels")
    .select("id, level_number, name, major_id")
    .eq("tenant_id", profile.tenant_id)
    .order("level_number");

  return data || [];
}

export async function createUser(formData: FormData): Promise<{ autoEnrollment?: { enrolled: number; total: number; semesterName?: string; warning?: string } }> {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();
  const admin = await createAdminClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const role = formData.get("role") as UserRole;
  const phone = formData.get("phone") as string;

  const major_id = formData.get("major_id") as string;
  const academic_level_id = formData.get("academic_level_id") as string;
  const student_number = formData.get("student_number") as string;
  const enrollment_year = formData.get("enrollment_year") as string;

  const department_id = formData.get("department_id") as string;
  const employee_id = formData.get("employee_id") as string;
  const specialization = formData.get("specialization") as string;

  const custom_role_id = formData.get("custom_role_id") as string;
  const scope_type = formData.get("scope_type") as string;
  const scope_id = formData.get("scope_id") as string;

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      tenant_id: profile.tenant_id,
    },
  });

  if (authError) {
    if (authError.message.includes("already been registered"))
      throw new Error("البريد الإلكتروني مسجل بالفعل");
    throw new Error(authError.message);
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authUser.user.id,
    tenant_id: profile.tenant_id,
    role,
    first_name,
    last_name,
    email,
    phone: phone || null,
    account_status: "active",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`خطأ في إنشاء الملف الشخصي: ${profileError.message}`);
  }

  if (role === "student") {
    if (student_number) {
      const { error: spError } = await supabase.from("student_profiles").insert({
        profile_id: authUser.user.id,
        tenant_id: profile.tenant_id,
        student_number,
        enrollment_year: enrollment_year ? parseInt(enrollment_year) : new Date().getFullYear(),
      });
      if (spError) throw new Error(`خطأ في بيانات الطالب: ${spError.message}`);
    }

    if (major_id) {
      const { error: smError } = await supabase.from("student_majors").insert({
        student_id: authUser.user.id,
        major_id,
        tenant_id: profile.tenant_id,
        is_primary: true,
        academic_level_id: academic_level_id || null,
      });
      if (smError) throw new Error(`خطأ في ربط التخصص: ${smError.message}`);

      // Auto-enroll: register student in all study plan courses for their major/level/semester
      if (academic_level_id) {
        try {
          const serviceClient = createServiceClient();
          const { data: activeSemester } = await serviceClient
            .from("semesters")
            .select("id, name, semester_type, status")
            .eq("tenant_id", profile.tenant_id)
            .in("status", ["planning", "registration", "active"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!activeSemester) {
            const msg = "⚠️ لم يتم العثور على فصل دراسي بحالة (تخطيط/تسجيل/نشط) — لم يتم التسجيل الآلي";
            console.warn(msg);
            return { autoEnrollment: { enrolled: 0, total: 0, warning: msg } };
          }

          if (!activeSemester.semester_type) {
            const msg = `⚠️ الفصل "${activeSemester.name}" ليس له نوع فصل (semester_type) — لم يتم التسجيل الآلي`;
            console.warn(msg);
            return { autoEnrollment: { enrolled: 0, total: 0, warning: msg } };
          }

          const { data: planCourses } = await serviceClient
            .from("study_plan_courses")
            .select("course_id")
            .eq("academic_level_id", academic_level_id)
            .eq("semester_type", activeSemester.semester_type);

          if (!planCourses || planCourses.length === 0) {
            const msg = `⚠️ لا توجد مواد في الخطة الدراسية لهذا المستوى والترم (${activeSemester.semester_type}) — لم يتم التسجيل الآلي`;
            console.warn(msg);
            return { autoEnrollment: { enrolled: 0, total: 0, warning: msg } };
          }

          const enrollments = planCourses.map((pc: any) => ({
            tenant_id: profile.tenant_id,
            student_id: authUser.user.id,
            course_id: pc.course_id,
            semester_id: activeSemester.id,
            status: "enrolled" as const,
          }));

          const { error: enrollError } = await serviceClient
            .from("enrollments")
            .insert(enrollments);

          if (enrollError) {
            const msg = `⚠️ خطأ في التسجيل الآلي: ${enrollError.message}`;
            console.warn(msg);
            return { autoEnrollment: { enrolled: 0, total: planCourses.length, warning: msg } };
          }

          console.log(`✅ Auto-enrolled student in ${enrollments.length} courses for semester "${activeSemester.name}"`);
          return { autoEnrollment: { enrolled: enrollments.length, total: planCourses.length, semesterName: activeSemester.name } };
        } catch (e) {
          const msg = `⚠️ خطأ غير متوقع في التسجيل الآلي: ${e instanceof Error ? e.message : "خطأ غير معروف"}`;
          console.warn(msg);
          return { autoEnrollment: { enrolled: 0, total: 0, warning: msg } };
        }
      } else {
        console.warn("⚠️ لم يتم اختيار المستوى الدراسي للطالب — لم يتم التسجيل الآلي");
      }
    }
  }

  if (role === "faculty" || role === "lecturer") {
    if (employee_id) {
      const { error: fpError } = await supabase.from("faculty_profiles").insert({
        profile_id: authUser.user.id,
        tenant_id: profile.tenant_id,
        employee_id,
        specialization: specialization || null,
      });
      if (fpError) throw new Error(`خطأ في بيانات المحاضر: ${fpError.message}`);
    }

    if (department_id) {
      const { error: fdError } = await supabase.from("faculty_departments").insert({
        faculty_id: authUser.user.id,
        department_id,
        tenant_id: profile.tenant_id,
        is_primary: true,
      });
      if (fdError) throw new Error(`خطأ في ربط القسم: ${fdError.message}`);
    }
  }

  if (role === "academic_management") {
    const am_department_id = formData.get("am_department_id") as string;

    if (!am_department_id) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      throw new Error("يجب تحديد القسم لمستخدم الإدارة الأكاديمية");
    }

    if (employee_id) {
      const { error: fpError } = await supabase.from("faculty_profiles").insert({
        profile_id: authUser.user.id,
        tenant_id: profile.tenant_id,
        employee_id,
        specialization: specialization || null,
      });
      if (fpError) throw new Error(`خطأ في بيانات الموظف: ${fpError.message}`);
    }

    const { error: amdError } = await supabase.from("academic_management_departments").insert({
      profile_id: authUser.user.id,
      department_id: am_department_id,
      tenant_id: profile.tenant_id,
      assigned_by: profile.id,
    });
    if (amdError) throw new Error(`خطأ في ربط القسم: ${amdError.message}`);

    if (custom_role_id) {
      const { error: pcrError } = await supabase.from("profile_custom_roles").insert({
        profile_id: authUser.user.id,
        custom_role_id,
        assigned_by: profile.id,
      });
      if (pcrError) throw new Error(`خطأ في تعيين الدور: ${pcrError.message}`);
    }
  }

  revalidatePath("/tenant-admin/users");
  revalidatePath("/student/register");
  return {}; // non-student or missing major/level — no auto-enrollment
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
    if (!["student", "faculty", "lecturer", "academic_management"].includes(role)) {
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

          // Auto-enroll for bulk import
          try {
            const svc = createServiceClient();
            const { data: sem } = await svc
              .from("semesters")
              .select("id, semester_type")
              .eq("tenant_id", profile.tenant_id)
              .in("status", ["planning", "registration", "active"])
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (sem?.semester_type) {
              const { data: planCourses } = await svc
                .from("study_plan_courses")
                .select("course_id")
                .eq("academic_level_id", row.academic_level_id || "")
                .eq("semester_type", sem.semester_type);

              if (planCourses && planCourses.length > 0) {
                const entries = planCourses.map((pc: any) => ({
                  tenant_id: profile.tenant_id,
                  student_id: authUser.user.id,
                  course_id: pc.course_id,
                  semester_id: sem.id,
                  status: "enrolled" as const,
                }));
                await svc.from("enrollments").insert(entries);
              }
            }
          } catch {
            // Non-fatal for bulk import
          }
        }
      }

      if ((role === "faculty" || role === "lecturer" || role === "academic_management") && row.employee_id) {
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

export async function deleteUser(userId: string) {
  await requireRole(["tenant_admin"]);
  const admin = await createAdminClient();

  // Deleting from auth.users will cascade to profiles via ON DELETE CASCADE
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath("/tenant-admin/users");
}

export async function updateUser(userId: string, formData: FormData) {
  await requireRole(["tenant_admin"]);
  const supabase = await createClient();
  const admin = await createAdminClient();

  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const student_number = formData.get("student_number") as string;
  const enrollment_year = formData.get("enrollment_year") as string;
  const employee_id = formData.get("employee_id") as string;
  const specialization = formData.get("specialization") as string;
  const department_id = formData.get("department_id") as string;
  const am_department_id = formData.get("am_department_id") as string;

  // Auth updates — get current email first to compare
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const currentEmail = authUser?.user?.email ?? "";

  const authUpdate: { email?: string; password?: string } = {};
  const newEmail = email?.trim();
  if (newEmail && newEmail !== currentEmail) authUpdate.email = newEmail;
  if (password?.trim()) authUpdate.password = password.trim();

  if (Object.keys(authUpdate).length > 0) {
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, authUpdate);
    if (authErr) throw new Error(authErr.message);
  }

  // Resolved email (prefer the new one if changed, else keep current)
  const resolvedEmail = authUpdate.email ?? currentEmail;

  // Core profile update — sync email to profiles table too
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ first_name, last_name, phone: phone || null, email: resolvedEmail })
    .eq("id", userId);
  if (profileError) throw new Error(profileError.message);

  // ── Student ────────────────────────────────────────────────
  if (role === "student") {
    await supabase
      .from("student_profiles")
      .update({
        student_number: student_number || undefined,
        enrollment_year: enrollment_year ? parseInt(enrollment_year) : undefined,
      })
      .eq("profile_id", userId);
  }

  // ── Faculty / Lecturer ─────────────────────────────────────
  if (role === "faculty" || role === "lecturer") {
    // Faculty profile (employee_id, specialization)
    await supabase
      .from("faculty_profiles")
      .update({
        employee_id: employee_id || null,
        specialization: specialization || null,
      })
      .eq("profile_id", userId);

    // Department assignment — replace primary department
    if (department_id) {
      // Get tenant_id from the user profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .single();

      if (prof?.tenant_id) {
        // Remove old primary dept and set new one
        await supabase
          .from("faculty_departments")
          .delete()
          .eq("faculty_id", userId)
          .eq("is_primary", true);

        await supabase.from("faculty_departments").upsert({
          faculty_id: userId,
          department_id,
          tenant_id: prof.tenant_id,
          is_primary: true,
        }, { onConflict: "faculty_id,department_id" });
      }
    }
  }

  // ── Academic Management ────────────────────────────────────
  if (role === "academic_management") {
    // Faculty_profile for employee_id (shared table)
    await supabase
      .from("faculty_profiles")
      .update({
        employee_id: employee_id || null,
        specialization: specialization || null,
      })
      .eq("profile_id", userId);

    // Managed department
    if (am_department_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .single();

      if (prof?.tenant_id) {
        await supabase
          .from("academic_management_departments")
          .delete()
          .eq("profile_id", userId);

        await supabase.from("academic_management_departments").insert({
          profile_id: userId,
          department_id: am_department_id,
          tenant_id: prof.tenant_id,
        });
      }
    }
  }

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
