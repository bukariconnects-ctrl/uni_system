"use client";

import { useState, useRef, useEffect } from "react";
import {
  bulkImportUsers,
  updateUserStatus,
  createCustomRole,
  deleteCustomRole,
  assignCustomRole,
  removeCustomRoleAssignment,
  createUser,
  deleteUser,
  updateUser,
} from "./actions";
import {
  Upload,
  Users,
  Shield,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  GraduationCap,
  Briefcase,
  Building2,
  Search,
  Eye,
  EyeOff,
  Pencil,
  Phone,
  Mail,
  Calendar,
  Hash,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

interface StudentMajorLink {
  major_id: string;
  majors: { name: string; code: string | null } | null;
}

interface FacultyDeptLink {
  department_id: string;
  departments: { name: string; code: string | null } | null;
}

interface AmDeptLink {
  department_id: string;
  departments: { name: string; code: string | null } | null;
}

interface CustomRoleLink {
  custom_role_id: string;
  custom_roles: { name: string } | null;
}

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string;
  account_status: string;
  created_at: string;
  phone: string | null;
  national_id: string | null;
  gender: string | null;
  date_of_birth: string | null;
  student_profiles: { student_number: string; enrollment_year: number | null }[] | null;
  faculty_profiles: { employee_id: string | null; specialization: string | null }[] | null;
  student_majors: StudentMajorLink[] | null;
  faculty_departments: FacultyDeptLink[] | null;
  profile_custom_roles: CustomRoleLink[] | null;
  academic_management_departments: AmDeptLink[] | null;
}

interface RoleAssignment {
  profile_id: string;
  profiles: { first_name: string; last_name: string } | null;
}

interface CustomRoleRow {
  id: string;
  name: string;
  description: string | null;
  scope: string | null;
  permissions: Record<string, unknown>;
  profile_custom_roles: RoleAssignment[];
}

interface MajorOption {
  id: string;
  name: string;
  code: string | null;
  department_id: string | null;
}

interface DeptOption {
  id: string;
  name: string;
  code: string | null;
  college_id: string | null;
}

interface CollegeOption {
  id: string;
  name: string;
  code: string | null;
}

interface LevelOption {
  id: string;
  level_number: number;
  name: string | null;
  major_id: string;
}

type UserTab = "all" | "students" | "faculty" | "management";
type ModalState =
  | { type: "add-user" }
  | { type: "bulk-import" }
  | { type: "add-role" }
  | { type: "assign-role"; roleId: string; roleName: string }
  | { type: "view-user"; user: UserRow }
  | { type: "edit-user"; user: UserRow }
  | null;

const ROLE_LABELS: Record<string, string> = {
  student: "طالب",
  faculty: "محاضر",
  lecturer: "محاضر",
  academic_management: "إدارة أكاديمية",
  tenant_admin: "مدير جامعة",
  head_of_department: "رئيس قسم",
  secretary: "سكرتير",
  ticket_technician: "فني دعم",
};

const ROLE_COLORS: Record<string, string> = {
  student: "bg-action-blue/20 text-action-blue",
  faculty: "bg-success/10 text-success",
  lecturer: "bg-success/10 text-success",
  academic_management: "bg-purple/10 text-purple",
  tenant_admin: "bg-academic-navy/10 text-academic-navy",
  head_of_department: "bg-purple/10 text-purple",
  secretary: "bg-warning/10 text-warning",
  ticket_technician: "bg-orange/10 text-orange",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-success/10 text-success" },
  suspended: { label: "معلّق", color: "bg-warning/10 text-warning" },
  terminated: { label: "منتهي", color: "bg-danger/10 text-danger" },
};

