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
} from "lucide-react";
import type { TicketStatus, TicketCategory } from "@/lib/types/database";
import {
  updateTicketStatus,
  assignTicket,
  sendAdminTicketMessage,
  getTicketDetail,
  createApprovalWorkflow,
  decideApproval,
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

const categoryLabels: Record<TicketCategory, string> = {
  grade_appeal: "طعن في درجة",
  absence_excuse: "عذر غياب",
  registration_issue: "مشكلة تسجيل",
  schedule_change: "طلب تغيير جدول",
  venue_issue: "مشكلة قاعة",
  technical_problem: "مشكلة تقنية",
  administrative: "إداري عام",
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
  } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

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
    try {
      const data = await getTicketDetail(ticketId);
      setDetail({ messages: data.messages, workflows: data.workflows });
    } catch {
      setDetail({ messages: [], workflows: [] });
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
      setDetail({ messages: data.messages, workflows: data.workflows });
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
      setDetail({ messages: data.messages, workflows: data.workflows });
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
      setDetail({ messages: data.messages, workflows: data.workflows });
      toast.success(decision === "approved" ? "تمت الموافقة" : "تم الرفض");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
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
                  </div>

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
