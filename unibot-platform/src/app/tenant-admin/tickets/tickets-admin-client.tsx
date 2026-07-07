"use client";

import { useState } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Send,
  UserPlus,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Eye,
  EyeOff,
  Star,
  Ticket,
  Gauge,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { TicketStatus, TicketPriority } from "@/lib/types/database";
import {
  updateTicketStatus,
  assignTicket,
  sendTicketMessage,
  getTicketDetail,
  summarizeConversation,
} from "./actions";

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
  grade_appeal: "طعن في درجة",
  absence_excuse: "عذر غياب",
  registration_issue: "مشكلة تسجيل",
  schedule_change: "طلب تغيير جدول",
  venue_issue: "مشكلة قاعة",
  technical_problem: "مشكلة تقنية",
  administrative: "إداري عام",
  course_content_query: "استفسار عن محتوى المادة",
  leave_excuse_request: "طلب إجازة/عذر",
  schedule_conflict: "تعارض جدول",
  other: "أخرى",
};

const statusTransitions: Record<string, TicketStatus[]> = {
  open: ["in_progress", "rejected", "closed"],
  in_progress: ["pending_info", "resolved", "rejected"],
  pending_info: ["in_progress", "resolved", "closed"],
  resolved: ["closed"],
  closed: [],
  rejected: [],
};

interface TicketData {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: TicketStatus;
  ai_attempted: boolean;
  ai_suggestion: string | null;
  priority_reason?: string | null;
  is_direct_to_faculty?: boolean;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  rating: number | null;
  profiles?: { first_name: string; last_name: string; role: string };
  assigned_profile?: { first_name: string; last_name: string } | null;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface DashboardStats {
  total: number;
  open: number;
  urgent: number;
  byCategory: Record<string, number>;
}

export function TicketsAdminClient({
  tickets,
  staff,
  stats,
}: {
  tickets: TicketData[];
  staff: StaffMember[];
  stats: DashboardStats;
}) {
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    messages: Record<string, unknown>[];
    workflows: Record<string, unknown>[];
    escalations: Record<string, unknown>[];
  } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  async function handleExpand(ticketId: string) {
    if (expandedId === ticketId) {
      setExpandedId(null);
      setDetail(null);
      setSummary(null);
      return;
    }
    setExpandedId(ticketId);
    try {
      const data = await getTicketDetail(ticketId);
      setDetail({ messages: data.messages, workflows: data.workflows, escalations: data.escalations });
      setSummary(null);
    } catch {
      setDetail({ messages: [], workflows: [], escalations: [] });
    }
  }

