import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { DepartmentsStaffClient } from "./staff-client";

export default async function DepartmentsStaffPage() {
  const { profile } = await requireRole(["tenant_admin"]);
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from("departments")
    .select(`
      id, name, code,
      colleges!inner(name, code),
      department_staff(
        id, role, is_active, assigned_at,
        profiles!inner(id, first_name, last_name, email, phone)
      )
    `)
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  const deptList = (departments || []) as any[];

  // Build a map of department ID → staff for initial state
  const initialStaffByDept: Record<string, any[]> = {};
  for (const dept of deptList) {
    initialStaffByDept[dept.id] = dept.department_staff || [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إدارة موظفي الأقسام</h1>
        <p className="mt-1 text-sm text-text-secondary">
          تعيين رؤساء أقسام وسكرتارية وفنيي دعم للأقسام
        </p>
      </div>
      <DepartmentsStaffClient
        departments={deptList}
        initialStaffByDept={initialStaffByDept}
      />
    </div>
  );
}
