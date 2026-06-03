"use client";

import { useState } from "react";
import {
  createSection,
  createLabSection,
  updateSectionStatus,
  updateSectionInstructor,
  mergeSection,
} from "./actions";
import {
  Plus,
  X,
  BookCopy,
  Lock,
  Unlock,
  Archive,
  Merge,
  UserPlus,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  FlaskConical,
} from "lucide-react";

interface SectionRow {
  id: string;
  section_code: string;
  status: string;
  max_capacity: number;
  enrolled_count: number;
  instructor_id: string | null;
  course_id: string;
  semester_id: string;
  merged_into_id: string | null;
  section_type: string | null;
  parent_section_id: string | null;
  courses: { code: string; name: string; credit_hours: number } | null;
  semesters: { name: string; status: string } | null;
  profiles: { first_name: string; last_name: string } | null;
}

interface CourseOption { id: string; code: string; name: string }
interface SemesterOption { id: string; name: string; status: string }
interface FacultyOption { id: string; first_name: string; last_name: string }

type ModalState =
  | { type: "add" }
  | { type: "add-lab"; parentSectionId: string; parentCourseId: string; parentSemesterId: string }
  | { type: "assign"; sectionId: string }
  | { type: "merge"; sectionId: string; courseId: string }
  | null;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "مفتوحة", color: "text-success", bg: "bg-success/10" },
  closed: { label: "مغلقة", color: "text-danger", bg: "bg-danger/10" },
  archived: { label: "مؤرشفة", color: "text-text-secondary", bg: "bg-text-secondary/10" },
  merged: { label: "مدمجة", color: "text-warning", bg: "bg-warning/10" },
};

