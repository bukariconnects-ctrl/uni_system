"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Megaphone,
  AlertTriangle,
  Bell,
  Plus,
  X,
  Eye,
  Trash2,
  Send,
  Inbox,
  GraduationCap,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createFacultyCircular,
  publishFacultyCircular,
  deleteFacultyCircular,
} from "./actions";

interface SenderProfile {
  first_name: string;
  last_name: string;
  role: string;
}

interface Circular {
  id: string;
  title: string;
  body: string;
  target_type: string;
  target_id: string | null;
  major_id?: string | null;
  academic_level_id?: string | null;
  is_mandatory: boolean;
  is_published: boolean;
  created_at: string;
  expires_at: string | null;
  sender?: SenderProfile | null;
}

interface Course {
  id: string;
  label: string;
}

interface CourseGroup {
  study_plan_course_id: string;
  course_id: string;
  academic_level_id: string | null;
  academic_level_name: string | null;
  level_number: number | null;
  major_id: string | null;
  major_name: string | null;
}

const TARGET_LABELS: Record<string, string> = {
  all: "الجميع",
  students: "كل طلابي",
  faculty: "أعضاء هيئة التدريس",
  department: "قسم",
  major: "تخصص",
  level: "مستوى",
  section: "شعبة محددة",
};

const FACULTY_TARGET_TYPES = [
  { value: "students", label: "🎓 كل طلابي (جميع المواد)" },
  { value: "section", label: "📋 مادة محددة" },
];

