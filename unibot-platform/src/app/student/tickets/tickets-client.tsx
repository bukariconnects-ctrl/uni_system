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
  Star,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
} from "lucide-react";
import type {
  Ticket as TicketType,
  TicketCategory,
  TicketStatus,
} from "@/lib/types/database";
import {
  createTicket,
  getAiSuggestion,
  getTicketMessages,
  sendTicketMessage,
  rateTicket,
} from "./actions";

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

interface Section {
  id: string;
  section_code: string;
  courses: { name: string } | null;
}

export function TicketsClient({
  tickets,
  sections,
  profileId,
  tenantId,
}: {
  tickets: TicketType[];
  sections: Section[];
  profileId: string;
  tenantId: string;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<Record<string, unknown>[]>([]);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleStep1Submit(formData: FormData) {
    const desc = formData.get("description") as string;
    setDescription(desc);
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
    setError("");
    try {
      formData.set("ai_attempted", "true");
      formData.set("ai_suggestion", aiSuggestion || "");
      formData.set("auto_close", "true");
      formData.set("description", description);
      await createTicket(formData);
      setSuccess("تم حل المشكلة تلقائياً بواسطة UniBot");
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleRejectAi(formData: FormData) {
    setError("");
    try {
      formData.set("ai_attempted", "true");
      formData.set("ai_suggestion", aiSuggestion || "");
      formData.set("auto_close", "false");
      formData.set("description", description);
      await createTicket(formData);
      setSuccess("تم فتح التذكرة بنجاح");
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleNoAiSubmit(formData: FormData) {
    setError("");
    try {
      formData.set("ai_attempted", "false");
      formData.set("auto_close", "false");
      formData.set("description", description);
      await createTicket(formData);
      setSuccess("تم فتح التذكرة بنجاح");
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }

  function resetForm() {
    setShowCreate(false);
    setStep(1);
    setAiSuggestion(null);
    setDescription("");
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleRate(ticketId: string, rating: number) {
    try {
      await rateTicket(ticketId, rating);
      setSuccess("شكراً على تقييمك");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }

  return (
    <div className="space-y-6 p-6">
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
          }}
          className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          تذكرة جديدة
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          {success}
        </div>
      )}

      {showCreate && (
        <div className="rounded-2xl border border-border bg-card-bg p-6">
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

          {step === 1 && (
            <form action={handleStep1Submit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  نوع التذكرة
                </label>
                <select
                  name="category"
                  required
                  className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                >
                  {Object.entries(categoryLabels).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  العنوان
                </label>
                <input
                  name="title"
                  required
                  className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  الوصف التفصيلي
                </label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  الشعبة ذات الصلة (اختياري)
                </label>
                <select
                  name="section_id"
                  className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                >
                  <option value="">بدون تحديد</option>
                  {sections.map((s: Section) => (
                    <option key={s.id} value={s.id}>
                      {s.courses?.name} — {s.section_code}
                    </option>
                  ))}
                </select>
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
              </div>
            </form>
          )}

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
                      <p className="text-xs text-text-secondary">UniBot وجد إجابة محتملة لمشكلتك</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                      {aiSuggestion}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <form action={handleAcceptAi}>
                        <input type="hidden" name="category" value="other" />
                        <input type="hidden" name="title" value="حل بواسطة AI" />
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
                  <p className="mb-3 text-sm text-text-secondary">
                    لم يتمكن UniBot من إيجاد إجابة. سيتم توجيه تذكرتك للإدارة
                    الأكاديمية.
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

          {step === 3 && (
            <form action={handleRejectAi} className="space-y-4">
              <input type="hidden" name="category" value="other" />
              <input type="hidden" name="title" value="" />
              <div className="rounded-lg border border-border bg-app-bg p-4">
                <p className="text-sm text-text-secondary">
                  <strong>الوصف:</strong> {description}
                </p>
              </div>
              {aiSuggestion && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <p className="text-xs text-text-secondary">
                    <strong>اقتراح UniBot (مرفق):</strong> {aiSuggestion.substring(0, 100)}...
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
                >
                  <Send className="h-4 w-4" />
                  إرسال التذكرة
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
              <input type="hidden" name="category" value="other" />
              <input type="hidden" name="title" value="" />
            </form>
          )}
        </div>
      )}

      <div className="space-y-3">
        {tickets.length === 0 && !showCreate && (
          <div className="rounded-2xl border border-border bg-card-bg p-12 text-center">
            <Ticket className="mx-auto mb-3 h-12 w-12 text-text-secondary/50" />
            <p className="text-lg font-medium text-text-primary">
              لا توجد تذاكر بعد
            </p>
            <p className="text-sm text-text-secondary">
              أنشئ تذكرة جديدة للتواصل مع الإدارة الأكاديمية
            </p>
          </div>
        )}

        {tickets.map((ticket) => {
          const status = statusConfig[ticket.status];
          const StatusIcon = status.icon;
          const isExpanded = expandedTicket === ticket.id;

          return (
            <div
              key={ticket.id}
              className="rounded-2xl border border-border bg-card-bg"
            >
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
                    <span>{categoryLabels[ticket.category]}</span>
                    <span>
                      {new Date(ticket.created_at).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.text}`}
                >
                  {status.label}
                </span>

                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-text-secondary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-secondary" />
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-border p-4">
                  <div className="mb-4 rounded-lg bg-app-bg p-3">
                    <p className="whitespace-pre-wrap text-sm text-text-primary">
                      {ticket.description}
                    </p>
                  </div>

                  {ticket.ai_suggestion && (
                    <div className="mb-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
                      <p className="mb-1 text-xs font-medium text-warning">
                        اقتراح UniBot:
                      </p>
                      <p className="text-sm text-text-primary">
                        {ticket.ai_suggestion}
                      </p>
                    </div>
                  )}

                  {ticketMessages.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <h4 className="flex items-center gap-1 text-xs font-medium text-text-secondary">
                        <MessageSquare className="h-3 w-3" />
                        الردود
                      </h4>
                      {ticketMessages.map((msg: Record<string, unknown>) => (
                        <div
                          key={msg.id as string}
                          className="rounded-lg border border-border p-3"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-medium text-text-primary">
                              {(msg.profiles as Record<string, string>)?.first_name}{" "}
                              {(msg.profiles as Record<string, string>)?.last_name}
                            </span>
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
                      ))}
                    </div>
                  )}

                  {ticket.status !== "closed" &&
                    ticket.status !== "resolved" && (
                      <div className="flex gap-2">
                        <input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="اكتب رداً..."
                          className="flex-1 rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                        />
                        <button
                          onClick={() => handleSendReply(ticket.id)}
                          className="rounded-lg bg-action-blue px-3 py-2 text-white"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                  {ticket.status === "resolved" && !ticket.rating && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-text-secondary">
                        قيّم الخدمة:
                      </span>
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
                  )}

                  {ticket.rating && (
                    <div className="mt-3 flex items-center gap-1">
                      <span className="text-xs text-text-secondary">
                        تقييمك:
                      </span>
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