export function SectionsClient({
  initialSections,
  courses,
  semesters,
  faculty,
}: {
  initialSections: SectionRow[];
  courses: CourseOption[];
  semesters: SemesterOption[];
  faculty: FacultyOption[];
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");

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

  const SECTION_TYPE_LABELS: Record<string, string> = {
    lecture: "نظري",
    lab: "معمل",
    tutorial: "تطبيقي",
  };

  // Separate parent sections (no parent_section_id) and child lab sections
  const parentSections = initialSections.filter((s) => !s.parent_section_id);
  const childSections = initialSections.filter((s) => !!s.parent_section_id);
  const childrenByParent = childSections.reduce<Record<string, SectionRow[]>>((acc, s) => {
    if (!acc[s.parent_section_id!]) acc[s.parent_section_id!] = [];
    acc[s.parent_section_id!].push(s);
    return acc;
  }, {});

  const filteredSections = parentSections.filter((s) => {
    const matchesSearch =
      s.courses?.code?.toLowerCase().includes(search.toLowerCase()) ||
      s.courses?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.section_code?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const groupedByCourse = filteredSections.reduce<Record<string, { course: CourseOption; sections: SectionRow[] }>>((acc, section) => {  // eslint-disable-line
    const courseId = section.course_id;
    if (!acc[courseId]) {
      const course = courses.find((c) => c.id === courseId);
      acc[courseId] = {
        course: course || { id: courseId, code: "???", name: "مقرر غير معروف" },
        sections: [],
      };
    }
    acc[courseId].sections.push(section);
    return acc;
  }, {});

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCourses(new Set(Object.keys(groupedByCourse)));
  };

  const collapseAll = () => {
    setExpandedCourses(new Set());
  };

  const totalSections = filteredSections.length;
  const openSections = filteredSections.filter((s) => s.status === "open").length;
  const totalEnrolled = filteredSections.reduce((sum, s) => sum + s.enrolled_count, 0);
  const totalCapacity = filteredSections.reduce((sum, s) => sum + s.max_capacity, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatBadge icon={<BookCopy className="h-4 w-4" />} label="شعبة" count={totalSections} color="blue" />
          <StatBadge icon={<Unlock className="h-4 w-4" />} label="مفتوحة" count={openSections} color="green" />
          <StatBadge icon={<Users className="h-4 w-4" />} label="طالب" count={`${totalEnrolled}/${totalCapacity}`} color="purple" />
        </div>
        <button
          onClick={() => setModal({ type: "add" })}
          className="flex items-center gap-2 rounded-xl bg-action-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          فتح شعبة جديدة
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="بحث بكود المقرر أو الاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card-bg py-2 pr-10 pl-4 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-app-bg p-1">
          {[
            { key: "all", label: "الكل" },
            { key: "open", label: "مفتوحة" },
            { key: "closed", label: "مغلقة" },
            { key: "archived", label: "مؤرشفة" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === f.key
                  ? "bg-card-bg text-action-blue shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={expandAll} className="rounded-lg bg-app-bg px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary">
            توسيع الكل
          </button>
          <button onClick={collapseAll} className="rounded-lg bg-app-bg px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary">
            طي الكل
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      {Object.keys(groupedByCourse).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-action-blue/20">
            <BookCopy className="h-7 w-7 text-action-blue" />
          </div>
          <p className="text-base font-semibold text-text-primary">
            {search ? "لا توجد نتائج" : "لا توجد شعب"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {search ? "جرب كلمات بحث مختلفة" : "ابدأ بفتح شعب جديدة للمقررات"}
          </p>
          {!search && (
            <button
              onClick={() => setModal({ type: "add" })}
              className="mt-5 flex items-center gap-2 rounded-xl bg-action-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
            >
              <Plus className="h-4 w-4" />
              فتح أول شعبة
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedByCourse).map(([courseId, { course, sections }]) => {
            const isExpanded = expandedCourses.has(courseId);
            const openCount = sections.filter((s) => s.status === "open").length;
            const totalEnrolledInCourse = sections.reduce((sum, s) => sum + s.enrolled_count, 0);
            const totalCapacityInCourse = sections.reduce((sum, s) => sum + s.max_capacity, 0);
            const fillPercent = totalCapacityInCourse > 0 ? Math.round((totalEnrolledInCourse / totalCapacityInCourse) * 100) : 0;

            return (
              <div key={courseId} className="overflow-hidden rounded-2xl border border-border bg-card-bg shadow-sm">
                <button
                  onClick={() => toggleCourse(courseId)}
                  className="flex w-full items-center justify-between px-5 py-4 text-right transition-colors hover:bg-app-bg/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-action-blue/20">
                      <BookCopy className="h-6 w-6 text-action-blue" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-text-primary">{course.code}</span>
                        <span className="text-sm text-text-secondary">—</span>
                        <span className="text-sm font-medium text-text-primary">{course.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
                        <span>{sections.length} شعبة</span>
                        <span className="text-success">{openCount} مفتوحة</span>
                        <span>
                          <span className={fillPercent > 80 ? "text-warning" : "text-text-secondary"}>
                            {totalEnrolledInCourse}/{totalCapacityInCourse}
                          </span>
                          {" "}طالب ({fillPercent}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-app-bg">
                      <div
                        className={`h-full rounded-full transition-all ${fillPercent > 80 ? "bg-warning" : "bg-success"}`}
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-text-secondary" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-text-secondary" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-app-bg/30 p-4">
                    <div className="space-y-3">
                      {sections.map((section) => {
                        const status = STATUS_MAP[section.status] || STATUS_MAP.open;
                        const fillPct = section.max_capacity > 0 ? Math.round((section.enrolled_count / section.max_capacity) * 100) : 0;
                        const isFull = fillPct >= 100;
                        const isNearFull = fillPct >= 80;

                        const sectionChildren = childrenByParent[section.id] || [];

                        return (
                          <div key={section.id} className="space-y-2">
                          <div
                            className={`rounded-xl border bg-card-bg p-4 shadow-sm transition-all ${
                              section.status === "open" ? "border-success/30" : "border-border"
                            }`}
                          >
                            <div className="mb-3 flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <span className="rounded-lg bg-academic-navy px-2 py-1 text-sm font-bold text-white" dir="ltr">
                                  {section.section_code}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.color}`}>
                                  {status.label}
                                </span>
                                {section.section_type && section.section_type !== "lecture" && (
                                  <span className="rounded-full bg-purple/10 px-2 py-0.5 text-xs font-medium text-purple">
                                    {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
                                  </span>
                                )}
                              </div>
                              <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                isFull ? "bg-danger/10 text-danger" : isNearFull ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                              }`}>
                                <Users className="h-3 w-3" />
                                {section.enrolled_count}/{section.max_capacity}
                              </div>
                            </div>

                            <div className="mb-3 space-y-1 text-xs text-text-secondary">
                              <p>
                                <span className="font-medium text-text-primary">الفصل:</span>{" "}
                                {section.semesters?.name || "—"}
                              </p>
                              <p>
                                <span className="font-medium text-text-primary">المحاضر:</span>{" "}
                                {section.profiles ? (
                                  `${section.profiles.first_name} ${section.profiles.last_name}`
                                ) : (
                                  <span className="text-warning">غير معيّن</span>
                                )}
                              </p>
                            </div>

                            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-app-bg">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isFull ? "bg-danger" : isNearFull ? "bg-warning" : "bg-success"
                                }`}
                                style={{ width: `${Math.min(fillPct, 100)}%` }}
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              {section.status === "open" && (
                                <>
                                  <button
                                    onClick={() => setModal({ type: "assign", sectionId: section.id })}
                                    className="flex-1 rounded-lg border border-action-blue/30 py-1.5 text-xs font-medium text-action-blue transition-colors hover:bg-action-blue/5"
                                    title="تعيين محاضر"
                                  >
                                    <UserPlus className="mx-auto h-4 w-4" />
                                  </button>
                                  {(!section.section_type || section.section_type === "lecture") && (
                                    <button
                                      onClick={() => setModal({ type: "add-lab", parentSectionId: section.id, parentCourseId: section.course_id, parentSemesterId: section.semester_id })}
                                      className="flex-1 rounded-lg border border-purple/30 py-1.5 text-xs font-medium text-purple transition-colors hover:bg-purple/5"
                                      title="إضافة شعبة معمل"
                                    >
                                      <FlaskConical className="mx-auto h-4 w-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => run(() => updateSectionStatus(section.id, "closed"))}
                                    className="flex-1 rounded-lg border border-danger/30 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/5"
                                    title="إغلاق الشعبة"
                                  >
                                    <Lock className="mx-auto h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setModal({ type: "merge", sectionId: section.id, courseId: section.course_id })}
                                    className="flex-1 rounded-lg border border-warning/30 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/5"
                                    title="دمج الشعبة"
                                  >
                                    <Merge className="mx-auto h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {section.status === "closed" && (
                                <>
                                  <button
                                    onClick={() => run(() => updateSectionStatus(section.id, "open"))}
                                    className="flex-1 rounded-lg border border-success/30 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/5"
                                  >
                                    <Unlock className="mx-auto h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => run(() => updateSectionStatus(section.id, "archived"))}
                                    className="flex-1 rounded-lg border border-text-secondary/30 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-text-secondary/5"
                                  >
                                    <Archive className="mx-auto h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {section.status === "archived" && (
                                <span className="w-full text-center text-xs text-text-secondary">مؤرشفة</span>
                              )}
                              {section.status === "merged" && (
                                <span className="w-full text-center text-xs text-warning">تم الدمج</span>
                              )}
                            </div>
                          </div>

                          {/* Child lab sections rendered indented below their parent */}
                          {sectionChildren.map((child) => {
                            const childStatus = STATUS_MAP[child.status] || STATUS_MAP.open;
                            const childFill = child.max_capacity > 0 ? Math.round((child.enrolled_count / child.max_capacity) * 100) : 0;
                            return (
                              <div key={child.id} className="mr-6 rounded-xl border border-purple/20 bg-purple/5 p-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4 text-purple" />
                                    <span className="rounded-lg bg-purple/20 px-2 py-0.5 text-xs font-bold text-purple" dir="ltr">
                                      {child.section_code}
                                    </span>
                                    <span className="rounded-full bg-purple/10 px-2 py-0.5 text-xs font-medium text-purple">
                                      {SECTION_TYPE_LABELS[child.section_type || "lab"] || "معمل"}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${childStatus.bg} ${childStatus.color}`}>
                                      {childStatus.label}
                                    </span>
                                  </div>
                                  <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                    childFill >= 100 ? "bg-danger/10 text-danger" : childFill >= 80 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                                  }`}>
                                    <Users className="h-3 w-3" />
                                    {child.enrolled_count}/{child.max_capacity}
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-text-secondary">
                                  {child.profiles ? `${child.profiles.first_name} ${child.profiles.last_name}` : <span className="text-warning">بدون محاضر</span>}
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal?.type === "add" && (
        <AddSectionModal
          courses={courses}
          semesters={semesters}
          faculty={faculty}
          loading={loading}
          error={error}
          onClose={closeModal}
          onSubmit={(fd) => run(() => createSection(fd))}
        />
      )}

      {modal?.type === "add-lab" && (
        <AddLabSectionModal
          parentSectionId={modal.parentSectionId}
          faculty={faculty}
          loading={loading}
          error={error}
          onClose={closeModal}
          onSubmit={(fd) => run(() => createLabSection(fd))}
        />
      )}

      {modal?.type === "assign" && (
        <AssignInstructorModal
          sectionId={modal.sectionId}
          faculty={faculty}
          loading={loading}
          error={error}
          onClose={closeModal}
          onSubmit={(instructorId) => run(() => updateSectionInstructor(modal.sectionId, instructorId))}
        />
      )}

      {modal?.type === "merge" && (
        <MergeSectionModal
          sectionId={modal.sectionId}
          courseId={modal.courseId}
          sections={initialSections}
          loading={loading}
          error={error}
          onClose={closeModal}
          onSubmit={(targetId) => run(() => mergeSection(modal.sectionId, targetId))}
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
  count: number | string;
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
  onClose,
  error,
  children,
}: {
  title: string;
  onClose: () => void;
  error: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-card-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
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

function AddLabSectionModal({
  parentSectionId,
  faculty,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  parentSectionId: string;
  faculty: FacultyOption[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <Modal title="إضافة شعبة معمل" onClose={onClose} error={error}>
      <form
        action={(fd) => {
          fd.append("parent_section_id", parentSectionId);
          onSubmit(fd);
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">كود الشعبة</label>
            <input
              type="text"
              name="section_code"
              required
              placeholder="L1"
              dir="ltr"
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-purple focus:bg-card-bg focus:ring-2 focus:ring-purple/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">السعة القصوى</label>
            <input
              type="number"
              name="max_capacity"
              defaultValue={20}
              min={1}
              dir="ltr"
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-purple focus:bg-card-bg focus:ring-2 focus:ring-purple/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">المحاضر (اختياري)</label>
          <select
            name="instructor_id"
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-purple focus:bg-card-bg focus:ring-2 focus:ring-purple/20"
          >
            <option value="">— بدون محاضر —</option>
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.first_name} {f.last_name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-purple py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple/90 disabled:opacity-50"
        >
          {loading ? "جاري الإنشاء..." : "إنشاء شعبة المعمل"}
        </button>
      </form>
    </Modal>
  );
}

function AddSectionModal({
  courses,
  semesters,
  faculty,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  courses: CourseOption[];
  semesters: SemesterOption[];
  faculty: FacultyOption[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <Modal title="فتح شعبة جديدة" onClose={onClose} error={error}>
      <form action={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">المقرر</label>
          <select
            name="course_id"
            required
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
          >
            <option value="">— اختر المقرر —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">الفصل الدراسي</label>
            <select
              name="semester_id"
              required
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
            >
              <option value="">— اختر —</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">كود الشعبة</label>
            <input
              type="text"
              name="section_code"
              required
              placeholder="A"
              dir="ltr"
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">المحاضر (اختياري)</label>
            <select
              name="instructor_id"
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
            >
              <option value="">— بدون محاضر —</option>
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.first_name} {f.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">السعة القصوى</label>
            <input
              type="number"
              name="max_capacity"
              defaultValue={40}
              min={1}
              dir="ltr"
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
        >
          {loading ? "جاري الفتح..." : "فتح الشعبة"}
        </button>
      </form>
    </Modal>
  );
}

function AssignInstructorModal({
  sectionId,
  faculty,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  sectionId: string;
  faculty: FacultyOption[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (instructorId: string) => void;
}) {
  const [selected, setSelected] = useState("");

  return (
    <Modal title="تعيين محاضر" onClose={onClose} error={error}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">اختر المحاضر</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
          >
            <option value="">— بدون محاضر —</option>
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.first_name} {f.last_name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => onSubmit(selected)}
          disabled={loading}
          className="w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
        >
          {loading ? "جاري التعيين..." : "تعيين المحاضر"}
        </button>
      </div>
    </Modal>
  );
}

function MergeSectionModal({
  sectionId,
  courseId,
  sections,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  sectionId: string;
  courseId: string;
  sections: SectionRow[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (targetId: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const targetSections = sections.filter(
    (s) => s.id !== sectionId && s.course_id === courseId && s.status === "open"
  );

  return (
    <Modal title="دمج الشعبة" onClose={onClose} error={error}>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          سيتم نقل جميع الطلاب المسجلين إلى الشعبة المستهدفة وإغلاق هذه الشعبة.
        </p>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">الشعبة المستهدفة</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-warning focus:bg-card-bg focus:ring-2 focus:ring-warning/20"
          >
            <option value="">— اختر الشعبة —</option>
            {targetSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.section_code} — {s.enrolled_count}/{s.max_capacity} طالب
              </option>
            ))}
          </select>
        </div>
        {targetSections.length === 0 && (
          <p className="text-sm text-warning">لا توجد شعب أخرى مفتوحة لنفس المقرر للدمج فيها.</p>
        )}
        <button
          onClick={() => {
            if (selected && confirm("هل أنت متأكد من دمج هذه الشعبة؟")) {
              onSubmit(selected);
            }
          }}
          disabled={loading || !selected}
          className="w-full rounded-xl bg-warning py-2.5 text-sm font-semibold text-white transition-colors hover:bg-warning/90 disabled:opacity-50"
        >
          {loading ? "جاري الدمج..." : "دمج الشعبة"}
        </button>
      </div>
    </Modal>
  );
}