export function UsersClient({
  initialUsers,
  customRoles,
  majors,
  departments,
  colleges,
  academicLevels,
}: {
  initialUsers: UserRow[];
  customRoles: CustomRoleRow[];
  majors: MajorOption[];
  departments: DeptOption[];
  colleges: CollegeOption[];
  academicLevels: LevelOption[];
}) {
  const [tab, setTab] = useState<UserTab>("all");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    if (p === "all" || p === "students" || p === "faculty" || p === "management") setTab(p as UserTab);
  }, []);

  function changeTab(t: UserTab) {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  }
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoEnrollMsg, setAutoEnrollMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const closeModal = () => {
    setModal(null);
    setError("");
    setAutoEnrollMsg(null);
    setImportResult(null);
  };

  async function run(action: () => Promise<any>, successMessage?: string) {
    setLoading(true);
    setError("");
    setAutoEnrollMsg(null);
    const loadingToast = toast.loading("جاري تنفيذ العملية...");
    try {
      const result = await action();
      toast.dismiss(loadingToast);
      if (result?.autoEnrollment) {
        const ae = result.autoEnrollment;
        if (ae.warning) {
          toast.success(`✅ تم إنشاء المستخدم\n${ae.warning}`);
        } else if (ae.enrolled > 0) {
          toast.success(`تم تسجيل الطالب في ${ae.enrolled} من ${ae.total} مادة`);
        } else {
          toast.success("تم إنشاء المستخدم بنجاح");
        }
        setTimeout(() => window.location.reload(), 2500);
      } else {
        toast.success(successMessage || "تمت العملية بنجاح");
        window.location.reload();
      }
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ غير متوقع";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function parseCsv(text: string) {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      rows.push(row);
    }
    return rows;
  }

  async function handleCsvUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setImportResult(null);
    const loadingToast = toast.loading("جاري استيراد المستخدمين...");
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("الملف فارغ أو لا يحتوي على بيانات صالحة");
        setError("الملف فارغ أو لا يحتوي على بيانات صالحة");
        setLoading(false);
        return;
      }
      const result = await bulkImportUsers(rows as never);
      toast.dismiss(loadingToast);
      setImportResult(result);
      if (result.success > 0) {
        toast.success(`تم استيراد ${result.success} مستخدم بنجاح`);
      }
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} أخطاء أثناء الاستيراد`);
      }
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ أثناء الاستيراد";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = initialUsers.filter((u) => {
    const matchesSearch =
      u.first_name.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name.toLowerCase().includes(search.toLowerCase()) ||
      u.student_profiles?.[0]?.student_number?.toLowerCase().includes(search.toLowerCase()) ||
      u.faculty_profiles?.[0]?.employee_id?.toLowerCase().includes(search.toLowerCase());

    if (tab === "all") return matchesSearch;
    if (tab === "students") return u.role === "student" && matchesSearch;
    if (tab === "faculty") return u.role === "faculty" && matchesSearch;
    if (tab === "management") return (u.role === "academic_management" || u.role === "tenant_admin") && matchesSearch;
    return matchesSearch;
  });

  const counts = {
    all: initialUsers.length,
    students: initialUsers.filter((u) => u.role === "student").length,
    faculty: initialUsers.filter((u) => u.role === "faculty").length,
    management: initialUsers.filter((u) => u.role === "academic_management" || u.role === "tenant_admin").length,
  };

  const tabs: { key: UserTab; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "الكل", icon: Users },
    { key: "students", label: "الطلاب", icon: GraduationCap },
    { key: "faculty", label: "أعضاء هيئة التدريس", icon: Briefcase },
    { key: "management", label: "الإدارة الأكاديمية", icon: Building2 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatBadge icon={<Users className="h-4 w-4" />} label="مستخدمين" count={counts.all} color="blue" />
          <StatBadge icon={<GraduationCap className="h-4 w-4" />} label="طلاب" count={counts.students} color="green" />
          <StatBadge icon={<Briefcase className="h-4 w-4" />} label="محاضرين" count={counts.faculty} color="purple" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModal({ type: "bulk-import" })}
            className="flex items-center gap-2 rounded-xl border border-action-blue/30 bg-action-blue/5 px-4 py-2.5 text-sm font-medium text-action-blue transition-colors hover:bg-action-blue/20"
          >
            <Upload className="h-4 w-4" />
            استيراد CSV
          </button>
          <button
            onClick={() => setModal({ type: "add-user" })}
            className="flex items-center gap-2 rounded-xl bg-action-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-action-blue/90"
          >
            <Plus className="h-4 w-4" />
            إضافة مستخدم
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-app-bg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-card-bg text-action-blue shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${tab === t.key ? "bg-action-blue/20" : "bg-app-bg"}`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الرقم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card-bg py-2 pr-10 pl-4 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-action-blue/20">
            <Users className="h-7 w-7 text-action-blue" />
          </div>
          <p className="text-base font-semibold text-text-primary">
            {search ? "لا توجد نتائج" : "لا يوجد مستخدمون"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {search ? "جرب كلمات بحث مختلفة" : "ابدأ بإضافة مستخدمين للنظام"}
          </p>
          {!search && (
            <button
              onClick={() => setModal({ type: "add-user" })}
              className="mt-5 flex items-center gap-2 rounded-xl bg-action-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
            >
              <Plus className="h-4 w-4" />
              إضافة أول مستخدم
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card-bg shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-app-bg text-right">
                <th className="px-4 py-3 font-semibold text-text-primary">المستخدم</th>
                <th className="px-4 py-3 font-semibold text-text-primary">الدور</th>
                <th className="px-4 py-3 font-semibold text-text-primary">الربط الأكاديمي</th>
                <th className="px-4 py-3 font-semibold text-text-primary">الحالة</th>
                <th className="px-4 py-3 font-semibold text-text-primary"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const status = STATUS_LABELS[user.account_status] || STATUS_LABELS.active;
                const majorLink = user.student_majors?.[0]?.majors;
                const deptLink = user.faculty_departments?.[0]?.departments;
                const customRole = user.profile_custom_roles?.[0]?.custom_roles;

                return (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-b-0 hover:bg-app-bg/50 cursor-pointer"
                    onClick={() => setModal({ type: "view-user", user })}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-text-secondary">
                            {user.student_profiles?.[0]?.student_number || user.faculty_profiles?.[0]?.employee_id || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                        {customRole && (
                          <span className="rounded-full bg-purple/10 px-2 py-0.5 text-xs font-medium text-purple">
                            {customRole.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {majorLink && (
                        <span className="text-xs">
                          {majorLink.name} {majorLink.code ? `(${majorLink.code})` : ""}
                        </span>
                      )}
                      {deptLink && (
                        <span className="text-xs">
                          {deptLink.name} {deptLink.code ? `(${deptLink.code})` : ""}
                        </span>
                      )}
                      {user.role === "academic_management" && user.academic_management_departments?.[0]?.departments && (
                        <span className="text-xs rounded-full bg-purple/10 px-2 py-0.5 text-purple">
                          {user.academic_management_departments[0].departments.name}
                        </span>
                      )}
                      {!majorLink && !deptLink && user.role !== "academic_management" && "—"}
                      {user.role === "academic_management" && !user.academic_management_departments?.[0] && "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Edit */}
                        <button
                          onClick={() => setModal({ type: "edit-user", user })}
                          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-action-blue/20 hover:text-action-blue"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {/* Suspend / Activate */}
                        {user.account_status === "active" && user.role !== "tenant_admin" && (
                          <button
                            onClick={() => run(() => updateUserStatus(user.id, "suspended"), "تم تعليق المستخدم")}
                            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-warning/10 hover:text-warning"
                            title="تعليق"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        )}
                        {user.account_status === "suspended" && (
                          <button
                            onClick={() => run(() => updateUserStatus(user.id, "active"), "تم إعادة تفعيل المستخدم")}
                            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-success/10 hover:text-success"
                            title="إعادة تفعيل"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        {/* Delete */}
                        {user.role !== "tenant_admin" && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف المستخدم "${user.first_name} ${user.last_name}"؟ لا يمكن التراجع عن هذا الإجراء.`))
                                run(() => deleteUser(user.id), "تم حذف المستخدم");
                            }}
                            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">الأدوار المخصصة</h2>
          <button
            onClick={() => setModal({ type: "add-role" })}
            className="flex items-center gap-2 rounded-xl border border-purple/30 bg-purple/5 px-4 py-2 text-sm font-medium text-purple transition-colors hover:bg-purple/10"
          >
            <Plus className="h-4 w-4" />
            دور جديد
          </button>
        </div>

        {customRoles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card-bg p-8 text-center">
            <Shield className="mx-auto mb-3 h-8 w-8 text-text-secondary" />
            <p className="text-sm text-text-secondary">لا توجد أدوار مخصصة بعد</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customRoles.map((role) => (
              <div key={role.id} className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple/10">
                      <Shield className="h-4 w-4 text-purple" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">{role.name}</p>
                      {role.scope && (
                        <p className="text-xs text-text-secondary" dir="ltr">{role.scope}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm("حذف هذا الدور؟")) run(() => deleteCustomRole(role.id), "تم حذف الدور"); }}
                    className="rounded-lg p-1 text-text-secondary hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {role.description && (
                  <p className="mb-3 text-xs text-text-secondary">{role.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {role.profile_custom_roles.map((pcr) => (
                    <span key={pcr.profile_id} className="flex items-center gap-1 rounded-full bg-app-bg px-2 py-0.5 text-xs">
                      {pcr.profiles?.first_name} {pcr.profiles?.last_name}
                      <button
                        onClick={() => run(() => removeCustomRoleAssignment(pcr.profile_id, role.id), "تم إلغاء تعيين الدور")}
                        className="text-text-secondary hover:text-danger"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => setModal({ type: "assign-role", roleId: role.id, roleName: role.name })}
                    className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-text-secondary hover:border-purple hover:text-purple"
                  >
                    + تعيين
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal?.type === "add-user" && (
        <AddUserModal
          majors={majors}
          departments={departments}
          colleges={colleges}
          academicLevels={academicLevels}
          customRoles={customRoles}
          loading={loading}
          error={error}
          onClose={closeModal}
          onSubmit={(fd) => run(() => createUser(fd))}
        />
      )}

      {modal?.type === "bulk-import" && (
        <BulkImportModal
          fileRef={fileRef}
          loading={loading}
          error={error}
          importResult={importResult}
          onClose={closeModal}
          onUpload={handleCsvUpload}
        />
      )}

      {modal?.type === "add-role" && (
        <AddRoleModal
          departments={departments}
          loading={loading}
          error={error}
          onClose={closeModal}
          onSubmit={(fd) => run(() => createCustomRole(fd), "تم إنشاء الدور")}
        />
      )}

      {modal?.type === "assign-role" && (
        <AssignRoleModal
          roleId={modal.roleId}
          roleName={modal.roleName}
          users={initialUsers.filter((u) => u.role !== "tenant_admin")}
          loading={loading}
          error={error}
          onClose={closeModal}
          onSubmit={(fd) => run(() => assignCustomRole(fd), "تم تعيين الدور")}
        />
      )}

      {modal?.type === "view-user" && (
        <ViewUserModal
          user={modal.user}
          onClose={closeModal}
          onEdit={() => setModal({ type: "edit-user", user: modal.user })}
        />
      )}

      {modal?.type === "edit-user" && (
        <EditUserModal
          user={modal.user}
          departments={departments}
          customRoles={customRoles}
          loading={loading}
          error={error}
          onClose={closeModal}
          onSubmit={(fd) => run(() => updateUser(modal.user.id, fd), "تم تحديث المستخدم")}
        />
      )}
    </div>
  );
}

function StatBadge({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: "blue" | "green" | "purple";
}) {
  const colors = {
    blue: "bg-action-blue/20 text-action-blue",
    green: "bg-success/10 text-success",
    purple: "bg-purple/10 text-purple",
  };
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${colors[color]}`}>
      {icon}
      <span className="text-base font-bold">{count}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  error,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  error: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full rounded-2xl bg-card-bg shadow-2xl ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function AddUserModal({
  majors,
  departments,
  colleges,
  academicLevels,
  customRoles,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  majors: MajorOption[];
  departments: DeptOption[];
  colleges: CollegeOption[];
  academicLevels: LevelOption[];
  customRoles: CustomRoleRow[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [role, setRole] = useState<"student" | "faculty" | "academic_management">("student");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const filteredLevels = academicLevels.filter((l) => l.major_id === selectedMajor);

  return (
    <Modal title="إضافة مستخدم جديد" onClose={onClose} error={error}>
      <form action={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">نوع المستخدم</label>
          <div className="flex gap-2">
            {[
              { value: "student" as const, label: "طالب", icon: GraduationCap, color: "action-blue" },
              { value: "faculty" as const, label: "محاضر", icon: Briefcase, color: "success" },
              { value: "academic_management" as const, label: "إدارة أكاديمية", icon: Building2, color: "purple" },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  role === r.value
                    ? `bg-${r.color}/10 text-${r.color} ring-2 ring-${r.color}/30`
                    : "bg-app-bg text-text-secondary hover:bg-card-bg"
                }`}
              >
                <r.icon className="h-4 w-4" />
                {r.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="role" value={role} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">الاسم الأول</label>
            <input
              type="text"
              name="first_name"
              required
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">الاسم الأخير</label>
            <input
              type="text"
              name="last_name"
              required
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              required
              dir="ltr"
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                minLength={8}
                dir="ltr"
                className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 pl-10 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">الهاتف (اختياري)</label>
            <input
              type="tel"
              name="phone"
              dir="ltr"
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
            />
          </div>
        </div>

        {role === "student" && (
          <div className="rounded-xl border border-action-blue/20 bg-action-blue/5 p-4 space-y-4">
            <p className="text-xs font-semibold text-action-blue">بيانات الطالب</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">رقم الطالب</label>
                <input
                  type="text"
                  name="student_number"
                  dir="ltr"
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">سنة الالتحاق</label>
                <input
                  type="number"
                  name="enrollment_year"
                  defaultValue={new Date().getFullYear()}
                  min="2000"
                  max="2100"
                  dir="ltr"
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">التخصص</label>
                <select
                  name="major_id"
                  value={selectedMajor}
                  onChange={(e) => setSelectedMajor(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
                >
                  <option value="">— اختر التخصص —</option>
                  {majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.code ? `(${m.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">المستوى الدراسي</label>
                <select
                  name="academic_level_id"
                  disabled={!selectedMajor}
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20 disabled:opacity-50"
                >
                  <option value="">— اختر المستوى —</option>
                  {filteredLevels.map((l) => (
                    <option key={l.id} value={l.id}>
                      المستوى {l.level_number} {l.name ? `(${l.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {role === "faculty" && (
          <div className="rounded-xl border border-success/20 bg-success/5 p-4 space-y-4">
            <p className="text-xs font-semibold text-success">بيانات المحاضر</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">رقم الموظف</label>
                <input
                  type="text"
                  name="employee_id"
                  dir="ltr"
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-success focus:ring-2 focus:ring-success/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">التخصص العلمي</label>
                <input
                  type="text"
                  name="specialization"
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-success focus:ring-2 focus:ring-success/20"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">القسم</label>
                <select
                  name="department_id"
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-success focus:ring-2 focus:ring-success/20"
                >
                  <option value="">— اختر القسم —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {role === "academic_management" && (
          <div className="rounded-xl border border-purple/20 bg-purple/5 p-4 space-y-4">
            <p className="text-xs font-semibold text-purple">بيانات الإدارة الأكاديمية</p>
            <div className="rounded-lg border border-purple/30 bg-purple/5 px-3 py-2 text-xs text-purple">
              سيتمكن هذا المستخدم فقط من الوصول إلى بيانات القسم المُعيَّن له
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">رقم الموظف</label>
                <input
                  type="text"
                  name="employee_id"
                  dir="ltr"
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-purple focus:ring-2 focus:ring-purple/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">الدور المخصص</label>
                {customRoles.length > 0 ? (
                  <select
                    name="custom_role_id"
                    className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-purple focus:ring-2 focus:ring-purple/20"
                  >
                    <option value="">— اختر الدور —</option>
                    {customRoles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full rounded-xl border border-dashed border-border bg-card-bg px-3 py-2.5 text-sm text-text-secondary text-center">
                    لا توجد أدوار مخصصة — يمكنك إنشاؤها من صفحة الأدوار
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                  القسم المُدار
                  <span className="mr-1 text-danger">*</span>
                </label>
                <select
                  name="am_department_id"
                  required
                  className="w-full rounded-xl border border-purple/40 bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-purple focus:ring-2 focus:ring-purple/20"
                >
                  <option value="">— اختر القسم —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-text-secondary">سيُقيَّد وصول المستخدم على هذا القسم فقط</p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
        >
          {loading ? "جاري الإنشاء..." : "إنشاء المستخدم"}
        </button>
      </form>
    </Modal>
  );
}

function BulkImportModal({
  fileRef,
  loading,
  error,
  importResult,
  onClose,
  onUpload,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  loading: boolean;
  error: string;
  importResult: { success: number; errors: string[] } | null;
  onClose: () => void;
  onUpload: () => void;
}) {
  return (
    <Modal title="استيراد مستخدمين من CSV" subtitle="رفع ملف CSV يحتوي على بيانات المستخدمين" onClose={onClose} error={error} wide>
      <div className="space-y-4">
        <div className="rounded-xl bg-app-bg p-4 text-sm">
          <p className="mb-2 font-semibold text-text-primary">الأعمدة المطلوبة:</p>
          <code className="text-xs text-text-secondary" dir="ltr">
            email, first_name, last_name, role
          </code>
          <p className="mt-3 mb-2 font-semibold text-text-primary">الأعمدة الاختيارية:</p>
          <code className="text-xs text-text-secondary" dir="ltr">
            student_number, employee_id, major_id, department_id, enrollment_year, specialization, national_id, phone, gender
          </code>
          <p className="mt-3 text-xs text-text-secondary">
            القيم المسموحة لـ <code className="bg-card-bg px-1 rounded">role</code>: student, faculty, academic_management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="flex-1 rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary file:ml-3 file:rounded-lg file:border-0 file:bg-action-blue/20 file:px-3 file:py-1 file:text-sm file:font-medium file:text-action-blue"
          />
          <button
            onClick={onUpload}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-action-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {loading ? "جاري الاستيراد..." : "استيراد"}
          </button>
        </div>

        {importResult && (
          <div className="rounded-xl border border-border bg-card-bg p-4">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="font-semibold text-text-primary">
                تم استيراد {importResult.success} مستخدم بنجاح
              </span>
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 flex items-center gap-2 text-sm text-danger">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{importResult.errors.length} أخطاء:</span>
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg bg-danger/5 p-3">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-danger">{err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-dashed border-border bg-app-bg p-4">
          <h4 className="mb-2 font-semibold text-text-primary">مثال على ملف CSV</h4>
          <pre className="overflow-x-auto rounded-lg bg-card-bg p-3 text-xs text-text-secondary" dir="ltr">{`email,first_name,last_name,role,student_number,enrollment_year
ahmed@example.com,أحمد,محمد,student,STD001,2025
sara@example.com,سارة,علي,student,STD002,2025
prof@example.com,خالد,عبدالله,faculty,,`}</pre>
        </div>
      </div>
    </Modal>
  );
}

function AddRoleModal({
  departments,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  departments: DeptOption[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <Modal title="دور مخصص جديد" onClose={onClose} error={error}>
      <form action={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">اسم الدور</label>
          <input
            type="text"
            name="name"
            required
            placeholder="مثال: عميد كلية"
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-purple focus:bg-card-bg focus:ring-2 focus:ring-purple/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">الوصف (اختياري)</label>
          <textarea
            name="description"
            rows={2}
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-purple focus:bg-card-bg focus:ring-2 focus:ring-purple/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">النطاق (اختياري)</label>
          <select
            name="scope"
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-purple focus:bg-card-bg focus:ring-2 focus:ring-purple/20"
          >
            <option value="">— بدون نطاق —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} {d.code ? `(${d.code})` : ""}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-purple py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple/90 disabled:opacity-50"
        >
          {loading ? "جاري الإنشاء..." : "إنشاء الدور"}
        </button>
      </form>
    </Modal>
  );
}

function AssignRoleModal({
  roleId,
  roleName,
  users,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  roleId: string;
  roleName: string;
  users: UserRow[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  function handleSubmit(fd: FormData) {
    fd.set("custom_role_id", roleId);
    onSubmit(fd);
  }

  return (
    <Modal title="تعيين دور" subtitle={`تعيين "${roleName}" لمستخدم`} onClose={onClose} error={error}>
      <form action={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">المستخدم</label>
          <select
            name="profile_id"
            required
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-purple focus:bg-card-bg focus:ring-2 focus:ring-purple/20"
          >
            <option value="">— اختر المستخدم —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({ROLE_LABELS[u.role]})
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-purple py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple/90 disabled:opacity-50"
        >
          {loading ? "جاري التعيين..." : "تعيين الدور"}
        </button>
      </form>
    </Modal>
  );
}

/* ─── View User Modal ─────────────────────────────────────── */
function ViewUserModal({
  user,
  onClose,
  onEdit,
}: {
  user: UserRow;
  onClose: () => void;
  onEdit: () => void;
}) {
  const status = STATUS_LABELS[user.account_status] || STATUS_LABELS.active;
  const majorLink = user.student_majors?.[0]?.majors;
  const deptLink = user.faculty_departments?.[0]?.departments;
  const amDept = user.academic_management_departments?.[0]?.departments;
  const studentP = user.student_profiles?.[0];
  const facultyP = user.faculty_profiles?.[0];
  const croles = user.profile_custom_roles ?? [];

  const avatarBgMap: Record<string, string> = {
    student: "bg-action-blue",
    faculty: "bg-success",
    academic_management: "bg-purple",
    tenant_admin: "bg-academic-navy",
  };
  const avatarBg = avatarBgMap[user.role] ?? "bg-academic-navy";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-card-bg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-academic-navy to-academic-navy/80 px-6 pt-6 pb-14">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-xs text-white/60 mb-1">ملف المستخدم</p>
          <h2 className="text-xl font-bold text-white">{user.first_name} {user.last_name}</h2>
        </div>

        {/* Avatar */}
        <div className="px-6">
          <div className="relative -mt-10 mb-4 flex items-end gap-4">
            <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${avatarBg} text-2xl font-bold text-white shadow-lg border-4 border-card-bg`}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div className="pb-1 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>
                {status.label}
              </span>
              {croles.map((cr) => cr.custom_roles && (
                <span key={cr.custom_role_id} className="rounded-full bg-purple/10 px-3 py-1 text-xs font-semibold text-purple">
                  {cr.custom_roles.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="px-6 pb-2 space-y-3 max-h-[45vh] overflow-y-auto">
          <div className="rounded-xl bg-app-bg p-4 space-y-2.5">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-3">معلومات الاتصال</p>
            <ViewRow icon={<Mail className="h-4 w-4" />} label="البريد الإلكتروني" value={user.email || "\u2014"} ltr />
            <ViewRow icon={<Phone className="h-4 w-4" />} label="الهاتف" value={user.phone || "\u2014"} ltr />
            <ViewRow icon={<Hash className="h-4 w-4" />} label="الهوية الوطنية" value={user.national_id || "\u2014"} ltr />
            <ViewRow icon={<Calendar className="h-4 w-4" />} label="تاريخ الإنشاء" value={new Date(user.created_at).toLocaleDateString("ar-SA")} />
          </div>

          {(studentP || majorLink) && (
            <div className="rounded-xl border border-action-blue/20 bg-action-blue/5 p-4 space-y-2.5">
              <p className="text-[10px] font-bold text-action-blue uppercase tracking-wider mb-3">بيانات الطالب</p>
              {studentP?.student_number && <ViewRow icon={<Hash className="h-4 w-4" />} label="رقم الطالب" value={studentP.student_number} ltr />}
              {studentP?.enrollment_year && <ViewRow icon={<Calendar className="h-4 w-4" />} label="سنة الالتحاق" value={String(studentP.enrollment_year)} />}
              {majorLink && <ViewRow icon={<BookOpen className="h-4 w-4" />} label="التخصص" value={`${majorLink.name}${majorLink.code ? ` (${majorLink.code})` : ""}`} />}
            </div>
          )}

          {(facultyP || deptLink || amDept) && (
            <div className="rounded-xl border border-success/20 bg-success/5 p-4 space-y-2.5">
              <p className="text-[10px] font-bold text-success uppercase tracking-wider mb-3">
                {user.role === "academic_management" ? "بيانات الإدارة" : "بيانات المحاضر"}
              </p>
              {facultyP?.employee_id && <ViewRow icon={<Hash className="h-4 w-4" />} label="رقم الموظف" value={facultyP.employee_id} ltr />}
              {facultyP?.specialization && <ViewRow icon={<BookOpen className="h-4 w-4" />} label="التخصص" value={facultyP.specialization} />}
              {deptLink && <ViewRow icon={<Building2 className="h-4 w-4" />} label="القسم" value={deptLink.name} />}
              {amDept && <ViewRow icon={<Building2 className="h-4 w-4" />} label="القسم المُدار" value={amDept.name} />}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-5 py-2 text-sm font-medium text-text-secondary hover:bg-app-bg transition-colors"
          >
            إغلاق
          </button>
          {user.role !== "tenant_admin" && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 rounded-xl bg-action-blue px-5 py-2 text-sm font-semibold text-white hover:bg-action-blue/90 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              تعديل البيانات
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewRow({ icon, label, value, ltr }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-text-secondary mt-0.5 flex-shrink-0">{icon}</span>
      <span className="text-xs text-text-secondary w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm font-medium text-text-primary flex-1 break-all ${ltr ? "text-left" : ""}`} dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </div>
  );
}

/* ─── Edit User Modal ─────────────────────────────────────── */
function EditUserModal({
  user,
  departments,
  customRoles,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  user: UserRow;
  departments: DeptOption[];
  customRoles: CustomRoleRow[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const studentP = user.student_profiles?.[0];
  const facultyP = user.faculty_profiles?.[0];
  const currentDeptId = user.faculty_departments?.[0]?.department_id ?? "";
  const currentAmDeptId = user.academic_management_departments?.[0]?.department_id ?? "";
  const currentCustomRoleId = user.profile_custom_roles?.[0]?.custom_role_id ?? "";

  const inputCls = "w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20";
  const selectCls = "w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20";
  const labelCls = "mb-1.5 block text-xs font-semibold text-text-primary";

  return (
    <Modal
      title="تعديل بيانات المستخدم"
      subtitle={`${user.first_name} ${user.last_name} — ${ROLE_LABELS[user.role] || user.role}`}
      onClose={onClose}
      error={error}
      wide
    >
      <form action={onSubmit} className="space-y-5" autoComplete="off">
        <input type="hidden" name="role" value={user.role} />

        {/* ── الاسم ─────────────────────────── */}
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">البيانات الأساسية</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>الاسم الأول</label>
              <input type="text" name="first_name" defaultValue={user.first_name} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>الاسم الأخير</label>
              <input type="text" name="last_name" defaultValue={user.last_name} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>الهاتف (اختياري)</label>
              <input type="tel" name="phone" defaultValue={user.phone ?? ""} dir="ltr" className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── بيانات الدخول ─────────────────── */}
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-warning">بيانات الدخول</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                defaultValue={user.email ?? ""}
                dir="ltr"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-warning focus:ring-2 focus:ring-warning/20"
              />
              <p className="mt-1 text-[10px] text-text-secondary">عدّل البريد إذا أردت تغييره، واتركه كما هو إذا لم ترد التغيير</p>
            </div>
            <div>
              <label className={labelCls}>
                كلمة المرور
                <span className="mr-2 text-[10px] font-normal text-text-secondary">(اختياري — للتغيير فقط)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="اترك فارغاً للإبقاء على كلمة المرور الحالية"
                  minLength={6}
                  dir="ltr"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-border bg-card-bg py-2.5 pl-3 pr-10 text-sm text-text-primary outline-none transition-colors focus:border-warning focus:ring-2 focus:ring-warning/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-secondary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-[10px] text-text-secondary">
                <span>🔒</span>
                <span>كلمة المرور مُشفَّرة ولا يمكن عرضها — اكتب كلمة مرور جديدة فقط إذا أردت تغييرها</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── طالب ──────────────────────────── */}
        {user.role === "student" && (
          <div className="rounded-xl border border-action-blue/20 bg-action-blue/5 p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-action-blue">بيانات الطالب</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>رقم الطالب</label>
                <input type="text" name="student_number" defaultValue={studentP?.student_number ?? ""} dir="ltr"
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20" />
              </div>
              <div>
                <label className={labelCls}>سنة الالتحاق</label>
                <input type="number" name="enrollment_year" defaultValue={studentP?.enrollment_year ?? new Date().getFullYear()}
                  min="2000" max="2100" dir="ltr"
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20" />
              </div>
            </div>
          </div>
        )}

        {/* ── محاضر ─────────────────────────── */}
        {user.role === "faculty" && (
          <div className="rounded-xl border border-success/20 bg-success/5 p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-success">بيانات المحاضر</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>رقم الموظف</label>
                <input type="text" name="employee_id" defaultValue={facultyP?.employee_id ?? ""} dir="ltr"
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-success focus:ring-2 focus:ring-success/20" />
              </div>
              <div>
                <label className={labelCls}>التخصص العلمي</label>
                <input type="text" name="specialization" defaultValue={facultyP?.specialization ?? ""}
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-success focus:ring-2 focus:ring-success/20" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>القسم</label>
                <select name="department_id" defaultValue={currentDeptId}
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-success focus:ring-2 focus:ring-success/20">
                  <option value="">— بدون قسم —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} {d.code ? `(${d.code})` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── الإدارة الأكاديمية ────────────── */}
        {user.role === "academic_management" && (
          <div className="rounded-xl border border-purple/20 bg-purple/5 p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple">بيانات الإدارة الأكاديمية</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>رقم الموظف</label>
                <input type="text" name="employee_id" defaultValue={facultyP?.employee_id ?? ""} dir="ltr"
                  className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-purple focus:ring-2 focus:ring-purple/20" />
              </div>
              <div>
                <label className={labelCls}>الدور المخصص</label>
                {customRoles.length > 0 ? (
                  <select name="am_custom_role_id" defaultValue={currentCustomRoleId}
                    className="w-full rounded-xl border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-purple focus:ring-2 focus:ring-purple/20">
                    <option value="">— بدون دور —</option>
                    {customRoles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full rounded-xl border border-dashed border-border bg-card-bg px-3 py-2.5 text-sm text-text-secondary text-center">
                    لا توجد أدوار مخصصة متاحة
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  القسم المُدار
                  <span className="mr-1 text-danger">*</span>
                </label>
                <select name="am_department_id" defaultValue={currentAmDeptId}
                  className="w-full rounded-xl border border-purple/40 bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-purple focus:ring-2 focus:ring-purple/20">
                  <option value="">— اختر القسم —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} {d.code ? `(${d.code})` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-text-secondary hover:bg-app-bg transition-colors">
            إلغاء
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white hover:bg-action-blue/90 disabled:opacity-50 transition-colors">
            {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
