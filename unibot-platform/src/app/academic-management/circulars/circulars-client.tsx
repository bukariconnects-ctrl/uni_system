"use client";

import { useState } from "react";
import {
  createCircular,
  publishCircular,
  deleteCircular,
} from "./actions";
import {
  Plus,
  X,
  Megaphone,
  Eye,
  Trash2,
  AlertTriangle,
  Users,
  BookOpen,
  Layers,
  Building2,
  GraduationCap,
} from "lucide-react";

const TARGET_TYPES = [
  { value: "all", label: "الجميع", icon: "👥" },
  { value: "students", label: "الطلاب", icon: "🎓" },
  { value: "faculty", label: "أعضاء هيئة التدريس", icon: "👨‍🏫" },
  { value: "department", label: "قسم محدد", icon: "🏛️" },
  { value: "major", label: "تخصص محدد", icon: "📚" },
  { value: "level", label: "مستوى محدد", icon: "📊" },
  { value: "section", label: "مادة محددة", icon: "📋" },
];

interface CourseItem { id: string; label: string; }
interface Major { id: string; name: string; }
interface Level { id: string; name: string; level_number: number; major_id: string; }
interface Department { id: string; name: string; }

interface CircularsClientProps {
  circulars: any[];
  courses: CourseItem[];
  majors: Major[];
  levels: Level[];
  departments: Department[];
}

export function CircularsClient({
  circulars,
  courses,
  majors,
  levels,
  departments,
}: CircularsClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [selectedMajorId, setSelectedMajorId] = useState("");

  const filteredLevels = levels.filter((l) => l.major_id === selectedMajorId);

  async function handleAction(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
      setShowForm(false);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  function handleTargetTypeChange(val: string) {
    setTargetType(val);
    setSelectedMajorId("");
  }

  const needsSecondarySelect =
    targetType === "section" ||
    targetType === "major" ||
    targetType === "level" ||
    targetType === "department";

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          تعميم جديد
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">إنشاء تعميم</h3>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form
            action={(fd) => handleAction(() => createCircular(fd))}
            className="grid gap-4 sm:grid-cols-2"
          >
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-primary">العنوان</label>
              <input
                type="text"
                name="title"
                required
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
              />
            </div>

            {/* Body */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-primary">المحتوى</label>
              <textarea
                name="body"
                rows={4}
                required
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
              />
            </div>

            {/* Target Type */}
            <div className={needsSecondarySelect ? "" : "sm:col-span-2"}>
              <label className="mb-1 block text-xs font-medium text-text-primary">
                الفئة المستهدفة
              </label>
              <select
                name="target_type"
                value={targetType}
                onChange={(e) => handleTargetTypeChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
              >
                {TARGET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Secondary: Course dropdown (replaces old section dropdown) */}
            {targetType === "section" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-text-primary">
                  اختر المادة
                </label>
                <select
                  name="target_id"
                  required
                  className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                >
                  <option value="">-- اختر المادة --</option>
                  {courses.length === 0 && (
                    <option disabled>لا توجد مواد</option>
                  )}
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Secondary: Department dropdown */}
            {targetType === "department" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-text-primary">
                  اختر القسم
                </label>
                <select
                  name="target_id"
                  required
                  className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                >
                  <option value="">-- اختر القسم --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Secondary: Major dropdown → then Level dropdown */}
            {targetType === "major" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-text-primary">
                  اختر التخصص
                </label>
                <select
                  name="target_id"
                  required
                  onChange={(e) => setSelectedMajorId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                >
                  <option value="">-- اختر التخصص --</option>
                  {majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Level dropdown: shown when target_type = level */}
            {targetType === "level" && (
              <>
                {/* First pick a major to filter levels */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">
                    التخصص (لتحديد المستوى)
                  </label>
                  <select
                    onChange={(e) => setSelectedMajorId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                  >
                    <option value="">-- اختر التخصص أولاً --</option>
                    {majors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">
                    اختر المستوى
                  </label>
                  <select
                    name="target_id"
                    required
                    disabled={!selectedMajorId}
                    className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue disabled:opacity-50"
                  >
                    <option value="">
                      {selectedMajorId ? "-- اختر المستوى --" : "اختر التخصص أولاً"}
                    </option>
                    {filteredLevels.map((l) => (
                      <option key={l.id} value={l.id}>
                        المستوى {l.level_number} — {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Expiry */}
            <div className={targetType === "level" ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-xs font-medium text-text-primary">
                تاريخ الانتهاء (اختياري)
              </label>
              <input
                type="datetime-local"
                name="expires_at"
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                dir="ltr"
              />
            </div>

            {/* Mandatory checkbox */}
            <div className="flex items-center gap-2">
              <input type="hidden" name="is_mandatory" value="false" />
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  name="is_mandatory"
                  value="true"
                  className="h-4 w-4 rounded accent-danger"
                />
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-danger" />
                  تعميم إلزامي (يظهر كبانر علوي)
                </span>
              </label>
            </div>

            {/* Submit */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50"
              >
                {loading ? "جاري الإنشاء..." : "إنشاء التعميم"}
              </button>
            </div>
          </form>
        </div>
      )}

      {circulars.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لا توجد تعاميم بعد</p>
        </div>
      )}

      {circulars.map((circular: any) => {
        const targetLabel =
          TARGET_TYPES.find((t) => t.value === circular.target_type)?.label ||
          circular.target_type;
        const sender = circular.sender;
        const isFaculty = sender?.role === "faculty";
        const senderName = sender
          ? `${sender.first_name} ${sender.last_name}`
          : null;
        const senderLabel = isFaculty ? "المحاضر" : "الإدارة الأكاديمية";

        return (
          <div
            key={circular.id}
            className={`overflow-hidden rounded-2xl border bg-card-bg shadow-sm ${
              circular.is_mandatory && circular.is_published
                ? "border-danger/30"
                : "border-border"
            }`}
          >
            {/* Sender Header */}
            {senderName && (
              <div
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium ${
                  isFaculty
                    ? "bg-action-blue/8 text-action-blue border-b border-action-blue/15"
                    : "bg-success/8 text-success border-b border-success/15"
                }`}
              >
                {isFaculty ? (
                  <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>
                  {senderLabel}:{" "}
                  <span className="font-semibold">{senderName}</span>
                </span>
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      circular.is_mandatory ? "bg-danger/10" : "bg-action-blue/20"
                    }`}
                  >
                    {circular.is_mandatory ? (
                      <AlertTriangle className="h-5 w-5 text-danger" />
                    ) : (
                      <Megaphone className="h-5 w-5 text-action-blue" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-text-primary">{circular.title}</span>
                      {circular.is_published ? (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                          منشور
                        </span>
                      ) : (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">
                          مسودة
                        </span>
                      )}
                      {circular.is_mandatory && (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                          إلزامي
                        </span>
                      )}
                      <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                        {targetLabel}
                      </span>
                    </div>
                    <span className="text-xs text-text-secondary">
                      {new Date(circular.created_at).toLocaleString("ar-SA")}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {!circular.is_published && (
                    <button
                      onClick={() =>
                        handleAction(() => publishCircular(circular.id))
                      }
                      className="rounded-lg p-1.5 text-success hover:bg-success/10"
                      title="نشر وإرسال إشعارات"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("حذف هذا التعميم؟"))
                        handleAction(() => deleteCircular(circular.id));
                    }}
                    className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{circular.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
