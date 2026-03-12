"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Plus,
  FileText,
  Clock,
  Sparkles,
  MessageSquare,
  X,
} from "lucide-react";
import type { ChatbotConversation } from "@/lib/types/database";
import { getConversationMessages, endConversation } from "./actions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  source_chunk_ids: string[];
  created_at: string;
}

interface SourceChunk {
  id: string;
  page_number: number | null;
  timestamp_sec: number | null;
  content: string;
}

export function UnibotClient({
  conversations: initialConversations,
  profileId,
  tenantId,
}: {
  conversations: ChatbotConversation[];
  profileId: string;
  tenantId: string;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<SourceChunk[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceChunk | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversation(convId: string) {
    setActiveConvId(convId);
    setSources([]);
    setShowSources(false);
    const msgs = await getConversationMessages(convId);
    setMessages(msgs as ChatMessage[]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      source_chunk_ids: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: activeConvId,
          message: userMessage,
          new_conversation: !activeConvId,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      if (!activeConvId && data.conversation_id) {
        const newTitle: string | null = data.conversation_title || null;
        setActiveConvId(data.conversation_id);
        setConversations((prev) => [
          {
            id: data.conversation_id,
            tenant_id: tenantId,
            user_id: profileId,
            session_id: null,
            is_active: true,
            created_at: new Date().toISOString(),
            ended_at: null,
            title: newTitle,
          },
          ...prev,
        ]);
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.message,
        source_chunk_ids: data.sources?.map((s: SourceChunk) => s.id) || [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.sources && data.sources.length > 0) {
        setSources(data.sources);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "حدث خطأ أثناء معالجة طلبك. يُرجى المحاولة مرة أخرى.",
        source_chunk_ids: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleNewConversation() {
    setActiveConvId(null);
    setMessages([]);
    setSources([]);
    setShowSources(false);
  }

  async function handleEndConversation(convId: string) {
    await endConversation(convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) {
      setActiveConvId(null);
      setMessages([]);
    }
  }

  const noAnswerPattern =
    "لم أجد معلومات كافية حول هذا الموضوع في قاعدة معرفتي";

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      <div className="flex w-64 flex-col border-l border-border bg-card-bg">
        <div className="flex items-center justify-between border-b border-border p-3">
          <h2 className="text-sm font-bold text-text-primary">المحادثات</h2>
          <button
            onClick={handleNewConversation}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg hover:text-action-blue"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${activeConvId === conv.id
                ? "bg-action-blue/10 text-action-blue"
                : "text-text-secondary hover:bg-app-bg"
                }`}
              onClick={() => loadConversation(conv.id)}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-right">
                {conv.title
                  ? conv.title
                  : (() => {
                    const d = new Date(conv.created_at);
                    const now = new Date();
                    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
                    if (diffDays === 0) return `اليوم · ${d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`;
                    if (diffDays === 1) return "أمس";
                    return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
                  })()}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEndConversation(conv.id);
                }}
                className="hidden rounded p-0.5 text-text-secondary hover:text-danger group-hover:block"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="p-3 text-center text-xs text-text-secondary">
              لا توجد محادثات بعد
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {showSources && selectedSource ? (
          <div className="flex h-full flex-col border-l border-border">
            <div className="flex items-center justify-between border-b border-border bg-card-bg px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-action-blue" />
                <span className="text-sm font-medium text-text-primary">
                  {selectedSource.page_number
                    ? `صفحة ${selectedSource.page_number}`
                    : selectedSource.timestamp_sec
                      ? `${selectedSource.timestamp_sec} ثانية`
                      : "مصدر"}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowSources(false);
                  setSelectedSource(null);
                }}
                className="rounded-lg p-1 text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="rounded-xl border border-border bg-app-bg p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                  {selectedSource.content}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border bg-gradient-to-l from-ai-light to-ai-lavender px-6 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                <Sparkles className="h-5 w-5 text-purple" />
              </div>
              <div>
                <h1 className="text-base font-bold text-text-primary">
                  UniBot
                </h1>
                <p className="text-xs text-text-secondary">
                  المساعد الذكي — أسأل عن اللوائح والمقررات
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-ai-light to-ai-lavender">
                    <Bot className="h-10 w-10 text-purple" />
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-text-primary">
                    مرحباً بك في UniBot
                  </h2>
                  <p className="mb-6 max-w-md text-sm text-text-secondary">
                    أنا مساعدك الذكي. يمكنني الإجابة على أسئلتك حول اللوائح
                    الأكاديمية والمقررات الدراسية. اسأل أي سؤال!
                  </p>
                  <div className="grid max-w-lg grid-cols-2 gap-3">
                    {[
                      "ما هي شروط الإنذار الأكاديمي؟",
                      "كم عدد ساعات التخرج؟",
                      "ما هي سياسة الغياب؟",
                      "ما هي التكاليف القادمة؟",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setInput(q);
                          inputRef.current?.focus();
                        }}
                        className="rounded-xl border border-border bg-card-bg p-3 text-right text-xs text-text-secondary transition-colors hover:border-action-blue hover:text-action-blue"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${msg.role === "user"
                      ? "bg-action-blue text-white"
                      : "bg-gradient-to-br from-ai-light to-ai-lavender text-purple"
                      }`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.role === "user"
                      ? "bg-action-blue text-white"
                      : msg.content.includes(noAnswerPattern)
                        ? "border border-border bg-app-bg text-text-secondary"
                        : "border border-border bg-card-bg text-text-primary"
                      }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </p>
                    {msg.role === "assistant" &&
                      msg.source_chunk_ids.length > 0 &&
                      sources.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                          {sources
                            .filter((s) =>
                              msg.source_chunk_ids.includes(s.id)
                            )
                            .map((source, idx) => (
                              <button
                                key={source.id}
                                onClick={() => {
                                  setSelectedSource(source);
                                  setShowSources(true);
                                }}
                                className="flex items-center gap-1 rounded-full bg-action-blue/10 px-2.5 py-1 text-xs font-medium text-action-blue transition-colors hover:bg-action-blue/20"
                              >
                                {source.page_number ? (
                                  <>
                                    <FileText className="h-3 w-3" />
                                    ص. {source.page_number}
                                  </>
                                ) : source.timestamp_sec ? (
                                  <>
                                    <Clock className="h-3 w-3" />
                                    {source.timestamp_sec}ث
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-3 w-3" />
                                    مصدر {idx + 1}
                                  </>
                                )}
                              </button>
                            ))}
                        </div>
                      )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="mb-4 flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ai-light to-ai-lavender text-purple">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-purple/60 [animation-delay:0ms]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-purple/60 [animation-delay:150ms]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-purple/60 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border bg-card-bg px-6 py-4">
              <form onSubmit={handleSend} className="flex gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder="اكتب سؤالك هنا..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-border bg-app-bg px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-action-blue"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-action-blue text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
