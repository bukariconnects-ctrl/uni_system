"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Star,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  Ban,
  ArrowUpRight,
  BookOpen,
  User,
  Bot,
  Gauge,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Ticket as TicketType,
  TicketCategory,
  TicketStatus,
  TicketPriority,
} from "@/lib/types/database";
import {
  createTicket,
  getAiSuggestion,
  getTicketMessages,
  sendTicketMessage,
  rateTicket,
  closeTicket,
} from "./actions";

// ─── Status Configuration ───────────────────────────────────────────────

const statusConfig: Record<
  TicketStatus,
  { bg: string; text: string; label: string; icon: typeof Clock }
> = {
  open: { bg: "bg-action-blue/20", text: "text-action-blue", label: "مفتوحة", icon: AlertCircle },
  in_progress: { bg: "bg-warning/10", text: "text-warning", label: "قيد المعالجة", icon: Clock },
  pending_info: { bg: "bg-purple/10", text: "text-purple", label: "بانتظار معلومات", icon: Clock },
  resolved: { bg: "bg-success/10", text: "text-success", label: "تم الحل", icon: CheckCircle },
  closed: { bg: "bg-app-bg", text: "text-text-secondary", label: "مغلقة", icon: CheckCircle },
  rejected: { bg: "bg-danger/10", text: "text-danger", label: "مرفوضة", icon: XCircle },
};

const priorityConfig: Record<
  TicketPriority,
  { bg: string; text: string; label: string; icon: typeof Gauge }
> = {
  urgent: { bg: "bg-danger/15", text: "text-danger", label: "عاجل جداً", icon: AlertCircle },
  high: { bg: "bg-orange/15", text: "text-orange", label: "عالية", icon: Gauge },
  medium: { bg: "bg-warning/10", text: "text-warning", label: "متوسطة", icon: Gauge },
  low: { bg: "bg-success/10", text: "text-success", label: "منخفضة", icon: Gauge },
};

const categoryLabels: Record<TicketCategory, string> = {
  grade_appeal: "اعتراض على درجة",
  absence_excuse: "عذر غياب",
  registration_issue: "مشكلة في التسجيل",
  schedule_change: "طلب تغيير جدول",
  venue_issue: "مشكلة قاعة",
  technical_problem: "مشكلة فنية",
  administrative: "إداري عام",
  course_content_query: "استفسار عن محتوى المادة",
  leave_excuse_request: "طلب إجازة",
  schedule_conflict: "تعارض جدول",
  other: "أخرى",
};

interface Course {
  id: string;
  code: string;
  name: string;
}

// ─── Extended type for joined data ───────────────────────────────────

interface ExtendedTicket extends TicketType {
  profiles?: { first_name: string; last_name: string };
  assigned_profile?: { first_name: string; last_name: string } | null;
}

// ─── Main Component ─────────────────────────────────────────────────────