export function FacultyCircularsClient({
  receivedCirculars: initialReceived,
  sentCirculars: initialSent,
  userId,
  tenantId,
  taughtCourses,
  courseGroups,
}: {
  receivedCirculars: Circular[];
  sentCirculars: Circular[];
  userId: string;
  tenantId: string;
  taughtCourses: Course[];
  courseGroups: CourseGroup[];
}) {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [received, setReceived] = useState<Circular[]>(initialReceived);
  const [sent, setSent] = useState<Circular[]>(initialSent);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [targetType, setTargetType] = useState("students");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const supabase = createClient();

  const availableGroups = selectedCourseId
    ? courseGroups.filter((g: any) => g.course_id === selectedCourseId)
    : [];

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    if (p === "received" || p === "sent") setActiveTab(p);
  }, []);

  function changeTab(t: "received" | "sent") {
    setActiveTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  }

  useEffect(() => {
    const channel = supabase
      .channel(`faculty-circulars-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const n = payload.new as any;
          if (n.notification_type !== "circular" || !n.reference_id) return;

          const { data } = await supabase
            .from("circulars")
            .select("*, sender:profiles!circulars_created_by_fkey(first_name, last_name, role)")
            .eq("id", n.reference_id)
            .single();

          if (data) {
            setReceived((prev) => {
              if (prev.find((c) => c.id === data.id)) return prev;
              return [data, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleAction(action: () => Promise<void>, successMsg?: string) {
    setLoading(true);
    const loadingToast = toast.loading("جاري تنفيذ العملية...");
    try {
      await action();
      setShowForm(false);
      toast.dismiss(loadingToast);
      toast.success(successMsg || "تمت العملية بنجاح");
      window.location.reload();
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs + New button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 rounded-xl bg-app-bg p-1">
          <button
            onClick={() => changeTab("received")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "received"
                ? "bg-card-bg text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Inbox className="h-4 w-4" />
            المستلمة
            {received.length > 0 && (
              <span className="rounded-full bg-action-blue/20 px-1.5 py-0.5 text-xs text-action-blue">
                {received.length}
              </span>
            )}
          </button>
          <button
            onClick={() => changeTab("sent")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "sent"
                ? "bg-card-bg text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Send className="h-4 w-4" />
            المرسلة
            {sent.length > 0 && (
              <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-xs text-success">
                {sent.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "sent" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90"
          >
            <Plus className="h-4 w-4" />
            تعميم جديد
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && activeTab === "sent" && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">انشاء تعميم</h3>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form
            action={(fd) => handleAction(() => createFacultyCircular(fd), "تم إنشاء التعميم")}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-primary">
                العنوان
              </label>
              <input
                type="text"
                name="title"
                required
                className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-primary">
                المحتوى
              </label>
              <textarea
                name="body"
                rows={4}
                required
                className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">
                الفئة المستهدفة
              </label>
              <select
                name="target_type"
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value);
                  setSelectedCourseId("");
                  setSelectedGroupId("");
                }}
                className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
              >
                {FACULTY_TARGET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {targetType === "section" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">
                    اختر المادة
                  </label>
                  <select
                    name="target_id"
                    required
                    value={selectedCourseId}
                    onChange={(e) => {
                      setSelectedCourseId(e.target.value);
                      setSelectedGroupId("");
                    }}
                    className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                  >
                    <option value="">-- اختر المادة --</option>
                    {taughtCourses.length === 0 && (
                      <option disabled>لا توجد مواد مسندة اليك</option>
                    )}
                    {taughtCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {availableGroups.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-primary">
                      التخصص / المستوى (اختياري — اتركه للجميع)
                    </label>
                    <select
                      name="group_id"
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                    >
                      <option value="">-- جميع التخصصات --</option>
                      {availableGroups.map((g: any) => (
                        <option key={g.study_plan_course_id} value={g.study_plan_course_id}>
                          {g.major_name || "تخصص"} — {g.academic_level_name || `مستوى ${g.level_number || ''}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">
                تاريخ الانتهاء (اختياري)
              </label>
              <input
                type="datetime-local"
                name="expires_at"
                className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                dir="ltr"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50"
              >
                {loading ? "جاري الانشاء..." : "انشاء كمسودة"}
              </button>
              <p className="mt-1.5 text-xs text-text-secondary">
                ستنشأ كمسودة، ثم اضغط نشر لارسالها للطلاب
              </p>
            </div>
          </form>
        </div>
      )}

      {/* Received tab */}
      {activeTab === "received" && (
        <div className="space-y-3">
          {received.length === 0 ? (
            <EmptyState message="لا توجد تعاميم واردة اليك" />
          ) : (
            received.map((c) => (
              <CircularCard key={c.id} circular={c} isOwn={false} />
            ))
          )}
        </div>
      )}

      {/* Sent tab */}
      {activeTab === "sent" && !showForm && (
        <div className="space-y-3">
          {sent.length === 0 ? (
            <EmptyState message="لم تنشئ اي تعاميم بعد، اضغط تعميم جديد للبدء" />
          ) : (
            sent.map((c) => (
              <CircularCard
                key={c.id}
                circular={c}
                isOwn={true}
                onPublish={() => handleAction(() => publishFacultyCircular(c.id), "تم نشر التعميم")}
                onDelete={() => handleAction(() => deleteFacultyCircular(c.id), "تم حذف التعميم")}
                loading={loading}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card-bg p-14 text-center">
      <Bell className="mx-auto mb-3 h-10 w-10 text-text-secondary/40" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}

function CircularCard({
  circular,
  isOwn,
  onPublish,
  onDelete,
  loading,
}: {
  circular: Circular;
  isOwn: boolean;
  onPublish?: () => void;
  onDelete?: () => void;
  loading?: boolean;
}) {
  const isExpired =
    circular.expires_at && new Date(circular.expires_at) < new Date();

  const sender = circular.sender;
  const isFaculty = sender?.role === "faculty";
  const senderName = sender
    ? `${sender.first_name} ${sender.last_name}`
    : null;
  const senderLabel = isFaculty ? "المحاضر" : "الإدارة الأكاديمية";

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-card-bg shadow-sm ${
        circular.is_mandatory && circular.is_published
          ? "border-danger/40"
          : "border-border"
      } ${isExpired ? "opacity-60" : ""}`}
    >
      {/* Sender Header — only for received circulars */}
      {!isOwn && senderName && (
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

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-text-primary">{circular.title}</h3>
                {isOwn && (
                  <>
                    {circular.is_published ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                        منشور
                      </span>
                    ) : (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">
                        مسودة
                      </span>
                    )}
                  </>
                )}
                {circular.is_mandatory && (
                  <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                    الزامي
                  </span>
                )}
                {isExpired && (
                  <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                    منتهي
                  </span>
                )}
                <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                  {TARGET_LABELS[circular.target_type] ?? circular.target_type}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                {circular.body}
              </p>
              <p className="mt-1.5 text-xs text-text-secondary/60">
                {new Date(circular.created_at).toLocaleString("ar-SA")}
                {circular.expires_at && (
                  <span className="mr-3 text-warning">
                    {" • ينتهي: "}
                    {new Date(circular.expires_at).toLocaleDateString("ar-SA")}
                  </span>
                )}
              </p>
            </div>
          </div>

          {isOwn && (
            <div className="flex shrink-0 items-center gap-1">
              {!circular.is_published && onPublish && (
                <button
                  onClick={onPublish}
                  disabled={loading}
                  className="rounded-lg p-1.5 text-success hover:bg-success/10 disabled:opacity-50"
                  title="نشر وارسال للطلاب"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm("هل تريد حذف هذا التعميم؟")) onDelete();
                  }}
                  disabled={loading}
                  className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
