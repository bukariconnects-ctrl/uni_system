"use client";

import { useState } from "react";
import {
  Plus,
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  Gauge,
  User,
  ArrowUpRight,
  Bot,
  FileText,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Ticket as TicketType,
  TicketCategory,
  TicketStatus,
  TicketPriority,
} from "@/lib/types/database";
import {
  createFacultyTicket,
  updateTicketStatus,
  sendFacultyTicketMessage,
  getTicketMessages,
  escalateTicket,
  getEscalationHistory,
  summarizeConversation,
} from "./actions";

// ─── Config ─────────────────────────────────────────────────────────────

const statusConfig: Record<TicketStatus, { bg: string; text: string; label: string; icon: typeof Clock }> = {
  open: { bg: "bg-action-blue/20", text: "text-action-blue", label: "مفتوحة", icon: AlertCircle },
  in_progress: { bg: "bg-warning/10", text: "text-warning", label: "قيد المعالجة", icon: Clock },
  pending_info: { bg: "bg-purple/10", text: "text-purple", label: "بانتظار معلومات", icon: Clock },
  resolved: { bg: "bg-success/10", text: "text-success", label: "تم الحل", icon: CheckCircle },
  closed: { bg: "bg-app-bg", text: "text-text-secondary", label: "مغلقة", icon: CheckCircle },
  rejected: { bg: "bg-danger/10", text: "text-danger", label: "مرفوضة", icon: XCircle },
};

const priorityConfig: Record<TicketPriority, { bg: string; text: string; label: string }> = {
  urgent: { bg: "bg-danger/15", text: "text-danger", label: "عاجل جداً" },
  high: { bg: "bg-orange/15", text: "text-orange", label: "عالية" },
  medium: { bg: "bg-warning/10", text: "text-warning", label: "متوسطة" },
  low: { bg: "bg-success/10", text: "text-success", label: "منخفضة" },
};

const categoryLabels: Record<string, string> = {
  venue_issue: "مشكلة قاعة",
  schedule_conflict: "تعارض جدول",
  technical_problem: "مشكلة فنية في القاعة",
  leave_excuse_request: "طلب إجازة/عذر",
  other: "أخرى",
  // Student categories that may be assigned to faculty
  grade_appeal: "طعن في درجة",
  absence_excuse: "عذر غياب",
  registration_issue: "مشكلة تسجيل",
  schedule_change: "طلب تغيير جدول",
  administrative: "إداري عام",
  course_content_query: "استفسار عن محتوى المادة",
};

const statusTransitions: Record<string, TicketStatus[]> = {
  open: ["in_progress", "rejected"],
  in_progress: ["pending_info", "resolved", "rejected"],
  pending_info: ["in_progress", "resolved"],
  resolved: [],
  closed: [],
  rejected: [],
};

const facultyCategories: { value: TicketCategory; label: string; icon: string }[] = [
  { value: "venue_issue", label: "طلب تغيير قاعة", icon: "🏛️" },
  { value: "schedule_conflict", label: "مشكلة في الجدول", icon: "📅" },
  { value: "technical_problem", label: "مشكلة فنية في القاعة/المعمل", icon: "🔧" },
  { value: "leave_excuse_request", label: "طلب إجازة/عذر", icon: "📋" },
  { value: "other", label: "أخرى", icon: "📌" },
];

interface ExtendedTicket extends TicketType {
  profiles?: { first_name: string; last_name: string; role?: string };
  assigned_profile?: { first_name: string; last_name: string } | null;
}

