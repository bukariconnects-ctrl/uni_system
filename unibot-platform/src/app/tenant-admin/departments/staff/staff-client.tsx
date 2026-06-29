"use client";

import { useState, useCallback, useEffect } from "react";
import {
  addStaffMember,
  removeStaffMember,
  toggleStaffStatus,
  getDepartmentStaff,
} from "./actions";
import {
  Users,
  X,
  Plus,
  UserPlus,
  UserMinus,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Building2,
  Shield,
  Search,
} from "lucide-react";

const ROLE_OPTIONS = [
  { value: "head_of_department", label: "رئيس قسم", color: "purple" },
  { value: "secretary", label: "سكرتير", color: "success" },
  { value: "ticket_technician", label: "فني دعم", color: "warning" },
];

const ROLE_STYLES: Record<string, string> = {
  head_of_department: "bg-purple/20 text-purple border-purple/30",
  secretary: "bg-success/10 text-success border-success/30",
  ticket_technician: "bg-warning/10 text-warning border-warning/30",
};

const ROLE_LABELS: Record<string, string> = {
  head_of_department: "رئيس قسم",
  secretary: "سكرتير",
  ticket_technician: "فني دعم",
};

interface StaffProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

interface StaffMember {
  id: string;
  role: string;
  is_active: boolean;
  assigned_at: string;
  profiles: StaffProfile;
}

interface DeptData {
  id: string;
  name: string;
  code: string | null;
  colleges: { name: string; code: string | null } | { name: string; code: string | null }[];
}

interface Props {
  departments: DeptData[];
  initialStaffByDept: Record<string, StaffMember[]>;
}

