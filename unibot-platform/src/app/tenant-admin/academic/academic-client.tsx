"use client";

import { useState } from "react";
import {
  createCollege,
  updateCollege,
  deleteCollege,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createMajor,
  updateMajor,
  deleteMajor,
  createLevel,
  updateLevel,
  deleteLevel,
} from "./actions";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  Pencil,
  Trash2,
  Building2,
  FolderTree,
  GraduationCap,
  Layers,
  X,
} from "lucide-react";

interface FacultyOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface LevelNode {
  id: string;
  major_id: string;
  level_number: number;
  name: string | null;
}

interface MajorNode {
  id: string;
  department_id: string;
  name: string;
  code: string | null;
  total_credits: number;
  duration_years: number;
  academic_levels: LevelNode[];
}

interface DeptNode {
  id: string;
  college_id: string;
  name: string;
  code: string | null;
  head_id: string | null;
  majors: MajorNode[];
}

interface CollegeNode {
  id: string;
  name: string;
  code: string | null;
  dean_id: string | null;
  departments: DeptNode[];
}

export function AcademicClient({
  initialColleges,
  faculty,
}: {
  initialColleges: CollegeNode[];
  faculty: FacultyOption[];
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  async function handleAction(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
      setShowForm(null);
      setEditId(null);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(
    type: string,
    id: string,
    deleteFn: (id: string) => Promise<void>
  ) {
    if (!confirm(`هل أنت متأكد من حذف هذا ${type}؟`)) return;
    await handleAction(() => deleteFn(id));
  }

  function facultyName(id: string | null) {
    if (!id) return null;
    const f = faculty.find((x) => x.id === id);
    return f ? `${f.first_name} ${f.last_name}` : null;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm("college")}
          className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          إضافة كلية
        </button>
      </div>

      {showForm === "college" && (
        <FormCard title="كلية جديدة" onClose={() => setShowForm(null)}>
          <form
            action={(fd) => handleAction(() => createCollege(fd))}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Input label="اسم الكلية" name="name" required />
            <Input label="كود الكلية" name="code" placeholder="ENG" dir="ltr" />
            <FacultySelect label="العميد (اختياري)" name="dean_id" faculty={faculty} />
            <div className="sm:col-span-2">
              <SubmitBtn loading={loading} label="إنشاء الكلية" />
            </div>
          </form>
        </FormCard>
      )}

      {initialColleges.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لا توجد كليات بعد</p>
          <button
            onClick={() => setShowForm("college")}
            className="mt-3 text-sm font-medium text-action-blue hover:underline"
          >
            إنشاء أول كلية
          </button>
        </div>
      )}

      <div className="space-y-2">
        {initialColleges.map((college) => (
          <div key={college.id} className="rounded-2xl border border-border bg-card-bg shadow-sm">
            <div
              className="flex cursor-pointer items-center justify-between p-4"
              onClick={() => toggle(`c-${college.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-academic-navy/10">
                  <Building2 className="h-5 w-5 text-academic-navy" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-text-primary">{college.name}</h3>
                    {college.code && (
                      <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                        {college.code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    {facultyName(college.dean_id) && (
                      <span>العميد: {facultyName(college.dean_id)}</span>
                    )}
                    <span>{college.departments.length} أقسام</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditId(`college-${college.id}`); }}
                  className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete("الكلية", college.id, deleteCollege); }}
                  className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {expanded[`c-${college.id}`] ? (
                  <ChevronDown className="h-5 w-5 text-text-secondary" />
                ) : (
                  <ChevronLeft className="h-5 w-5 text-text-secondary" />
                )}
              </div>
            </div>

            {editId === `college-${college.id}` && (
              <div className="border-t border-border p-4">
                <form
                  action={(fd) => handleAction(() => updateCollege(college.id, fd))}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <Input label="اسم الكلية" name="name" required defaultValue={college.name} />
                  <Input label="كود الكلية" name="code" defaultValue={college.code || ""} dir="ltr" />
                  <FacultySelect label="العميد" name="dean_id" faculty={faculty} defaultValue={college.dean_id || ""} />
                  <div className="flex gap-2 sm:col-span-2">
                    <SubmitBtn loading={loading} label="تحديث" />
                    <button type="button" onClick={() => setEditId(null)} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-app-bg">إلغاء</button>
                  </div>
                </form>
              </div>
            )}

            {expanded[`c-${college.id}`] && (
              <div className="border-t border-border p-4 pr-8">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text-primary">الأقسام</h4>
                  <button
                    onClick={() => setShowForm(`dept-${college.id}`)}
                    className="flex items-center gap-1 rounded-lg border border-action-blue/30 px-3 py-1.5 text-xs font-medium text-action-blue hover:bg-action-blue/5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    قسم جديد
                  </button>
                </div>

                {showForm === `dept-${college.id}` && (
                  <FormCard title="قسم جديد" onClose={() => setShowForm(null)} nested>
                    <form
                      action={(fd) => {
                        const data = new FormData();
                        data.append("college_id", college.id);
                        fd.forEach((v, k) => data.append(k, v));
                        handleAction(() => createDepartment(data));
                      }}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <Input label="اسم القسم" name="name" required />
                      <Input label="كود القسم" name="code" placeholder="CS" dir="ltr" />
                      <FacultySelect label="رئيس القسم (اختياري)" name="head_id" faculty={faculty} />
                      <div className="sm:col-span-2">
                        <SubmitBtn loading={loading} label="إنشاء القسم" />
                      </div>
                    </form>
                  </FormCard>
                )}

                {college.departments.length === 0 && showForm !== `dept-${college.id}` && (
                  <p className="py-4 text-center text-xs text-text-secondary">لا توجد أقسام</p>
                )}

                <div className="space-y-2">
                  {college.departments.map((dept) => (
                    <div key={dept.id} className="rounded-xl border border-border bg-app-bg">
                      <div
                        className="flex cursor-pointer items-center justify-between p-3"
                        onClick={() => toggle(`d-${dept.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-action-blue/10">
                            <FolderTree className="h-4 w-4 text-action-blue" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-text-primary">{dept.name}</span>
                              {dept.code && <span className="rounded-full bg-card-bg px-2 py-0.5 text-xs text-text-secondary">{dept.code}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              {facultyName(dept.head_id) && <span>الرئيس: {facultyName(dept.head_id)}</span>}
                              <span>{dept.majors.length} تخصصات</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditId(`dept-${dept.id}`); }} className="rounded-lg p-1 text-text-secondary hover:bg-card-bg"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete("القسم", dept.id, deleteDepartment); }} className="rounded-lg p-1 text-text-secondary hover:bg-danger/10 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                          {expanded[`d-${dept.id}`] ? <ChevronDown className="h-4 w-4 text-text-secondary" /> : <ChevronLeft className="h-4 w-4 text-text-secondary" />}
                        </div>
                      </div>

                      {editId === `dept-${dept.id}` && (
                        <div className="border-t border-border p-3">
                          <form action={(fd) => handleAction(() => updateDepartment(dept.id, fd))} className="grid gap-3 sm:grid-cols-2">
                            <Input label="اسم القسم" name="name" required defaultValue={dept.name} />
                            <Input label="كود القسم" name="code" defaultValue={dept.code || ""} dir="ltr" />
                            <FacultySelect label="رئيس القسم" name="head_id" faculty={faculty} defaultValue={dept.head_id || ""} />
                            <div className="flex gap-2 sm:col-span-2">
                              <SubmitBtn loading={loading} label="تحديث" />
                              <button type="button" onClick={() => setEditId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-card-bg">إلغاء</button>
                            </div>
                          </form>
                        </div>
                      )}

                      {expanded[`d-${dept.id}`] && (
                        <div className="border-t border-border p-3 pr-6">
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-xs font-bold text-text-primary">التخصصات</h5>
                            <button onClick={() => setShowForm(`major-${dept.id}`)} className="flex items-center gap-1 rounded-lg border border-success/30 px-2.5 py-1 text-xs font-medium text-success hover:bg-success/5">
                              <Plus className="h-3 w-3" />تخصص
                            </button>
                          </div>

                          {showForm === `major-${dept.id}` && (
                            <FormCard title="تخصص جديد" onClose={() => setShowForm(null)} nested>
                              <form action={(fd) => { const d = new FormData(); d.append("department_id", dept.id); fd.forEach((v, k) => d.append(k, v)); handleAction(() => createMajor(d)); }} className="grid gap-3 sm:grid-cols-2">
                                <Input label="اسم التخصص" name="name" required />
                                <Input label="كود التخصص" name="code" placeholder="CS" dir="ltr" />
                                <Input label="الساعات المطلوبة" name="total_credits" type="number" defaultValue="120" required />
                                <Input label="مدة الدراسة (سنوات)" name="duration_years" type="number" defaultValue="4" required />
                                <div className="sm:col-span-2"><SubmitBtn loading={loading} label="إنشاء التخصص" /></div>
                              </form>
                            </FormCard>
                          )}

                          {dept.majors.length === 0 && showForm !== `major-${dept.id}` && (
                            <p className="py-3 text-center text-xs text-text-secondary">لا توجد تخصصات</p>
                          )}

                          <div className="space-y-2">
                            {dept.majors.map((major) => (
                              <div key={major.id} className="rounded-lg border border-border bg-card-bg">
                                <div className="flex cursor-pointer items-center justify-between p-3" onClick={() => toggle(`m-${major.id}`)}>
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10">
                                      <GraduationCap className="h-3.5 w-3.5 text-success" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-text-primary">{major.name}</span>
                                        {major.code && <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">{major.code}</span>}
                                      </div>
                                      <span className="text-xs text-text-secondary">{major.total_credits} ساعة — {major.duration_years} سنوات — {major.academic_levels.length} مستويات</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setEditId(`major-${major.id}`); }} className="rounded-lg p-1 text-text-secondary hover:bg-app-bg"><Pencil className="h-3.5 w-3.5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete("التخصص", major.id, deleteMajor); }} className="rounded-lg p-1 text-text-secondary hover:bg-danger/10 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                                    {expanded[`m-${major.id}`] ? <ChevronDown className="h-4 w-4 text-text-secondary" /> : <ChevronLeft className="h-4 w-4 text-text-secondary" />}
                                  </div>
                                </div>

                                {editId === `major-${major.id}` && (
                                  <div className="border-t border-border p-3">
                                    <form action={(fd) => handleAction(() => updateMajor(major.id, fd))} className="grid gap-3 sm:grid-cols-2">
                                      <Input label="اسم التخصص" name="name" required defaultValue={major.name} />
                                      <Input label="كود التخصص" name="code" defaultValue={major.code || ""} dir="ltr" />
                                      <Input label="الساعات المطلوبة" name="total_credits" type="number" defaultValue={String(major.total_credits)} required />
                                      <Input label="مدة الدراسة" name="duration_years" type="number" defaultValue={String(major.duration_years)} required />
                                      <div className="flex gap-2 sm:col-span-2">
                                        <SubmitBtn loading={loading} label="تحديث" />
                                        <button type="button" onClick={() => setEditId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-card-bg">إلغاء</button>
                                      </div>
                                    </form>
                                  </div>
                                )}

                                {expanded[`m-${major.id}`] && (
                                  <div className="border-t border-border p-3 pr-6">
                                    <div className="mb-2 flex items-center justify-between">
                                      <h6 className="text-xs font-bold text-text-primary">المستويات الدراسية</h6>
                                      <button onClick={() => setShowForm(`level-${major.id}`)} className="flex items-center gap-1 rounded-lg border border-purple/30 px-2.5 py-1 text-xs font-medium text-purple hover:bg-purple/5">
                                        <Plus className="h-3 w-3" />مستوى
                                      </button>
                                    </div>

                                    {showForm === `level-${major.id}` && (
                                      <FormCard title="مستوى جديد" onClose={() => setShowForm(null)} nested>
                                        <form action={(fd) => { const d = new FormData(); d.append("major_id", major.id); fd.forEach((v, k) => d.append(k, v)); handleAction(() => createLevel(d)); }} className="grid gap-3 sm:grid-cols-2">
                                          <Input label="رقم المستوى" name="level_number" type="number" required placeholder="1" />
                                          <Input label="اسم المستوى (اختياري)" name="name" placeholder="المستوى الأول" />
                                          <div className="sm:col-span-2"><SubmitBtn loading={loading} label="إنشاء المستوى" /></div>
                                        </form>
                                      </FormCard>
                                    )}

                                    {major.academic_levels.length === 0 && showForm !== `level-${major.id}` && (
                                      <p className="py-2 text-center text-xs text-text-secondary">لا توجد مستويات</p>
                                    )}

                                    <div className="space-y-1">
                                      {[...major.academic_levels]
                                        .sort((a, b) => a.level_number - b.level_number)
                                        .map((level) => (
                                          <div key={level.id} className="flex items-center justify-between rounded-lg border border-border bg-app-bg p-2.5">
                                            <div className="flex items-center gap-2">
                                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple/10">
                                                <Layers className="h-3 w-3 text-purple" />
                                              </div>
                                              <span className="text-sm text-text-primary">
                                                المستوى {level.level_number}
                                                {level.name && ` — ${level.name}`}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <button onClick={() => setEditId(`level-${level.id}`)} className="rounded p-1 text-text-secondary hover:bg-card-bg"><Pencil className="h-3 w-3" /></button>
                                              <button onClick={() => handleDelete("المستوى", level.id, deleteLevel)} className="rounded p-1 text-text-secondary hover:bg-danger/10 hover:text-danger"><Trash2 className="h-3 w-3" /></button>
                                            </div>
                                          </div>
                                        ))}
                                    </div>

                                    {editId?.startsWith("level-") && major.academic_levels.find((l) => editId === `level-${l.id}`) && (() => {
                                      const level = major.academic_levels.find((l) => editId === `level-${l.id}`)!;
                                      return (
                                        <div className="mt-2 rounded-lg border border-border bg-card-bg p-3">
                                          <form action={(fd) => handleAction(() => updateLevel(level.id, fd))} className="grid gap-3 sm:grid-cols-2">
                                            <Input label="رقم المستوى" name="level_number" type="number" required defaultValue={String(level.level_number)} />
                                            <Input label="اسم المستوى" name="name" defaultValue={level.name || ""} />
                                            <div className="flex gap-2 sm:col-span-2">
                                              <SubmitBtn loading={loading} label="تحديث" />
                                              <button type="button" onClick={() => setEditId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-card-bg">إلغاء</button>
                                            </div>
                                          </form>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FormCard({
  title,
  onClose,
  children,
  nested,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  nested?: boolean;
}) {
  return (
    <div className={`mb-3 rounded-xl border border-border ${nested ? "bg-card-bg" : "bg-card-bg shadow-sm"} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`font-bold text-text-primary ${nested ? "text-sm" : "text-lg"}`}>{title}</h3>
        <button onClick={onClose} className="rounded-lg p-1 text-text-secondary hover:bg-app-bg">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  dir,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  dir?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-primary">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        dir={dir}
        className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
      />
    </div>
  );
}

function FacultySelect({
  label,
  name,
  faculty,
  defaultValue,
}: {
  label: string;
  name: string;
  faculty: FacultyOption[];
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-primary">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue || ""}
        className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
      >
        <option value="">-- بدون --</option>
        {faculty.map((f) => (
          <option key={f.id} value={f.id}>
            {f.first_name} {f.last_name}
          </option>
        ))}
      </select>
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
    >
      {loading ? "جاري الحفظ..." : label}
    </button>
  );
}