export function FacultyTicketsClient({
  assignedTickets,
  createdTickets,
  profileId,
}: {
  assignedTickets: ExtendedTicket[];
  createdTickets: ExtendedTicket[];
  profileId: string;
}) {
  // Tab state
  const [activeView, setActiveView] = useState<"assigned" | "mine">("assigned");
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [category, setCategory] = useState<TicketCategory>("other");
  const [createStep, setCreateStep] = useState(1);

  // Detail state
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<Record<string, unknown>[]>([]);
  const [escalations, setEscalations] = useState<Record<string, unknown>[]>([]);
  const [replyText, setReplyText] = useState("");
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const activeTickets = activeView === "assigned" ? assignedTickets : createdTickets;

  // ── Handlers ─────────────────────────────────────────────────────

  function resetForm() {
    setShowCreate(false);
    setCreateStep(1);
    setCategory("other");
  }

  async function handleCreate(formData: FormData) {
    const loadingToast = toast.loading("جاري إنشاء التذكرة...");
    try {
      await createFacultyTicket(formData);
      toast.dismiss(loadingToast);
      toast.success("تم إنشاء التذكرة بنجاح");
      resetForm();
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleExpand(ticketId: string) {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
      setSummary(null);
      return;
    }
    setExpandedTicket(ticketId);
    const [msgs, escs] = await Promise.all([
      getTicketMessages(ticketId),
      getEscalationHistory(ticketId),
    ]);
    setTicketMessages(msgs);
    setEscalations(escs);
    setSummary(null);
  }

  async function handleStatusChange(ticketId: string, newStatus: TicketStatus) {
    try {
      await updateTicketStatus(ticketId, newStatus);
      toast.success("تم تحديث الحالة");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleSendReply(ticketId: string) {
    if (!replyText.trim()) return;
    try {
      await sendFacultyTicketMessage(ticketId, replyText.trim());
      setReplyText("");
      const msgs = await getTicketMessages(ticketId);
      setTicketMessages(msgs);
      toast.success("تم إرسال الرد");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleEscalate(ticketId: string) {
    if (!escalateReason.trim()) {
      toast.error("الرجاء كتابة سبب التصعيد");
      return;
    }
    try {
      await escalateTicket(ticketId, escalateReason.trim());
      toast.success("تم تصعيد التذكرة إلى الإدارة الأكاديمية");
      setShowEscalate(false);
      setEscalateReason("");
      // Refresh
      const [msgs, escs] = await Promise.all([
        getTicketMessages(ticketId),
        getEscalationHistory(ticketId),
      ]);
      setTicketMessages(msgs);
      setEscalations(escs);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleSummarize(ticketId: string) {
    setSummarizing(true);
    try {
      const result = await summarizeConversation(ticketId);
      setSummary(result);
    } catch {
      setSummary("فشل التلخيص");
    } finally {
      setSummarizing(false);
    }
  }

  // ── Stats ────────────────────────────────────────────────────────

  const urgentCount = assignedTickets.filter(
    (t) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed"
  ).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">التذاكر</h1>
          <p className="text-sm text-text-secondary">إدارة وتتبع التذاكر الأكاديمية</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateStep(1); }}
          className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          تذكرة جديدة
        </button>
      </div>

      {/* Stats + Urgent warning */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="h-6 w-6 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-bold text-danger">تذاكر عاجلة</p>
            <p className="text-xs text-text-secondary">
              لديك {urgentCount} تذاكر {urgentCount === 1 ? "بعاجلة" : "عاجلة"} في انتظار معالجتك
            </p>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveView("assigned")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeView === "assigned"
              ? "bg-action-blue text-white"
              : "text-text-secondary hover:bg-app-bg"
          }`}
        >
          <User className="h-4 w-4" />
          الموكلة إليّ ({assignedTickets.length})
        </button>
        <button
          onClick={() => setActiveView("mine")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeView === "mine"
              ? "bg-action-blue text-white"
              : "text-text-secondary hover:bg-app-bg"
          }`}
        >
          <FileText className="h-4 w-4" />
          تذاكري ({createdTickets.length})
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-border bg-card-bg p-6">
          <h2 className="mb-4 text-lg font-bold text-text-primary">إنشاء تذكرة جديدة</h2>
          <form action={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">نوع التذكرة</label>
              <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                required
                className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
              >
                {facultyCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">العنوان</label>
              <input
                name="title"
                required
                placeholder="ملخص مختصر للمشكلة"
                className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">الوصف التفصيلي</label>
              <textarea
                name="description"
                required
                rows={4}
                placeholder="اشرح المشكلة بالتفصيل..."
                className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
              >
                <Send className="h-4 w-4 inline ml-1" />
                إرسال التذكرة
              </button>
              <button type="button" onClick={resetForm} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket List */}
      <div className="space-y-3">
        {activeTickets.length === 0 && (
          <div className="rounded-2xl border border-border bg-card-bg p-12 text-center">
            <Ticket className="mx-auto mb-3 h-12 w-12 text-text-secondary/50" />
            <p className="text-lg font-medium text-text-primary">
              {activeView === "assigned" ? "لا توجد تذاكر موكلة إليك" : "لا توجد تذاكر بعد"}
            </p>
            <p className="text-sm text-text-secondary">
              {activeView === "assigned"
                ? "عندما يرسل الطلاب استفسارات لمقرراتك الدراسية، ستظهر هنا"
                : "أنشئ تذكرة جديدة للتواصل مع الإدارة الأكاديمية"}
            </p>
          </div>
        )}

        {activeTickets.map((ticket) => {
          const status = statusConfig[ticket.status as TicketStatus] || statusConfig.open;
          const StatusIcon = status.icon;
          const priority = priorityConfig[ticket.priority as TicketPriority] || priorityConfig.medium;
          const isExpanded = expandedTicket === ticket.id;

          return (
            <div key={ticket.id} className="rounded-2xl border border-border bg-card-bg">
              {/* Clickable Header */}
              <div className="flex cursor-pointer items-center gap-4 p-4" onClick={() => handleExpand(ticket.id)}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${status.bg}`}>
                  <StatusIcon className={`h-5 w-5 ${status.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text-primary">
                      {categoryLabels[ticket.category] || ticket.title}
                    </p>
                    <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                      {ticket.ticket_number}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mt-1">
                    <span>{categoryLabels[ticket.category]}</span>
                    <span>•</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString("ar-SA")}</span>
                    {ticket.profiles && (
                      <>
                        <span>•</span>
                        <span className="text-action-blue">
                          {ticket.profiles.first_name} {ticket.profiles.last_name}
                          {ticket.profiles.role === "student" && " (طالب)"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {/* Priority */}
                <div className={`hidden sm:flex items-center gap-1 rounded-full px-2 py-0.5 ${priority.bg}`}>
                  <span className={`text-[10px] font-medium ${priority.text}`}>{priority.label}</span>
                </div>
                {/* Status */}
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
                {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-text-secondary" /> : <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="space-y-4 border-t border-border p-4">
                  {/* Description */}
                  <div className="rounded-lg bg-app-bg p-3">
                    <p className="whitespace-pre-wrap text-sm text-text-primary">{ticket.description}</p>
                  </div>

                  {/* AI Suggestion */}
                  {ticket.ai_suggestion && (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-warning">
                        <Sparkles className="h-3 w-3" /> اقتراح UniBot:
                      </p>
                      <p className="text-sm text-text-primary">{ticket.ai_suggestion}</p>
                    </div>
                  )}

                  {/* Actions row - Status change + Escalate + Summarize */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status transitions */}
                    {statusTransitions[ticket.status]?.map((newStatus) => (
                      <button
                        key={newStatus}
                        onClick={() => handleStatusChange(ticket.id, newStatus)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${statusConfig[newStatus].bg} ${statusConfig[newStatus].text} hover:opacity-80`}
                      >
                        {statusConfig[newStatus].label}
                      </button>
                    ))}

                    {/* Escalate */}
                    {ticket.status !== "closed" && ticket.status !== "rejected" && (
                      <button
                        onClick={() => setShowEscalate(!showEscalate)}
                        className="flex items-center gap-1 rounded-lg border border-orange/30 px-2.5 py-1 text-xs font-medium text-orange hover:bg-orange/5"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        تصعيد
                      </button>
                    )}

                    {/* AI Summarize */}
                    <button
                      onClick={() => handleSummarize(ticket.id)}
                      disabled={summarizing}
                      className="flex items-center gap-1 rounded-lg border border-purple/30 px-2.5 py-1 text-xs font-medium text-purple hover:bg-purple/5"
                    >
                      {summarizing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      تلخيص
                    </button>
                  </div>

                  {/* Escalate form */}
                  {showEscalate && (
                    <div className="rounded-xl border border-orange/30 bg-orange/5 p-4">
                      <h4 className="mb-2 text-xs font-bold text-orange">تصعيد التذكرة للإدارة الأكاديمية</h4>
                      {ticket.profiles?.role === "student" ? (
                        <div className="mb-3 space-y-1 rounded-lg bg-card-bg p-3 text-xs text-text-secondary">
                          <p className="font-medium text-text-primary">التوصيات:</p>
                          <p>✅ يمكنك حل التذكرة إذا كان الاستفسار متعلقاً بمحتوى المادة ويمكنك الرد مباشرة</p>
                          <p>🔼 صعد التذكرة إذا كانت المشكلة <span className="font-medium text-orange">إدارية</span> مثل: طلب إعادة اختبار، تغيير درجة، مشكلة تسجيل، أو أي أمر لا يدخل ضمن صلاحياتك</p>
                        </div>
                      ) : (
                        <p className="mb-2 text-xs text-text-secondary">
                          سيتم إرسال التذكرة إلى الإدارة الأكاديمية مع سبب التصعيد
                        </p>
                      )}
                      <textarea
                        value={escalateReason}
                        onChange={(e) => setEscalateReason(e.target.value)}
                        placeholder="اذكر سبب التصعيد (مثلاً: الطالب يطلب إعادة اختبار وهذا يحتاج موافقة الإدارة)..."
                        rows={3}
                        className="mb-2 w-full rounded-lg border border-orange/30 bg-card-bg px-3 py-2 text-sm outline-none focus:border-orange"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEscalate(ticket.id)}
                          className="rounded-lg bg-orange px-3 py-1.5 text-xs font-medium text-white"
                        >
                          تأكيد التصعيد
                        </button>
                        <button
                          onClick={() => { setShowEscalate(false); setEscalateReason(""); }}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI Summary */}
                  {summary && (
                    <div className="rounded-xl border border-purple/30 bg-purple/5 p-4">
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-purple">
                        <Sparkles className="h-3 w-3" /> ملخص المحادثة
                      </h4>
                      <p className="whitespace-pre-wrap text-sm text-text-primary">{summary}</p>
                    </div>
                  )}

                  {/* Escalation History */}
                  {escalations.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-medium text-text-secondary">سجل التصعيد:</h4>
                      <div className="space-y-1">
                        {escalations.map((esc: Record<string, unknown>) => (
                          <div key={esc.id as string} className="flex items-center gap-2 rounded-lg bg-app-bg px-3 py-2 text-xs">
                            <ArrowUpRight className="h-3 w-3 text-orange shrink-0" />
                            <span className="text-text-primary">
                              {(esc.escalated_by_profile as Record<string, string>)?.first_name}{" "}
                              {(esc.escalated_by_profile as Record<string, string>)?.last_name}
                            </span>
                            <span className="text-text-secondary">←</span>
                            <span className="text-text-primary">
                              {(esc.escalated_to_profile as Record<string, string>)?.first_name}{" "}
                              {(esc.escalated_to_profile as Record<string, string>)?.last_name}
                            </span>
                            <span className="text-text-secondary">— {esc.reason as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {ticketMessages.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-medium text-text-secondary">
                        <MessageSquare className="h-3 w-3" /> المحادثة
                      </h4>
                      <div className="space-y-2">
                        {ticketMessages.map((msg: Record<string, unknown>) => (
                          <div key={msg.id as string} className={`rounded-lg border p-3 ${(msg.sender_id as string) === profileId ? "border-action-blue/20 bg-action-blue/5" : "border-border"}`}>
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

                  {/* Reply */}
                  {(ticket.status === "open" || ticket.status === "in_progress" || ticket.status === "pending_info") && (
                    <div className="flex gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={ticket.status === "pending_info" ? "الرجاء تقديم المعلومات..." : "اكتب رداً..."}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(ticket.id); } }}
                        className="flex-1 rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                      />
                      <button onClick={() => handleSendReply(ticket.id)} disabled={!replyText.trim()} className="rounded-lg bg-action-blue px-3 py-2 text-white disabled:opacity-50">
                        <Send className="h-4 w-4" />
                      </button>
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