  async function handleStatusChange(ticketId: string, newStatus: TicketStatus) {
    try {
      await updateTicketStatus(ticketId, newStatus);
      toast.success("تم تحديث الحالة");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleAssign(ticketId: string, assigneeId: string) {
    try {
      await assignTicket(ticketId, assigneeId);
      toast.success("تم تعيين التذكرة");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleSendReply(ticketId: string) {
    if (!replyText.trim()) return;
    try {
      await sendTicketMessage(ticketId, replyText.trim(), isInternal);
      setReplyText("");
      const data = await getTicketDetail(ticketId);
      setDetail({ messages: data.messages, workflows: data.workflows, escalations: data.escalations });
      toast.success("تم إرسال الرد");
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">الإشراف على التذاكر</h1>
        <p className="text-sm text-text-secondary">
          متابعة وإدارة جميع التذاكر الأكاديمية في الجامعة
        </p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <p className="text-xs text-text-secondary">الإجمالي</p>
          <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <p className="text-xs text-text-secondary">مفتوحة</p>
          <p className="text-2xl font-bold text-action-blue">{stats.open}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <p className="text-xs text-text-secondary">عاجلة</p>
          <p className="text-2xl font-bold text-danger">{stats.urgent}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <p className="text-xs text-text-secondary">تم الحل</p>
          <p className="text-2xl font-bold text-success">{tickets.filter((t) => t.status === "resolved").length}</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, count]) => (
          <span key={cat} className="rounded-full bg-app-bg px-3 py-1 text-xs text-text-secondary">
            {categoryLabels[cat] || cat}: {count}
          </span>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "open", "in_progress", "pending_info", "resolved", "closed", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-action-blue text-white"
                : "bg-app-bg text-text-secondary hover:bg-border"
            }`}
          >
            {s === "all" ? "الكل" : statusConfig[s as TicketStatus]?.label || s}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card-bg p-12 text-center">
            <Ticket className="mx-auto mb-3 h-12 w-12 text-text-secondary/50" />
            <p className="text-sm text-text-secondary">لا توجد تذاكر بهذا الفلتر</p>
          </div>
        )}

        {filtered.map((ticket) => {
          const status = statusConfig[ticket.status];
          const StatusIcon = status.icon;
          const priority = priorityConfig[ticket.priority as TicketPriority] || priorityConfig.medium;
          const isExpanded = expandedId === ticket.id;

          return (
            <div key={ticket.id} className="rounded-2xl border border-border bg-card-bg">
              {/* Header */}
              <div className="flex cursor-pointer items-center gap-4 p-4" onClick={() => handleExpand(ticket.id)}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${status.bg}`}>
                  <StatusIcon className={`h-5 w-5 ${status.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text-primary">
                      {ticket.title || categoryLabels[ticket.category]}
                    </p>
                    <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                      {ticket.ticket_number}
                    </span>
                    {ticket.ai_attempted && <Sparkles className="h-3.5 w-3.5 text-purple" />}
                    {ticket.is_direct_to_faculty && (
                      <span className="rounded-full bg-purple/10 px-2 py-0.5 text-[10px] text-purple">مباشر لمحاضر</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mt-1">
                    <span className="text-action-blue">
                      {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                      <span className="text-text-secondary"> ({ticket.profiles?.role === "student" ? "طالب" : ticket.profiles?.role === "faculty" ? "محاضر" : ticket.profiles?.role})</span>
                    </span>
                    <span>•</span>
                    <span>{categoryLabels[ticket.category]}</span>
                    <span>•</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString("ar-SA")}</span>
                    {ticket.assigned_profile && (
                      <>
                        <span>•</span>
                        <span className="text-action-blue">← {ticket.assigned_profile.first_name} {ticket.assigned_profile.last_name}</span>
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
                {ticket.rating && (
                  <div className="hidden sm:flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <Star key={r} className={`h-3 w-3 ${r <= ticket.rating! ? "fill-warning text-warning" : "text-border"}`} />
                    ))}
                  </div>
                )}
                {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-text-secondary" /> : <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />}
              </div>

              {/* Expanded */}
              {isExpanded && detail && (
                <div className="space-y-4 border-t border-border p-4">
                  <div className="rounded-lg bg-app-bg p-3">
                    <p className="whitespace-pre-wrap text-sm text-text-primary">{ticket.description}</p>
                  </div>

                  {ticket.ai_suggestion && (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                      <p className="mb-1 text-xs font-medium text-warning">اقتراح UniBot:</p>
                      <p className="text-sm text-text-primary">{ticket.ai_suggestion}</p>
                    </div>
                  )}

                  {/* Priority reason */}
                  {ticket.priority_reason && (
                    <div className="flex items-center gap-2 rounded-lg bg-academic-navy/[0.04] p-2">
                      <Gauge className="h-3.5 w-3.5 text-text-secondary" />
                      <span className="text-xs text-text-secondary">{ticket.priority_reason}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-text-secondary">تغيير الحالة:</span>
                    {statusTransitions[ticket.status]?.map((newStatus) => (
                      <button
                        key={newStatus}
                        onClick={() => handleStatusChange(ticket.id, newStatus)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${statusConfig[newStatus].bg} ${statusConfig[newStatus].text} hover:opacity-80`}
                      >
                        {statusConfig[newStatus].label}
                      </button>
                    ))}
                    <div className="flex items-center gap-2 mr-2">
                      <UserPlus className="h-3.5 w-3.5 text-text-secondary" />
                      <select
                        onChange={(e) => { if (e.target.value) handleAssign(ticket.id, e.target.value); }}
                        className="rounded-lg border border-border bg-app-bg px-2 py-1 text-xs text-text-primary outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>تعيين لـ...</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.role})</option>
                        ))}
                      </select>
                    </div>
                    {/* AI Summarize */}
                    <button
                      onClick={() => handleSummarize(ticket.id)}
                      disabled={summarizing}
                      className="flex items-center gap-1 rounded-lg border border-purple/30 px-2.5 py-1 text-xs font-medium text-purple hover:bg-purple/5"
                    >
                      {summarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      تلخيص
                    </button>
                  </div>

                  {/* Summary */}
                  {summary && (
                    <div className="rounded-xl border border-purple/30 bg-purple/5 p-4">
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-purple">
                        <Sparkles className="h-3 w-3" /> ملخص المحادثة
                      </h4>
                      <p className="whitespace-pre-wrap text-sm text-text-primary">{summary}</p>
                    </div>
                  )}

                  {/* Approval Workflows */}
                  {detail.workflows.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-bold text-text-primary">مسار الموافقات</h4>
                      <div className="space-y-2">
                        {detail.workflows.map((wf: Record<string, unknown>) => (
                          <div key={wf.id as string} className="flex items-center gap-3 rounded-lg border border-border p-3">
                            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              wf.status === "approved" ? "bg-success/10 text-success" : wf.status === "rejected" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                            }`}>
                              {wf.step_order as number}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-text-primary">
                                {(wf.profiles as Record<string, string>)?.first_name} {(wf.profiles as Record<string, string>)?.last_name}
                              </p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              wf.status === "approved" ? "bg-success/10 text-success" : wf.status === "rejected" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                            }`}>
                              {wf.status === "approved" ? "موافق" : wf.status === "rejected" ? "مرفوض" : "معلّق"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Escalations */}
                  {detail.escalations.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-medium text-text-secondary">
                        <ArrowUpRight className="h-3 w-3" /> سجل التصعيد
                      </h4>
                      <div className="space-y-1">
                        {detail.escalations.map((esc: Record<string, unknown>) => (
                          <div key={esc.id as string} className="flex items-center gap-2 rounded-lg bg-app-bg px-3 py-2 text-xs">
                            <ArrowUpRight className="h-3 w-3 text-orange shrink-0" />
                            <span className="text-text-primary">
                              {(esc.escalated_by_profile as Record<string, string>)?.first_name}
                            </span>
                            <span className="text-text-secondary">({esc.from_role as string})</span>
                            <span className="text-text-secondary">←</span>
                            <span className="text-text-primary">
                              {(esc.escalated_to_profile as Record<string, string>)?.first_name}
                            </span>
                            <span className="text-text-secondary">({esc.to_role as string})</span>
                            <span className="text-text-secondary">— {esc.reason as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {detail.messages.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-text-primary">
                        <MessageSquare className="h-3.5 w-3.5" /> الرسائل
                      </h4>
                      <div className="space-y-2">
                        {detail.messages.map((msg: Record<string, unknown>) => (
                          <div key={msg.id as string} className={`rounded-lg border p-3 ${(msg.is_internal as boolean) ? "border-purple/30 bg-purple/5" : "border-border"}`}>
                            <div className="mb-1 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-text-primary">
                                  {(msg.profiles as Record<string, string>)?.first_name} {(msg.profiles as Record<string, string>)?.last_name}
                                </span>
                                {(msg.is_internal as boolean) && (
                                  <span className="flex items-center gap-0.5 text-xs text-purple">
                                    <EyeOff className="h-3 w-3" /> داخلي
                                  </span>
                                )}
                              </div>
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
                  {ticket.status !== "closed" && ticket.status !== "rejected" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsInternal(!isInternal)}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${
                            isInternal ? "bg-purple/10 text-purple" : "bg-app-bg text-text-secondary"
                          }`}
                        >
                          {isInternal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {isInternal ? "ملاحظة داخلية" : "رد عام"}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={isInternal ? "اكتب ملاحظة داخلية..." : "اكتب رداً..."}
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