export function DepartmentsStaffClient({ departments, initialStaffByDept }: Props) {
  const [selectedDept, setSelectedDept] = useState<DeptData | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectDepartment = useCallback(async (dept: DeptData) => {
    setSelectedDept(dept);
    setError("");
    setSuccess("");
    setShowAddForm(false);
    // Load staff for this department
    setLoading(true);
    try {
      const data = await getDepartmentStaff(dept.id);
      setStaff(data as unknown as StaffMember[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleAdd(formData: FormData) {
    if (!selectedDept) return;
    formData.set("department_id", selectedDept.id);
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await addStaffMember(formData);
      setSuccess("تمت إضافة الموظف بنجاح");
      setShowAddForm(false);
      const data = await getDepartmentStaff(selectedDept.id);
      setStaff(data as unknown as StaffMember[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string) {
    setLoading(true);
    setError("");
    try {
      await removeStaffMember(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      setSuccess("تمت إزالة الموظف بنجاح");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    setError("");
    setSuccess("");
    try {
      await toggleStaffStatus(id, !currentActive);
      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !currentActive } : s))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* ── Department List Panel ── */}
      <div className="w-80 shrink-0 rounded-2xl border border-border bg-card-bg shadow-sm flex flex-col">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-bold text-text-primary">الأقسام</h2>
          <div className="relative mt-2">
            <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-app-bg py-2 pr-9 pl-3 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredDepts.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">لا توجد أقسام</p>
          ) : (
            filteredDepts.map((dept) => {
              const collegeName = Array.isArray(dept.colleges)
                ? dept.colleges[0]?.name
                : dept.colleges?.name;
              const isSelected = selectedDept?.id === dept.id;
              const staffCount = initialStaffByDept[dept.id]?.length ?? 0;

              return (
                <button
                  key={dept.id}
                  onClick={() => selectDepartment(dept)}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-right transition-colors ${
                    isSelected
                      ? "bg-action-blue/10 text-action-blue ring-1 ring-action-blue/30"
                      : "text-text-primary hover:bg-app-bg"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{dept.name}</p>
                    <p className="text-xs text-text-secondary truncate">{collegeName || ""}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      staffCount > 0
                        ? "bg-action-blue/20 text-action-blue"
                        : "bg-app-bg text-text-secondary"
                    }`}>
                      {staffCount}
                    </span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "rotate-180" : ""}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Staff Management Panel ── */}
      <div className="flex-1 rounded-2xl border border-border bg-card-bg shadow-sm flex flex-col">
        {!selectedDept ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Building2 className="mb-3 h-10 w-10 text-text-secondary" />
            <p className="text-base font-semibold text-text-primary">اختر قسمًا</p>
            <p className="mt-1 text-sm text-text-secondary">اختر قسمًا من القائمة لإدارة موظفيه</p>
          </div>
        ) : loading && staff.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-action-blue" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{selectedDept.name}</h2>
                  <p className="text-sm text-text-secondary">
                    {Array.isArray(selectedDept.colleges)
                      ? selectedDept.colleges[0]?.name
                      : selectedDept.colleges?.name}{" "}
                    — {staff.length} موظف
                  </p>
                </div>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 rounded-xl bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة موظف
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Notifications */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {success}
                </div>
              )}

              {/* Add Form */}
              {showAddForm && (
                <AvailableProfilesForm
                  departmentId={selectedDept.id}
                  onAdd={handleAdd}
                  onCancel={() => setShowAddForm(false)}
                  loading={loading}
                />
              )}

              {/* Staff List */}
              {staff.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="mb-2 h-8 w-8 text-text-secondary" />
                  <p className="text-sm font-semibold text-text-primary">لا يوجد موظفون في هذا القسم</p>
                  <p className="text-xs text-text-secondary">أضف رئيس قسم، سكرتير، أو فني دعم</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {staff.map((member) => {
                    const profile = member.profiles;
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                          member.is_active
                            ? "border-border bg-card-bg"
                            : "border-border/50 bg-app-bg/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {profile?.first_name} {profile?.last_name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[member.role] || "bg-gray/10"}`}>
                                {ROLE_LABELS[member.role] || member.role}
                              </span>
                              {member.is_active ? (
                                <span className="flex items-center gap-1 text-xs text-text-secondary">
                                  <CheckCircle className="h-3 w-3 text-success" />
                                  نشط
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-text-secondary">
                                  <XCircle className="h-3 w-3 text-danger" />
                                  غير نشط
                                </span>
                              )}
                              <span className="text-xs text-text-secondary">
                                {profile?.email}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggle(member.id, member.is_active)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              member.is_active
                                ? "bg-warning/10 text-warning hover:bg-warning/20"
                                : "bg-success/10 text-success hover:bg-success/20"
                            }`}
                          >
                            {member.is_active ? "تعطيل" : "تفعيل"}
                          </button>
                          <button
                            onClick={() => handleRemove(member.id)}
                            className="rounded-lg p-1.5 text-danger transition-colors hover:bg-danger/10"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Available Profiles Form (sub-component) ─── */

function AvailableProfilesForm({
  departmentId,
  onAdd,
  onCancel,
  loading,
}: {
  departmentId: string;
  onAdd: (fd: FormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  // Load profiles on mount
  useEffect(() => {
    (async () => {
      try {
        const { getAvailableProfiles } = await import("./actions");
        const data = await getAvailableProfiles(departmentId);
        setProfiles(data as any[]);
      } catch {
        // silent
      } finally {
        setProfilesLoading(false);
      }
    })();
  }, [departmentId]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onAdd(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-app-bg p-4 space-y-3">
      <p className="text-xs font-semibold text-text-primary">إضافة موظف جديد</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">المستخدم</label>
          <select
            name="profile_id"
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-card-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
          >
            <option value="">— اختر مستخدم —</option>
            {profilesLoading ? (
              <option disabled>جاري التحميل...</option>
            ) : (
              profiles.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.email || p.role})
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">الدور</label>
          <select
            name="role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-card-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
          >
            <option value="">— اختر الدور —</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !selectedProfileId || !selectedRole}
          className="flex-1 rounded-xl bg-action-blue py-2 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
        >
          {loading ? "جاري الإضافة..." : "إضافة"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-4 py-2 text-sm text-text-secondary hover:bg-app-bg"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