export function TicketsClient({
  tickets,
  courses,
  profileId,
  tenantId,
}: {
  tickets: ExtendedTicket[];
  courses: Course[];
  profileId: string;
  tenantId: string;
}) {
  // UI state
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<TicketStatus | "all">("all");

  // Create form state
  const [step, setStep] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("other");
  const [routeToInstructor, setRouteToInstructor] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");

  // Ticket detail state
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<Record<string, unknown>[]>([]);
  const [replyText, setReplyText] = useState("");

  // ── Computed ─────────────────────────────────────────────────────────

  const filtered =
    activeTab === "all"
      ? tickets
      : tickets.filter((t) => t.status === activeTab);

  // Determine available categories based on routing mode
  // When routing to instructor, only grade_appeal and course_content_query are allowed
  const availableCategories: TicketCategory[] = routeToInstructor
    ? ["grade_appeal", "course_content_query"]
    : [
        "grade_appeal",
        "absence_excuse",
        "registration_issue",
        "course_content_query",
        "technical_problem",
        "other",
      ];

  // ── Handlers ─────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setShowCreate(false);
    setStep(1);
    setAiSuggestion(null);
    setDescription("");
    setCategory("other");
    setRouteToInstructor(false);
    setSelectedCourse("");
  }, []);

  async function handleCategoryChange(newCategory: TicketCategory) {
    setCategory(newCategory);
  }

  async function handleCourseChange(courseId: string) {
    setSelectedCourse(courseId);
  }

  async function handleStep1Submit(formData: FormData) {
    const desc = formData.get("description") as string;
    const cat = formData.get("category") as TicketCategory;
    setDescription(desc);
    setCategory(cat);
    setAiLoading(true);
    setStep(2);

    try {
      const suggestion = await getAiSuggestion(desc);
      setAiSuggestion(suggestion);
    } catch {
      setAiSuggestion(null);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleAcceptAi(formData: FormData) {
    const loadingToast = toast.loading("جاري إنهاء التذكرة...");
    try {
      formData.set("ai_attempted", "true");
      formData.set("ai_suggestion", aiSuggestion || "");
      formData.set("auto_close", "true");
      formData.set("description", description);
      formData.set("category", category);
      formData.set("is_direct_to_faculty", routeToInstructor ? "true" : "false");
      if (selectedCourse) formData.set("course_id", selectedCourse);
      await createTicket(formData);
      toast.dismiss(loadingToast);
      toast.success("تم حل المشكلة تلقائياً بواسطة UniBot 🎉");
      resetForm();
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleRejectAi(formData: FormData) {
    const loadingToast = toast.loading("جاري إنشاء التذكرة...");
    try {
      formData.set("ai_attempted", "true");
      formData.set("ai_suggestion", aiSuggestion || "");
      formData.set("auto_close", "false");
      formData.set("description", description);
      formData.set("category", category);
      formData.set("is_direct_to_faculty", routeToInstructor ? "true" : "false");
      if (selectedCourse) formData.set("course_id", selectedCourse);
      await createTicket(formData);
      toast.dismiss(loadingToast);
      toast.success(routeToInstructor ? "تم إرسال استفسارك للمحاضر" : "تم فتح التذكرة بنجاح");
      resetForm();
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleNoAiSubmit(formData: FormData) {
    const loadingToast = toast.loading("جاري إنشاء التذكرة...");
    try {
      formData.set("ai_attempted", "false");
      formData.set("auto_close", "false");
      formData.set("description", description);
      formData.set("category", category);
      formData.set("is_direct_to_faculty", routeToInstructor ? "true" : "false");
      if (selectedCourse) formData.set("course_id", selectedCourse);
      await createTicket(formData);
      toast.dismiss(loadingToast);
      toast.success(routeToInstructor ? "تم إرسال استفسارك للمحاضر" : "تم فتح التذكرة بنجاح");
      resetForm();
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleExpandTicket(ticketId: string) {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
      return;
    }
    setExpandedTicket(ticketId);
    const msgs = await getTicketMessages(ticketId);
    setTicketMessages(msgs);
  }

  async function handleSendReply(ticketId: string) {
    if (!replyText.trim()) return;
    try {
      await sendTicketMessage(ticketId, replyText.trim());
      setReplyText("");
      const msgs = await getTicketMessages(ticketId);
      setTicketMessages(msgs);
      toast.success("تم إرسال الرد");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleRate(ticketId: string, rating: number) {
    try {
      await rateTicket(ticketId, rating);
      toast.success("شكراً على تقييمك");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleClose(ticketId: string) {
    try {
      await closeTicket(ticketId);
      toast.success("تم إغلاق التذكرة");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  // ── Stats for header ────────────────────────────────────────────────

  const stats = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">تذاكري</h1>
          <p className="text-sm text-text-secondary">
            تقديم ومتابعة الطلبات والاستفسارات الأكاديمية
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setStep(1);
            setAiSuggestion(null);
            setRouteToInstructor(false);
            setSelectedCourse("");
          }}
          className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          تذكرة جديدة
        </button>
      </div>

      {/* ── Stats Row ──────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <p className="text-xs text-text-secondary">مفتوحة</p>
          <p className="text-2xl font-bold text-action-blue">{stats.open}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <p className="text-xs text-text-secondary">قيد المعالجة</p>
          <p className="text-2xl font-bold text-warning">{stats.in_progress}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <p className="text-xs text-text-secondary">تم الحل</p>
          <p className="text-2xl font-bold text-success">{stats.resolved}</p>
        </div>
      </div>

      {/* ── Tab Filters ────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {([
          "all",
          "open",
          "in_progress",
          "pending_info",
          "resolved",
          "closed",
          "rejected",
        ] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveTab(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === s
                ? "bg-action-blue text-white"
                : "bg-app-bg text-text-secondary hover:bg-border"
            }`}
          >
            {s === "all"
              ? "الكل"
              : statusConfig[s as TicketStatus]?.label || s}
          </button>
        ))}
      </div>

      {/* ── Create Ticket Form ─────────────────── */}
      {showCreate && (
        <div className="rounded-2xl border border-border bg-card-bg p-6">
          {/* Step indicator */}
          <div className="mb-4 flex items-center gap-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    step >= s
                      ? "bg-action-blue text-white"
                      : "bg-app-bg text-text-secondary"
                  }`}
                >
                  {s}
                </div>
                <span
                  className={`text-xs ${step >= s ? "text-action-blue font-medium" : "text-text-secondary"}`}
                >
                  {s === 1 ? "الوصف" : s === 2 ? "مساعدة AI" : "إرسال"}
                </span>
                {s < 3 && (
                  <div
                    className={`h-px w-8 ${step > s ? "bg-action-blue" : "bg-border"}`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Description */}
          {step === 1 && (
            <form action={handleStep1Submit} className="space-y-4">
              {/* Routing toggle switch */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-app-bg p-4">
                <div>
                  <label className="text-sm font-medium text-text-primary">
                    توجيه التذكرة لمحاضر مقرر معين
                  </label>
                  <p className="text-xs text-text-secondary">
                    {routeToInstructor
                      ? "سيتم توجيه التذكرة مباشرة إلى المحاضر المختص"
                      : "ستذهب التذكرة إلى الإدارة الأكاديمية"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={routeToInstructor}
                  onClick={() => {
                    setRouteToInstructor(!routeToInstructor);
                    if (!routeToInstructor) {
                      setCategory("grade_appeal");
                    } else {
                      setCategory("other");
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    routeToInstructor ? "bg-purple" : "bg-border"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      routeToInstructor ? "translate-x-0" : "-translate-x-5"
                    }`}
                  />
                </button>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  {routeToInstructor ? "نوع الاستفسار" : "نوع التذكرة"}
                </label>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as TicketCategory)}
                  required
                  className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course selection - required when routing to instructor */}
              {routeToInstructor && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">
                    المقرر الدراسي <span className="text-danger">*</span>
                  </label>
                  <select
                    name="course_id"
                    value={selectedCourse}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    required={routeToInstructor}
                    className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                  >
                    <option value="">اختر المقرر</option>
                    {courses.map((c: Course) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-text-secondary">
                    سيتم العثور على المحاضر المختص تلقائياً
                  </p>
                </div>
              )}

              {/* Course selection for absence excuse or grade appeal (non-instructor) */}
              {!routeToInstructor && (category === "absence_excuse" || category === "grade_appeal") && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">
                    المقرر الدراسي
                  </label>
                  <select
                    name="course_id"
                    value={selectedCourse}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                  >
                    <option value="">اختر المقرر</option>
                    {courses.map((c: Course) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  العنوان
                </label>
                <input
                  name="title"
                  required
                  placeholder="ملخص مختصر للتذكرة"
                  className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  الوصف التفصيلي
                </label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  placeholder="اكتب شرحاً مفصلاً للمشكلة..."
                  className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
                >
                  <Sparkles className="h-4 w-4" />
                  التالي — استشارة UniBot
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary"
                >
                  إلغاء
                </button>
                {/* Skip AI and send directly */}
                <button
                  type="button"
                  onClick={() => {
                    const form = document.querySelector("form") as HTMLFormElement;
                    if (form) {
                      const formData = new FormData(form);
                      setDescription(formData.get("description") as string);
                      setAiSuggestion(null);
                      setStep(3);
                    }
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-app-bg"
                >
                  تخطي المساعد الذكي
                </button>
              </div>
            </form>
          )}

          {/* Step 2: AI Suggestion */}
          {step === 2 && (
            <div className="space-y-4">
              {aiLoading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple" />
                  <p className="text-sm text-text-secondary">
                    UniBot يبحث عن إجابة...
                  </p>
                </div>
              ) : aiSuggestion ? (
                <div className="overflow-hidden rounded-2xl border-2 border-warning/50 bg-gradient-to-br from-warning/8 to-warning/5 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-warning/20 bg-warning/10 px-5 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/20">
                      <Sparkles className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">
                        اقتراح من المساعد الذكي
                      </h3>
                      <p className="text-xs text-text-secondary">
                        UniBot وجد إجابة محتملة لمشكلتك
                      </p>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                      {aiSuggestion}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <form action={handleAcceptAi}>
                        <input type="hidden" name="title" value={categoryLabels[category]} />
                        <button
                          type="submit"
                          className="flex items-center gap-2 rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-success/90"
                        >
                          <CheckCircle className="h-4 w-4" />
                          هذا يحل مشكلتي
                        </button>
                      </form>
                      <button
                        onClick={() => setStep(3)}
                        className="flex items-center gap-2 rounded-xl border-2 border-border px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-warning/40 hover:bg-warning/5"
                      >
                        مواصلة إرسال التذكرة
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-app-bg p-5 text-center">
                  <Bot className="mx-auto mb-3 h-10 w-10 text-text-secondary/50" />
                  <p className="mb-1 text-sm font-medium text-text-primary">
                    لم يتمكن UniBot من إيجاد إجابة
                  </p>
                  <p className="mb-4 text-sm text-text-secondary">
                    {routeToInstructor
                      ? "سيتم توجيه استفسارك مباشرة إلى محاضر المقرر"
                      : "سيتم توجيه تذكرتك للإدارة الأكاديمية"}
                  </p>
                  <button
                    onClick={() => setStep(3)}
                    className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white"
                  >
                    متابعة فتح التذكرة
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm & Send */}
          {step === 3 && (
            <form action={handleRejectAi} className="space-y-4">
              <input type="hidden" name="title" value={categoryLabels[category]} />

              {/* Summary */}
              <div className="rounded-xl border border-border bg-app-bg p-4">
                <h4 className="mb-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                  ملخص التذكرة
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary">النوع:</span>
                    <span className="font-medium text-text-primary">
                      {categoryLabels[category]}
                    </span>
                  </div>
                  {routeToInstructor && selectedCourse && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-text-secondary" />
                      <span className="text-text-secondary">المقرر:</span>
                      <span className="font-medium text-text-primary">
                        {courses.find((c) => c.id === selectedCourse)?.name || selectedCourse}
                      </span>
                    </div>
                  )}
                  {routeToInstructor && selectedCourse && (
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-text-secondary" />
                      <span className="text-text-secondary">المحاضر:</span>
                      <span className="font-medium text-text-primary">
                        يتم التعيين التلقائي ...
                      </span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2">
                    <p className="text-text-secondary">الوصف:</p>
                    <p className="text-text-primary">{description}</p>
                  </div>
                </div>
              </div>

              {aiSuggestion && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <p className="mb-1 flex items-center gap-1 text-xs font-medium text-warning">
                    <Sparkles className="h-3 w-3" />
                    اقتراح UniBot (مرفق مع التذكرة)
                  </p>
                  <p className="text-sm text-text-primary line-clamp-2">
                    {aiSuggestion}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
                >
                  <Send className="h-4 w-4" />
                  {routeToInstructor ? "إرسال الاستفسار للمحاضر" : "إرسال التذكرة"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary"
                >
                  رجوع
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}

          {step === 3 && !aiSuggestion && (
            <form action={handleNoAiSubmit} className="mt-2">
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="title" value={categoryLabels[category]} />
            </form>
          )}
        </div>
      )}

      {/* ── Ticket List ────────────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 && !showCreate && (
          <div className="rounded-2xl border border-border bg-card-bg p-12 text-center">
            <Ticket className="mx-auto mb-3 h-12 w-12 text-text-secondary/50" />
            <p className="text-lg font-medium text-text-primary">
              {activeTab === "all"
                ? "لا توجد تذاكر بعد"
                : `لا توجد تذاكر بحالة "${statusConfig[activeTab as TicketStatus]?.label || activeTab}"`}
            </p>
            <p className="mb-4 text-sm text-text-secondary">
              {activeTab === "all"
                ? "أنشئ تذكرة جديدة للتواصل مع الإدارة الأكاديمية"
                : "لا توجد تذاكر تطابق هذا الفلتر"}
            </p>
            {activeTab === "all" && (
              <button
                onClick={() => {
                  setShowCreate(true);
                  setStep(1);
                }}
                className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white"
              >
                إنشاء تذكرة جديدة
              </button>
            )}
          </div>
        )}

        {filtered.map((ticket) => {
          const status = statusConfig[ticket.status as TicketStatus] || statusConfig.open;
          const StatusIcon = status.icon;
          const priority = priorityConfig[ticket.priority as TicketPriority] || priorityConfig.medium;
          const PriorityIcon = priority.icon;
          const isExpanded = expandedTicket === ticket.id;
          const createdDate = new Date(ticket.created_at);
          const now = new Date();
          const daysAgo = Math.floor(
            (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          return (
            <div
              key={ticket.id}
              className={`rounded-2xl border border-border bg-card-bg transition-all ${
                ticket.is_direct_to_faculty ? "border-purple/20" : ""
              }`}
            >
              {/* ── Ticket Header ──────────────── */}
              <div
                className="flex cursor-pointer items-center gap-4 p-4"
                onClick={() => handleExpandTicket(ticket.id)}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${status.bg}`}
                >
                  <StatusIcon className={`h-5 w-5 ${status.text}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text-primary">
                      {categoryLabels[ticket.category as TicketCategory] || ticket.title}
                    </p>
                    <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                      {ticket.ticket_number}
                    </span>
                    {ticket.ai_attempted && (
                      <Sparkles className="h-3.5 w-3.5 text-purple shrink-0" />
                    )}
                    {ticket.is_direct_to_faculty && (
                      <span className="rounded-full bg-purple/10 px-2 py-0.5 text-[10px] text-purple">
                        إلى محاضر
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mt-1">
                    <span>{categoryLabels[ticket.category as TicketCategory]}</span>
                    <span>•</span>
                    <span>
                      {daysAgo === 0
                        ? "اليوم"
                        : daysAgo === 1
                          ? "أمس"
                          : `منذ ${daysAgo} أيام`}
                    </span>
                    {(ticket as ExtendedTicket).assigned_to && (ticket as ExtendedTicket).assigned_profile && (
                      <>
                        <span>•</span>
                        <span className="text-action-blue">
                          <User className="inline h-3 w-3 ml-0.5" />
                          {(ticket as ExtendedTicket).assigned_profile!.first_name}{" "}
                          {(ticket as ExtendedTicket).assigned_profile!.last_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Priority badge */}
                <div className={`hidden sm:flex items-center gap-1 rounded-full px-2 py-0.5 ${priority.bg}`}>
                  <PriorityIcon className={`h-3 w-3 ${priority.text}`} />
                  <span className={`text-[10px] font-medium ${priority.text}`}>
                    {priority.label}
                  </span>
                </div>

                {/* Status badge */}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.text}`}
                >
                  {status.label}
                </span>

                {ticket.rating && (
                  <div className="hidden sm:flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <Star
                        key={r}
                        className={`h-3 w-3 ${r <= ticket.rating! ? "fill-warning text-warning" : "text-border"}`}
                      />
                    ))}
                  </div>
                )}

                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-text-secondary" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
                )}
              </div>

              {/* ── Expanded Details ───────────── */}
              {isExpanded && (
                <div className="space-y-4 border-t border-border p-4">
                  {/* Description */}
                  <div className="rounded-lg bg-app-bg p-3">
                    <p className="whitespace-pre-wrap text-sm text-text-primary">
                      {ticket.description}
                    </p>
                  </div>

                  {/* AI Suggestion */}
                  {ticket.ai_suggestion && (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-warning">
                        <Sparkles className="h-3 w-3" />
                        اقتراح UniBot:
                      </p>
                      <p className="text-sm text-text-primary line-clamp-3">
                        {ticket.ai_suggestion}
                      </p>
                    </div>
                  )}

                  {/* Priority reason */}
                  {ticket.priority_reason && (
                    <div className="flex items-center gap-2 rounded-lg bg-academic-navy/[0.04] p-3">
                      <Gauge className="h-4 w-4 text-text-secondary" />
                      <span className="text-xs text-text-secondary">
                        سبب الأولوية: {ticket.priority_reason}
                      </span>
                    </div>
                  )}

                  {/* Messages */}
                  {ticketMessages.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-medium text-text-secondary">
                        <MessageSquare className="h-3 w-3" />
                        المحادثة ({ticketMessages.length})
                      </h4>
                      <div className="space-y-2">
                        {ticketMessages.map((msg: Record<string, unknown>) => (
                          <div
                            key={msg.id as string}
                            className={`rounded-lg border p-3 ${
                              (msg.sender_id as string) === profileId
                                ? "border-action-blue/20 bg-action-blue/5"
                                : "border-border"
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs font-medium text-text-primary">
                                {(msg.profiles as Record<string, string>)?.first_name}{" "}
                                {(msg.profiles as Record<string, string>)?.last_name}
                              </span>
                              <span className="text-xs text-text-secondary">
                                {new Date(msg.created_at as string).toLocaleString("ar-SA")}
                              </span>
                            </div>
                            <p className="text-sm text-text-primary">{msg.body as string}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Reply */}
                    {(ticket.status === "open" ||
                      ticket.status === "in_progress" ||
                      ticket.status === "pending_info") && (
                      <div className="flex flex-1 gap-2 min-w-[200px]">
                        <input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={
                            ticket.status === "pending_info"
                              ? "الرجاء تقديم المعلومات المطلوبة..."
                              : "اكتب رداً..."
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply(ticket.id);
                            }
                          }}
                          className="flex-1 rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                        />
                        <button
                          onClick={() => handleSendReply(ticket.id)}
                          disabled={!replyText.trim()}
                          className="rounded-lg bg-action-blue px-3 py-2 text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Close (for resolved tickets) */}
                    {ticket.status === "resolved" && (
                      <button
                        onClick={() => handleClose(ticket.id)}
                        className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:bg-app-bg"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        إغلاق التذكرة
                      </button>
                    )}
                  </div>

                  {/* Rating */}
                  {ticket.status === "resolved" && !ticket.rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">قيم الخدمة:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button
                            key={r}
                            onClick={() => handleRate(ticket.id, r)}
                            className="text-text-secondary transition-colors hover:text-warning"
                          >
                            <Star className="h-5 w-5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Existing rating */}
                  {ticket.rating && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-secondary">تقييمك:</span>
                      {[1, 2, 3, 4, 5].map((r) => (
                        <Star
                          key={r}
                          className={`h-4 w-4 ${r <= ticket.rating! ? "fill-warning text-warning" : "text-border"}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

