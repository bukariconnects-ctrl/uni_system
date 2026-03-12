"use client";

import { useState, useRef } from "react";
import {
  bulkImportUsers,
  updateUserStatus,
  createCustomRole,
  deleteCustomRole,
  assignCustomRole,
  removeCustomRoleAssignment,
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
} from "lucide-react";

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  account_status: string;
  created_at: string;
  student_profiles: { student_number: string } | null;
  faculty_profiles: { employee_id: string | null } | null;
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

interface DeptOption {
  id: string;
  name: string;
  code: string | null;
}

interface MajorOption {
  id: string;
  name: string;
  code: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  student: "طالب",
  faculty: "محاضر",
  academic_management: "إدارة أكاديمية",
  tenant_admin: "مدير جامعة",
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
}: {
  initialUsers: UserRow[];
  customRoles: CustomRoleRow[];
  majors: MajorOption[];
  departments: DeptOption[];
}) {
  const [tab, setTab] = useState<"list" | "import" | "roles">("list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAction(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
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

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        setError("الملف فارغ أو لا يحتوي على بيانات صالحة");
        setLoading(false);
        return;
      }

      const result = await bulkImportUsers(rows as never);
      setImportResult(result);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ أثناء الاستيراد");
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { key: "list" as const, label: "قائمة المستخدمين", icon: Users },
    { key: "import" as const, label: "استيراد CSV", icon: Upload },
    { key: "roles" as const, label: "الأدوار المخصصة", icon: Shield },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex gap-1 rounded-xl bg-app-bg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setError(""); setImportResult(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-card-bg border border-border p-3">
            <span className="text-sm text-text-secondary">{initialUsers.length} مستخدم</span>
          </div>

          {initialUsers.map((user) => {
            const status = STATUS_LABELS[user.account_status] || STATUS_LABELS.active;
            return (
              <div key={user.id} className="flex items-center justify-between rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">{user.first_name} {user.last_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${status.color}`}>{status.label}</span>
                      <span className="rounded-full bg-action-blue/10 px-2 py-0.5 text-xs text-action-blue">
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      {user.student_profiles?.student_number && (
                        <span>رقم الطالب: {user.student_profiles.student_number}</span>
                      )}
                      {user.faculty_profiles?.employee_id && (
                        <span>رقم الموظف: {user.faculty_profiles.employee_id}</span>
                      )}
                      <span>{new Date(user.created_at).toLocaleDateString("ar-SA")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {user.account_status === "active" && user.role !== "tenant_admin" && (
                    <button
                      onClick={() => handleAction(() => updateUserStatus(user.id, "suspended"))}
                      className="rounded-lg p-1.5 text-text-secondary hover:bg-warning/10 hover:text-warning"
                      title="تعليق"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  )}
                  {user.account_status === "suspended" && (
                    <button
                      onClick={() => handleAction(() => updateUserStatus(user.id, "active"))}
                      className="rounded-lg p-1.5 text-text-secondary hover:bg-success/10 hover:text-success"
                      title="إعادة تفعيل"
                    >
                      <UserCheck className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {initialUsers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا يوجد مستخدمون بعد</p>
            </div>
          )}
        </div>
      )}

      {tab === "import" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue/10">
                <FileSpreadsheet className="h-5 w-5 text-action-blue" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary">استيراد مستخدمين من ملف CSV</h3>
                <p className="text-sm text-text-secondary">رفع ملف CSV يحتوي على بيانات الطلاب أو المحاضرين</p>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-app-bg p-4 text-sm">
              <p className="mb-2 font-medium text-text-primary">الأعمدة المطلوبة:</p>
              <code className="text-xs text-text-secondary" dir="ltr">
                email, first_name, last_name, role
              </code>
              <p className="mt-2 font-medium text-text-primary">الأعمدة الاختيارية:</p>
              <code className="text-xs text-text-secondary" dir="ltr">
                student_number, employee_id, major_id, department_id, enrollment_year, specialization, national_id, phone, gender
              </code>
              <p className="mt-2 text-xs text-text-secondary">
                القيم المسموحة لـ role: student, faculty, academic_management
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="flex-1 rounded-lg border border-border bg-card-bg px-3 py-2 text-sm text-text-primary file:ml-3 file:rounded-lg file:border-0 file:bg-action-blue/10 file:px-3 file:py-1 file:text-sm file:text-action-blue"
              />
              <button
                onClick={handleCsvUpload}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {loading ? "جاري الاستيراد..." : "استيراد"}
              </button>
            </div>
          </div>

          {importResult && (
            <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-bold text-text-primary">
                  تم استيراد {importResult.success} مستخدم بنجاح
                </span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-danger">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">{importResult.errors.length} أخطاء:</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg bg-danger/5 p-3">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-danger">{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-border bg-card-bg p-6">
            <h4 className="mb-3 font-bold text-text-primary">مثال على ملف CSV</h4>
            <pre className="overflow-x-auto rounded-lg bg-app-bg p-4 text-xs text-text-secondary" dir="ltr">{`email,first_name,last_name,role,student_number,enrollment_year
ahmed@example.com,أحمد,محمد,student,STD001,2025
sara@example.com,سارة,علي,student,STD002,2025
prof@example.com,خالد,عبدالله,faculty,,`}</pre>
          </div>
        </div>
      )}

      {tab === "roles" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowRoleForm(!showRoleForm)}
              className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90"
            >
              <Plus className="h-4 w-4" />
              دور مخصص جديد
            </button>
          </div>

          {showRoleForm && (
            <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-primary">دور مخصص جديد</h3>
                <button onClick={() => setShowRoleForm(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><X className="h-5 w-5" /></button>
              </div>
              <form action={(fd) => handleAction(async () => { await createCustomRole(fd); setShowRoleForm(false); })} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">اسم الدور</label>
                  <input type="text" name="name" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" placeholder="عميد كلية" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">النطاق (اختياري)</label>
                  <input type="text" name="scope" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" placeholder="college:CS" dir="ltr" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-text-primary">الوصف</label>
                  <textarea name="description" rows={2} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-text-primary">الصلاحيات (JSON)</label>
                  <textarea name="permissions" rows={2} defaultValue="{}" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
                </div>
                <div className="sm:col-span-2">
                  <button type="submit" disabled={loading} className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
                    {loading ? "جاري الإنشاء..." : "إنشاء الدور"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {customRoles.length === 0 && !showRoleForm && (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد أدوار مخصصة بعد</p>
            </div>
          )}

          {customRoles.map((role) => (
            <div key={role.id} className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple/10">
                    <Shield className="h-5 w-5 text-purple" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">{role.name}</span>
                      {role.scope && <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary" dir="ltr">{role.scope}</span>}
                    </div>
                    {role.description && <p className="text-sm text-text-secondary">{role.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowAssignForm(showAssignForm === role.id ? null : role.id)} className="rounded-lg border border-action-blue/30 px-3 py-1.5 text-xs font-medium text-action-blue hover:bg-action-blue/5">
                    <Plus className="inline h-3 w-3" /> تعيين
                  </button>
                  <button
                    onClick={() => { if (confirm("حذف هذا الدور؟")) handleAction(() => deleteCustomRole(role.id)); }}
                    className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {showAssignForm === role.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <form action={(fd) => { fd.append("custom_role_id", role.id); handleAction(() => assignCustomRole(fd)); }} className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-text-primary">المستخدم</label>
                      <select name="profile_id" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                        <option value="">-- اختر --</option>
                        {initialUsers.filter((u) => u.role !== "tenant_admin").map((u) => (
                          <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({ROLE_LABELS[u.role]})</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" disabled={loading} className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
                      تعيين
                    </button>
                  </form>
                </div>
              )}

              {role.profile_custom_roles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  {role.profile_custom_roles.map((pcr) => (
                    <span key={pcr.profile_id} className="flex items-center gap-1.5 rounded-full bg-app-bg px-3 py-1 text-xs">
                      <span className="text-text-primary">{pcr.profiles?.first_name} {pcr.profiles?.last_name}</span>
                      <button
                        onClick={() => handleAction(() => removeCustomRoleAssignment(pcr.profile_id, role.id))}
                        className="text-text-secondary hover:text-danger"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
