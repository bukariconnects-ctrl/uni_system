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
  Shield,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Eye,
  EyeOff,
  Star,
  Ticket,
  ArrowUpRight,
  User,
} from "lucide-react";
import type { TicketStatus, TicketCategory } from "@/lib/types/database";
import {
  updateTicketStatus,
  assignTicket,
  sendAdminTicketMessage,
  getTicketDetail,
  createApprovalWorkflow,
  decideApproval,
  escalateToFaculty,
  getFacultyMembers,
} from "./actions";
import { toast } from "sonner";

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
  category: TicketCategory;
  priority: string;
  status: TicketStatus;
  ai_attempted: boolean;
  ai_suggestion: string | null;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  rating: number | null;
  profiles?: { first_name: string; last_name: string; email: string; role: string };
  assigned_profile?: { first_name: string; last_name: string } | null;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export function TicketsAdminClient({
  tickets,
  staff,
}: {
  tickets: TicketData[];
  staff: StaffMember[];
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
  const [showEscalateFaculty, setShowEscalateFaculty] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [escalateFacultyId, setEscalateFacultyId] = useState("");
  const [facultyList, setFacultyList] = useState<StaffMember[]>([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);

  const filtered =
    filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const stats = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    total: tickets.length,
  };

  async function handleExpand(ticketId: string) {
    if (expandedId === ticketId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(ticketId);
    setShowEscalateFaculty(false);
    setEscalateReason("");
    try {
      const data = await getTicketDetail(ticketId);
      setDetail({ messages: data.messages, workflows: data.workflows, escalations: data.escalations || [] });
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
      await sendAdminTicketMessage(ticketId, replyText.trim(), isInternal);
      setReplyText("");
      const data = await getTicketDetail(ticketId);
      setDetail({ messages: data.messages, workflows: data.workflows, escalations: data.escalations || [] });
      toast.success("تم إرسال الرد");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleAddApprover(ticketId: string, approverId: string) {
    try {
      const currentSteps = detail?.workflows?.length || 0;
      await createApprovalWorkflow(ticketId, approverId, currentSteps + 1);
      const data = await getTicketDetail(ticketId);
      setDetail({ messages: data.messages, workflows: data.workflows, escalations: data.escalations || [] });
      toast.success("تمت إضافة مسار الموافقة");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleDecision(
    workflowId: string,
    decision: "approved" | "rejected",
    ticketId: string
  ) {
    try {
      await decideApproval(workflowId, decision, "");
      const data = await getTicketDetail(ticketId);
      setDetail({ messages: data.messages, workflows: data.workflows, escalations: data.escalations || [] });
      toast.success(decision === "approved" ? "تمت الموافقة" : "تم الرفض");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleEscalateToFaculty(ticketId: string) {
    if (!escalateReason.trim()) {
      toast.error("الرجاء كتابة سبب التصعيد");
      return;
    }
    if (!escalateFacultyId) {
      toast.error("الرجاء اختيار المحاضر");
      return;
    }
    try {
      await escalateToFaculty(ticketId, escalateFacultyId, escalateReason.trim());
      toast.success("تم تحويل التذكرة إلى المحاضر");
      setShowEscalateFaculty(false);
      setEscalateReason("");
      setEscalateFacultyId("");
      const data = await getTicketDetail(ticketId);
      setDetail({ messages: data.messages, workflows: data.workflows, escalations: data.escalations || [] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleOpenEscalateFaculty() {
    setShowEscalateFaculty(true);
    if (facultyList.length === 0 && !loadingFaculty) {
      setLoadingFaculty(true);
      try {
        const list = await getFacultyMembers();
        setFacultyList(list);
      } catch {
        toast.error("فشل في تحميل قائمة المحاضرين");
      } finally {
        setLoadingFaculty(false);
      }
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">إدارة التذاكر</h1>
        <p className="text-sm text-text-secondary">
          معالجة وتعيين ومتابعة التذاكر الأكاديمية
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <p className="text-sm text-text-secondary">الإجمالي</p>
          <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <p className="text-sm text-text-secondary">مفتوحة</p>
          <p className="text-2xl font-bold text-action-blue">{stats.open}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <p className="text-sm text-text-secondary">قيد المعالجة</p>
          <p className="text-2xl font-bold text-warning">{stats.in_progress}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card-bg p-4">
          <p className="text-sm text-text-secondary">تم الحل</p>
          <p className="text-2xl font-bold text-success">{stats.resolved}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(
          [
            "all",
            "open",
            "in_progress",
            "pending_info",
            "resolved",
            "closed",
            "rejected",
          ] as const
        ).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s
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

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card-bg p-12 text-center">
            <Ticket className="mx-auto mb-3 h-12 w-12 text-text-secondary/50" />
            <p className="text-sm text-text-secondary">
              لا توجد تذاكر بهذا الفلتر
            </p>
          </div>
        )}

        {filtered.map((ticket) => {
          const status = statusConfig[ticket.status];
          const StatusIcon = status.icon;
          const isExpanded = expandedId === ticket.id;

          return (
            <div
              key={ticket.id}
              className="rounded-2xl border border-border bg-card-bg"
            >
              <div
                className="flex cursor-pointer items-center gap-4 p-4"
                onClick={() => handleExpand(ticket.id)}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${status.bg}`}
                >
                  <StatusIcon className={`h-5 w-5 ${status.text}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text-primary">
                      {ticket.title}
                    </p>
                    <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                      {ticket.ticket_number}
                    </span>
                    {ticket.ai_attempted && (
                      <Sparkles className="h-3.5 w-3.5 text-purple" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span>
                      {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                    </span>
                    <span>{categoryLabels[ticket.category]}</span>
                    <span>
                      {new Date(ticket.created_at).toLocaleDateString("ar-SA")}
                    </span>
                    {ticket.assigned_profile && (
                      <span className="text-action-blue">
                        ← {ticket.assigned_profile.first_name}{" "}
                        {ticket.assigned_profile.last_name}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.text}`}
                >
                  {status.label}
                </span>

                {ticket.rating && (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <Star
                        key={r}
                        className={`h-3 w-3 ${r <= ticket.rating! ? "fill-warning text-warning" : "text-border"}`}
                      />
                    ))}
                  </div>
                )}

                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-text-secondary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-secondary" />
                )}
              </div>

              {isExpanded && detail && (
                <div className="space-y-4 border-t border-border p-4">
                  <div className="rounded-lg bg-app-bg p-3">
                    <p className="whitespace-pre-wrap text-sm text-text-primary">
                      {ticket.description}
                    </p>
                  </div>

                  {ticket.ai_suggestion && (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                      <p className="mb-1 text-xs font-medium text-warning">
                        اقتراح UniBot:
                      </p>
                      <p className="text-sm text-text-primary">
                        {ticket.ai_suggestion}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">
                        تغيير الحالة:
                      </span>
                      {statusTransitions[ticket.status]?.map((newStatus) => (
                        <button
                          key={newStatus}
                          onClick={() =>
                            handleStatusChange(ticket.id, newStatus)
                          }
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${statusConfig[newStatus].bg} ${statusConfig[newStatus].text} hover:opacity-80`}
                        >
                          {statusConfig[newStatus].label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <UserPlus className="h-3.5 w-3.5 text-text-secondary" />
                      <select
                        onChange={(e) => {
                          if (e.target.value)
                            handleAssign(ticket.id, e.target.value);
                        }}
                        className="rounded-lg border border-border bg-app-bg px-2 py-1 text-xs text-text-primary outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          تعيين لـ...
                        </option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.first_name} {s.last_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Escalate to Faculty (only for student tickets) */}
                    {ticket.status !== "closed" && ticket.status !== "rejected" && ticket.profiles?.role === "student" && (
                      <button
                        onClick={handleOpenEscalateFaculty}
                        className="flex items-center gap-1 rounded-lg border border-warning/30 px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning/5"
                      >
                        <User className="h-3 w-3" />
                        تحويل لمحاضر المادة
                      </button>
                    )}
                  </div>

                  {/* Escalate to Faculty Form */}
                  {showEscalateFaculty && (
                    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                      <h4 className="mb-2 text-xs font-bold text-warning">تحويل إلى محاضر المادة</h4>
                      <p className="mb-2 text-xs text-text-secondary">
                        تحويل التذكرة إلى المحاضر المختص لمعالجتها مباشرة
                      </p>
                      <select
                        value={escalateFacultyId}
                        onChange={(e) => setEscalateFacultyId(e.target.value)}
                        className="mb-2 w-full rounded-lg border border-warning/30 bg-card-bg px-3 py-2 text-sm outline-none focus:border-warning"
                      >
                        <option value="">اختر المحاضر...</option>
                        {loadingFaculty ? (
                          <option disabled>جاري التحميل...</option>
                        ) : (
                          facultyList.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.first_name} {f.last_name}
                            </option>
                          ))
                        )}
                      </select>
                      <textarea
                        value={escalateReason}
                        onChange={(e) => setEscalateReason(e.target.value)}
                        placeholder="سبب التحويل..."
                        rows={2}
                        className="mb-2 w-full rounded-lg border border-warning/30 bg-card-bg px-3 py-2 text-sm outline-none focus:border-warning"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEscalateToFaculty(ticket.id)}
                          className="rounded-lg bg-warning px-3 py-1.5 text-xs font-medium text-white"
                        >
                          تأكيد التحويل
                        </button>
                        <button
                          onClick={() => { setShowEscalateFaculty(false); setEscalateReason(""); setEscalateFacultyId(""); }}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {detail.workflows.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-text-primary">
                        <Shield className="h-3.5 w-3.5" />
                        مسار الموافقات
                      </h4>
                      <div className="space-y-2">
                        {detail.workflows.map(
                          (wf: Record<string, unknown>) => {
                            const wfStatus = wf.status as string;
                            return (
                              <div
                                key={wf.id as string}
                                className="flex items-center gap-3 rounded-lg border border-border p-3"
                              >
                                <div
                                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                    wfStatus === "approved"
                                      ? "bg-success/10 text-success"
                                      : wfStatus === "rejected"
                                        ? "bg-danger/10 text-danger"
                                        : "bg-warning/10 text-warning"
                                  }`}
                                >
                                  {wf.step_order as number}
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-text-primary">
                                    {
                                      (
                                        wf.profiles as Record<
                                          string,
                                          string
                                        >
                                      )?.first_name
                                    }{" "}
                                    {
                                      (
                                        wf.profiles as Record<
                                          string,
                                          string
                                        >
                                      )?.last_name
                                    }
                                  </p>
                                  {wf.decision_notes ? (
                                    <p className="text-xs text-text-secondary">
                                      {String(wf.decision_notes)}
                                    </p>
                                  ) : null}
                                </div>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    wfStatus === "approved"
                                      ? "bg-success/10 text-success"
                                      : wfStatus === "rejected"
                                        ? "bg-danger/10 text-danger"
                                        : "bg-warning/10 text-warning"
                                  }`}
                                >
                                  {wfStatus === "approved"
                                    ? "موافق"
                                    : wfStatus === "rejected"
                                      ? "مرفوض"
                                      : "معلّق"}
                                </span>
                                {wfStatus === "pending" && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() =>
                                        handleDecision(
                                          wf.id as string,
                                          "approved",
                                          ticket.id
                                        )
                                      }
                                      className="rounded bg-success/10 px-2 py-1 text-xs text-success hover:bg-success/20"
                                    >
                                      موافقة
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDecision(
                                          wf.id as string,
                                          "rejected",
                                          ticket.id
                                        )
                                      }
                                      className="rounded bg-danger/10 px-2 py-1 text-xs text-danger hover:bg-danger/20"
                                    >
                                      رفض
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-text-secondary" />
                    <select
                      onChange={(e) => {
                        if (e.target.value)
                          handleAddApprover(ticket.id, e.target.value);
                      }}
                      className="rounded-lg border border-border bg-app-bg px-2 py-1 text-xs text-text-primary outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        إضافة خطوة موافقة...
                      </option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Escalation History */}
                  {detail.escalations.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-medium text-text-secondary">
                        <ArrowUpRight className="h-3 w-3" /> سجل التحويلات والتصعيد
                      </h4>
                      <div className="space-y-1">
                        {detail.escalations.map((esc: Record<string, unknown>) => (
                          <div key={esc.id as string} className="flex items-center gap-2 rounded-lg bg-app-bg px-3 py-2 text-xs">
                            {esc.to_role === "faculty" ? (
                              <ArrowUpRight className="h-3 w-3 text-warning shrink-0" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 text-orange shrink-0" />
                            )}
                            <span className="text-text-primary">
                              {(esc.escalated_by_profile as Record<string, string>)?.first_name}
                            </span>
                            <span className="text-text-secondary">({esc.from_role as string === "academic_management" ? "إدارة أكاديمية" : esc.from_role as string})</span>
                            <span className="text-text-secondary">←</span>
                            <span className="text-text-primary">
                              {(esc.escalated_to_profile as Record<string, string>)?.first_name}
                            </span>
                            <span className="text-text-secondary">({esc.to_role as string === "faculty" ? "محاضر" : esc.to_role as string})</span>
                            <span className="text-text-secondary">— {esc.reason as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail.messages.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-text-primary">
                        <MessageSquare className="h-3.5 w-3.5" />
                        الرسائل
                      </h4>
                      <div className="space-y-2">
                        {detail.messages.map(
                          (msg: Record<string, unknown>) => (
                            <div
                              key={msg.id as string}
                              className={`rounded-lg border p-3 ${
                                (msg.is_internal as boolean)
                                  ? "border-purple/30 bg-purple/5"
                                  : "border-border"
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-text-primary">
                                    {
                                      (
                                        msg.profiles as Record<
                                          string,
                                          string
                                        >
                                      )?.first_name
                                    }{" "}
                                    {
                                      (
                                        msg.profiles as Record<
                                          string,
                                          string
                                        >
                                      )?.last_name
                                    }
                                  </span>
                                  {(msg.is_internal as boolean) && (
                                    <span className="flex items-center gap-0.5 text-xs text-purple">
                                      <EyeOff className="h-3 w-3" />
                                      داخلي
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-text-secondary">
                                  {new Date(
                                    msg.created_at as string
                                  ).toLocaleString("ar-SA")}
                                </span>
                              </div>
                              <p className="text-sm text-text-primary">
                                {msg.body as string}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {ticket.status !== "closed" &&
                    ticket.status !== "rejected" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsInternal(!isInternal)}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${
                              isInternal
                                ? "bg-purple/10 text-purple"
                                : "bg-app-bg text-text-secondary"
                            }`}
                          >
                            {isInternal ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                            {isInternal ? "ملاحظة داخلية" : "رد عام"}
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={
                              isInternal
                                ? "اكتب ملاحظة داخلية..."
                                : "اكتب رداً..."
                            }
                            className="flex-1 rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                          />
                          <button
                            onClick={() => handleSendReply(ticket.id)}
                            className="rounded-lg bg-action-blue px-3 py-2 text-white transition-colors hover:bg-action-blue/90"
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
