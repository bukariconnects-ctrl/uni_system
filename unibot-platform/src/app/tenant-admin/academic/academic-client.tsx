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

interface CampusOption {
  id: string;
  name: string;
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
  campus_id: string | null;
  absence_threshold: number | null;
  campuses: { name: string }[] | null;
  departments: DeptNode[];
}

type ModalState =
  | { type: "add-college" }
  | { type: "edit-college"; college: CollegeNode }
  | { type: "add-dept"; collegeId: string }
  | { type: "edit-dept"; dept: DeptNode }
  | { type: "add-major"; deptId: string }
  | { type: "edit-major"; major: MajorNode }
  | { type: "add-level"; majorId: string }
  | { type: "edit-level"; level: LevelNode }
  | null;

export function AcademicClient({
  initialColleges,
  faculty,
  campuses,
}: {
  initialColleges: CollegeNode[];
  faculty: FacultyOption[];
  campuses: CampusOption[];
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const closeModal = () => {
    setModal(null);
    setError("");
  };

  async function run(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
      closeModal();
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(label: string, id: string, fn: (id: string) => Promise<void>) {
    if (!confirm(`هل أنت متأكد من حذف هذا ${label}؟`)) return;
    await run(() => fn(id));
  }

  const resolveName = (id: string | null) => {
    if (!id) return null;
    const f = faculty.find((x) => x.id === id);
    return f ? `${f.first_name} ${f.last_name}` : null;
  };

  const totalDepts = initialColleges.reduce((a, c) => a + c.departments.length, 0);
  const totalMajors = initialColleges.reduce(
    (a, c) => a + c.departments.reduce((b, d) => b + d.majors.length, 0),
    0
  );

  function modalTitle(): string {
    if (!modal) return "";
    const titles: Record<string, string> = {
      "add-college": "إضافة كلية جديدة",
      "edit-college": "تعديل بيانات الكلية",
      "add-dept": "إضافة قسم جديد",
      "edit-dept": "تعديل بيانات القسم",
      "add-major": "إضافة تخصص / برنامج",
      "edit-major": "تعديل بيانات التخصص",
      "add-level": "إضافة مستوى دراسي",
      "edit-level": "تعديل المستوى الدراسي",
    };
    return titles[modal.type] ?? "";
  }

  return (
    <div className="space-y-5">
      {/* Stats bar + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatBadge icon={<Building2 className="h-4 w-4" />} label="كليات" count={initialColleges.length} color="navy" />
          <StatBadge icon={<FolderTree className="h-4 w-4" />} label="أقسام" count={totalDepts} color="blue" />
          <StatBadge icon={<GraduationCap className="h-4 w-4" />} label="تخصصات" count={totalMajors} color="green" />
        </div>
        <button
          onClick={() => setModal({ type: "add-college" })}
          className="flex items-center gap-2 rounded-xl bg-action-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          إضافة كلية
        </button>
      </div>

      {/* Empty state */}
      {initialColleges.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-academic-navy/10">
            <Building2 className="h-8 w-8 text-academic-navy" />
          </div>
          <p className="text-base font-semibold text-text-primary">لا توجد كليات بعد</p>
          <p className="mt-1 text-sm text-text-secondary">ابدأ ببناء الهيكل التنظيمي لجامعتك</p>
          <button
            onClick={() => setModal({ type: "add-college" })}
            className="mt-5 flex items-center gap-2 rounded-xl bg-action-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
          >
            <Plus className="h-4 w-4" />
            إضافة أول كلية
          </button>
        </div>
      )}

      {/* College list */}
      <div className="space-y-3">
        {initialColleges.map((college) => {
          const isOpen = expanded[`c-${college.id}`];
          const collegeMajors = college.departments.reduce((a, d) => a + d.majors.length, 0);
          return (
            <div key={college.id} className="overflow-hidden rounded-2xl border border-border bg-card-bg shadow-sm">
              {/* ── College row ── */}
              <div className="flex items-center gap-3 border-r-4 border-r-academic-navy p-4">
                <button
                  onClick={() => toggle(`c-${college.id}`)}
                  className="flex flex-1 items-center gap-3 text-right"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-academic-navy/10">
                    <Building2 className="h-5 w-5 text-academic-navy" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-text-primary">{college.name}</h3>
                      {college.code && (
                        <span className="rounded-full bg-academic-navy/10 px-2 py-0.5 text-xs font-medium text-academic-navy">
                          {college.code}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-text-secondary">
                      {resolveName(college.dean_id) && <span>العميد: {resolveName(college.dean_id)}</span>}
                      {college.campuses && college.campuses[0]?.name && (
                        <span>الفرع: {college.campuses[0].name}</span>
                      )}
                      {college.absence_threshold != null && (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">
                          غياب {college.absence_threshold}%
                        </span>
                      )}
                      <span>{college.departments.length} أقسام</span>
                      <span>{collegeMajors} تخصصات</span>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-text-secondary" />
                  ) : (
                    <ChevronLeft className="h-5 w-5 flex-shrink-0 text-text-secondary" />
                  )}
                </button>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => setModal({ type: "edit-college", college })}
                    className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-app-bg hover:text-action-blue"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete("الكلية", college.id, deleteCollege)}
                    className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ── Departments panel ── */}
              {isOpen && (
                <div className="border-t border-border bg-app-bg p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-text-primary">الأقسام الأكاديمية</h4>
                    <button
                      onClick={() => setModal({ type: "add-dept", collegeId: college.id })}
                      className="flex items-center gap-1.5 rounded-lg border border-action-blue/30 bg-action-blue/5 px-3 py-1.5 text-xs font-medium text-action-blue transition-colors hover:bg-action-blue/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      قسم جديد
                    </button>
                  </div>

                  {college.departments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border py-8 text-center">
                      <FolderTree className="mx-auto mb-2 h-8 w-8 text-text-secondary/30" />
                      <p className="text-xs text-text-secondary">لا توجد أقسام. أضف قسماً للبدء.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {college.departments.map((dept) => {
                        const isDeptOpen = expanded[`d-${dept.id}`];
                        return (
                          <div key={dept.id} className="overflow-hidden rounded-xl border border-border bg-card-bg">
                            {/* ── Dept row ── */}
                            <div className="flex items-center gap-3 border-r-4 border-r-action-blue p-3">
                              <button
                                onClick={() => toggle(`d-${dept.id}`)}
                                className="flex flex-1 items-center gap-3 text-right"
                              >
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-action-blue/10">
                                  <FolderTree className="h-4 w-4 text-action-blue" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-bold text-text-primary">{dept.name}</span>
                                    {dept.code && (
                                      <span className="rounded-full bg-action-blue/10 px-2 py-0.5 text-xs font-medium text-action-blue">
                                        {dept.code}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                                    {resolveName(dept.head_id) && <span>رئيس القسم: {resolveName(dept.head_id)}</span>}
                                    <span>{dept.majors.length} تخصصات</span>
                                  </div>
                                </div>
                                {isDeptOpen ? (
                                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-text-secondary" />
                                ) : (
                                  <ChevronLeft className="h-4 w-4 flex-shrink-0 text-text-secondary" />
                                )}
                              </button>
                              <div className="flex flex-shrink-0 items-center gap-1">
                                <button
                                  onClick={() => setModal({ type: "edit-dept", dept })}
                                  className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg hover:text-action-blue"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete("القسم", dept.id, deleteDepartment)}
                                  className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* ── Majors panel ── */}
                            {isDeptOpen && (
                              <div className="border-t border-border bg-app-bg p-3">
                                <div className="mb-2 flex items-center justify-between">
                                  <h5 className="text-xs font-bold text-text-primary">التخصصات والبرامج</h5>
                                  <button
                                    onClick={() => setModal({ type: "add-major", deptId: dept.id })}
                                    className="flex items-center gap-1 rounded-lg border border-success/30 bg-success/5 px-2.5 py-1 text-xs font-medium text-success transition-colors hover:bg-success/10"
                                  >
                                    <Plus className="h-3 w-3" />
                                    تخصص
                                  </button>
                                </div>

                                {dept.majors.length === 0 ? (
                                  <p className="py-4 text-center text-xs text-text-secondary">لا توجد تخصصات لهذا القسم</p>
                                ) : (
                                  <div className="space-y-2">
                                    {dept.majors.map((major) => {
                                      const isMajorOpen = expanded[`m-${major.id}`];
                                      return (
                                        <div key={major.id} className="overflow-hidden rounded-lg border border-border bg-card-bg">
                                          {/* ── Major row ── */}
                                          <div className="flex items-center gap-2 border-r-4 border-r-success p-2.5">
                                            <button
                                              onClick={() => toggle(`m-${major.id}`)}
                                              className="flex flex-1 items-center gap-2 text-right"
                                            >
                                              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-success/10">
                                                <GraduationCap className="h-3.5 w-3.5 text-success" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="text-sm font-medium text-text-primary">{major.name}</span>
                                                  {major.code && (
                                                    <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-xs text-success">
                                                      {major.code}
                                                    </span>
                                                  )}
                                                </div>
                                                <span className="text-xs text-text-secondary">
                                                  {major.total_credits} ساعة • {major.duration_years} سنوات • {major.academic_levels.length} مستويات
                                                </span>
                                              </div>
                                              {isMajorOpen ? (
                                                <ChevronDown className="h-4 w-4 flex-shrink-0 text-text-secondary" />
                                              ) : (
                                                <ChevronLeft className="h-4 w-4 flex-shrink-0 text-text-secondary" />
                                              )}
                                            </button>
                                            <div className="flex flex-shrink-0 items-center gap-1">
                                              <button
                                                onClick={() => setModal({ type: "edit-major", major })}
                                                className="rounded p-1 text-text-secondary transition-colors hover:bg-app-bg hover:text-action-blue"
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </button>
                                              <button
                                                onClick={() => handleDelete("التخصص", major.id, deleteMajor)}
                                                className="rounded p-1 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* ── Levels panel ── */}
                                          {isMajorOpen && (
                                            <div className="border-t border-border bg-app-bg p-3">
                                              <div className="mb-2 flex items-center justify-between">
                                                <h6 className="text-xs font-bold text-text-primary">المستويات الدراسية</h6>
                                                <button
                                                  onClick={() => setModal({ type: "add-level", majorId: major.id })}
                                                  className="flex items-center gap-1 rounded-lg border border-purple/30 bg-purple/5 px-2.5 py-1 text-xs font-medium text-purple transition-colors hover:bg-purple/10"
                                                >
                                                  <Plus className="h-3 w-3" />
                                                  مستوى
                                                </button>
                                              </div>
                                              {major.academic_levels.length === 0 ? (
                                                <p className="py-2 text-center text-xs text-text-secondary">لا توجد مستويات</p>
                                              ) : (
                                                <div className="flex flex-wrap gap-2">
                                                  {[...major.academic_levels]
                                                    .sort((a, b) => a.level_number - b.level_number)
                                                    .map((level) => (
                                                      <div
                                                        key={level.id}
                                                        className="group flex items-center gap-1.5 rounded-lg border border-purple/20 bg-purple/5 px-2.5 py-1.5"
                                                      >
                                                        <Layers className="h-3 w-3 text-purple" />
                                                        <span className="text-xs font-medium text-purple">
                                                          المستوى {level.level_number}
                                                          {level.name && ` — ${level.name}`}
                                                        </span>
                                                        <span className="hidden items-center gap-0.5 group-hover:flex">
                                                          <button
                                                            onClick={() => setModal({ type: "edit-level", level })}
                                                            className="rounded p-0.5 text-purple/60 transition-colors hover:text-purple"
                                                          >
                                                            <Pencil className="h-2.5 w-2.5" />
                                                          </button>
                                                          <button
                                                            onClick={() => handleDelete("المستوى", level.id, deleteLevel)}
                                                            className="rounded p-0.5 text-danger/60 transition-colors hover:text-danger"
                                                          >
                                                            <Trash2 className="h-2.5 w-2.5" />
                                                          </button>
                                                        </span>
                                                      </div>
                                                    ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <Modal title={modalTitle()} onClose={closeModal} error={error}>
          {modal.type === "add-college" && (
            <CollegeForm faculty={faculty} campuses={campuses} loading={loading} onSubmit={(fd) => run(() => createCollege(fd))} />
          )}
          {modal.type === "edit-college" && (
            <CollegeForm faculty={faculty} campuses={campuses} loading={loading} defaults={modal.college} onSubmit={(fd) => run(() => updateCollege(modal.college.id, fd))} />
          )}
          {modal.type === "add-dept" && (
            <DeptForm faculty={faculty} loading={loading} collegeId={modal.collegeId} onSubmit={(fd) => run(() => createDepartment(fd))} />
          )}
          {modal.type === "edit-dept" && (
            <DeptForm faculty={faculty} loading={loading} defaults={modal.dept} onSubmit={(fd) => run(() => updateDepartment(modal.dept.id, fd))} />
          )}
          {modal.type === "add-major" && (
            <MajorForm loading={loading} deptId={modal.deptId} onSubmit={(fd) => run(() => createMajor(fd))} />
          )}
          {modal.type === "edit-major" && (
            <MajorForm loading={loading} defaults={modal.major} onSubmit={(fd) => run(() => updateMajor(modal.major.id, fd))} />
          )}
          {modal.type === "add-level" && (
            <LevelForm loading={loading} majorId={modal.majorId} onSubmit={(fd) => run(() => createLevel(fd))} />
          )}
          {modal.type === "edit-level" && (
            <LevelForm loading={loading} defaults={modal.level} onSubmit={(fd) => run(() => updateLevel(modal.level.id, fd))} />
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── Stat Badge ───────────────────────────────────────────────────────────────

function StatBadge({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: "navy" | "blue" | "green" }) {
  const colors = {
    navy: "bg-academic-navy/10 text-academic-navy",
    blue: "bg-action-blue/10 text-action-blue",
    green: "bg-success/10 text-success",
  };
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${colors[color]}`}>
      {icon}
      <span className="text-base font-bold">{count}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, error, children }: { title: string; onClose: () => void; error: string; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-card-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg">
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

// ─── College Form ─────────────────────────────────────────────────────────────

function CollegeForm({ faculty, campuses, loading, defaults, onSubmit }: { faculty: FacultyOption[]; campuses: CampusOption[]; loading: boolean; defaults?: CollegeNode; onSubmit: (fd: FormData) => void }) {
  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Input label="اسم الكلية" name="name" required defaultValue={defaults?.name} />
      <Input label="كود الكلية" name="code" placeholder="ENG" dir="ltr" defaultValue={defaults?.code ?? ""} />
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-text-primary">الفرع (اختياري)</label>
        <select
          name="campus_id"
          defaultValue={defaults?.campus_id ?? ""}
          className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
        >
          <option value="">— بدون فرع —</option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <Input label="نسبة الغياب % (اختياري)" name="absence_threshold" type="number" placeholder="25" defaultValue={defaults?.absence_threshold != null ? String(defaults.absence_threshold) : ""} />
      <div className="sm:col-span-2">
        <FacultySelect label="العميد (اختياري)" name="dean_id" faculty={faculty} defaultValue={defaults?.dean_id ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <SubmitBtn loading={loading} label={defaults ? "تحديث الكلية" : "إنشاء الكلية"} />
      </div>
    </form>
  );
}

// ─── Department Form ──────────────────────────────────────────────────────────

function DeptForm({ faculty, loading, collegeId, defaults, onSubmit }: { faculty: FacultyOption[]; loading: boolean; collegeId?: string; defaults?: DeptNode; onSubmit: (fd: FormData) => void }) {
  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {collegeId && <input type="hidden" name="college_id" value={collegeId} />}
      <Input label="اسم القسم" name="name" required defaultValue={defaults?.name} />
      <Input label="كود القسم" name="code" placeholder="CS" dir="ltr" defaultValue={defaults?.code ?? ""} />
      <div className="sm:col-span-2">
        <FacultySelect label="رئيس القسم (اختياري)" name="head_id" faculty={faculty} defaultValue={defaults?.head_id ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <SubmitBtn loading={loading} label={defaults ? "تحديث القسم" : "إنشاء القسم"} />
      </div>
    </form>
  );
}

// ─── Major Form ───────────────────────────────────────────────────────────────

function MajorForm({ loading, deptId, defaults, onSubmit }: { loading: boolean; deptId?: string; defaults?: MajorNode; onSubmit: (fd: FormData) => void }) {
  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {deptId && <input type="hidden" name="department_id" value={deptId} />}
      <Input label="اسم التخصص / البرنامج" name="name" required defaultValue={defaults?.name} />
      <Input label="كود التخصص" name="code" placeholder="SE" dir="ltr" defaultValue={defaults?.code ?? ""} />
      <Input label="إجمالي الساعات" name="total_credits" type="number" required defaultValue={String(defaults?.total_credits ?? 120)} />
      <Input label="مدة الدراسة (سنوات)" name="duration_years" type="number" required defaultValue={String(defaults?.duration_years ?? 4)} />
      <div className="sm:col-span-2">
        <SubmitBtn loading={loading} label={defaults ? "تحديث التخصص" : "إنشاء التخصص"} />
      </div>
    </form>
  );
}

// ─── Level Form ───────────────────────────────────────────────────────────────

function LevelForm({ loading, majorId, defaults, onSubmit }: { loading: boolean; majorId?: string; defaults?: LevelNode; onSubmit: (fd: FormData) => void }) {
  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {majorId && <input type="hidden" name="major_id" value={majorId} />}
      <Input label="رقم المستوى" name="level_number" type="number" required placeholder="1" defaultValue={defaults ? String(defaults.level_number) : ""} />
      <Input label="اسم المستوى (اختياري)" name="name" placeholder="المستوى الأول" defaultValue={defaults?.name ?? ""} />
      <div className="sm:col-span-2">
        <SubmitBtn loading={loading} label={defaults ? "تحديث المستوى" : "إضافة المستوى"} />
      </div>
    </form>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Input({ label, name, type = "text", required, defaultValue, placeholder, dir }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string; dir?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-text-primary">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        dir={dir}
        className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
      />
    </div>
  );
}

function FacultySelect({ label, name, faculty, defaultValue }: { label: string; name: string; faculty: FacultyOption[]; defaultValue?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-text-primary">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
      >
        <option value="">— بدون —</option>
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
      className="w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
    >
      {loading ? "جاري الحفظ..." : label}
    </button>
  );
}
