"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  Send,
  Bot,
  User,
  Plus,
  FileText,
  Clock,
  Sparkles,
  X,
  BookOpen,
  ChevronDown,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Mic,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import type { ChatbotConversation } from "@/lib/types/database";
import { getConversationMessages, endConversation } from "./actions";

// ── Markdown renderer for AI responses ───────────────────────────────────────
// Applies design-system classes to each Markdown token so the output
// blends seamlessly with the existing chat bubble UI.
const MD_COMPONENTS: Components = {
  // Paragraphs — match existing plain-text style
  p: ({ children }) => (
    <p className="mb-2 text-sm leading-relaxed last:mb-0">{children}</p>
  ),
  // Bold
  strong: ({ children }) => (
    <strong className="font-semibold text-inherit">{children}</strong>
  ),
  // Italic
  em: ({ children }) => <em className="italic">{children}</em>,
  // Unordered list — RTL aware (pr instead of pl)
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pr-5 text-sm last:mb-0">{children}</ul>
  ),
  // Ordered list
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pr-5 text-sm last:mb-0">{children}</ol>
  ),
  // List item
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  // Headings
  h1: ({ children }) => (
    <h1 className="mb-2 text-base font-bold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1.5 text-sm font-bold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 text-sm font-semibold">{children}</h3>
  ),
  // Inline code
  code: ({ children, className }) =>
    className ? (
      // Fenced code block
      <pre className="my-2 overflow-x-auto rounded-lg bg-black/10 p-3 text-xs">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="rounded bg-black/10 px-1 py-0.5 text-xs">{children}</code>
    ),
  // Horizontal rule
  hr: () => <hr className="my-3 border-border/40" />,
  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-r-2 border-action-blue/50 pr-3 text-sm italic text-text-secondary">
      {children}
    </blockquote>
  ),
  // Links — open in new tab
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-action-blue underline underline-offset-2 hover:text-action-blue/80"
    >
      {children}
    </a>
  ),
};

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
      {content}
    </ReactMarkdown>
  );
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  source_chunk_ids: string[];
  created_at: string;
  audio?: { data: string; mimeType: string };
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
  studentName,
}: {
  conversations: ChatbotConversation[];
  profileId: string;
  tenantId: string;
  studentName: string;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<SourceChunk[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceChunk | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const convDropdownRef = useRef<HTMLDivElement>(null);
  const [docPanelOpen, setDocPanelOpen] = useState(true);
  const [convDropdownOpen, setConvDropdownOpen] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldAutoPlayRef = useRef(false);

  function startRecording() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const results = event.results as ArrayLike<{ [index: number]: { transcript: string } }>;
      const transcript = Array.from(results)
        .map((result) => result[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }

  function playAudio(msg: ChatMessage) {
    if (!msg.audio) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audioSrc = `data:${msg.audio.mimeType};base64,${msg.audio.data}`;
    const audio = new Audio(audioSrc);
    audioRef.current = audio;
    setPlayingAudioId(msg.id);

    audio.onended = () => {
      setPlayingAudioId(null);
      audioRef.current = null;
    };

    audio.play().catch(() => {
      setPlayingAudioId(null);
      audioRef.current = null;
    });
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (convDropdownRef.current && !convDropdownRef.current.contains(e.target as Node)) {
        setConvDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.audio && shouldAutoPlayRef.current) {
      playAudio(lastMsg);
      shouldAutoPlayRef.current = false;
    }
  }, [messages]);

  async function loadConversation(convId: string) {
    setActiveConvId(convId);
    setSources([]);
    const msgs = await getConversationMessages(convId);
    setMessages(msgs as ChatMessage[]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);
    setSources([]);

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      source_chunk_ids: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      shouldAutoPlayRef.current = true;
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
            student_id: profileId,
            user_id: profileId,
            session_id: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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
        audio: data.audio || undefined,
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
  }

  async function handleEndConversation(convId: string) {
    try {
      await endConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
      toast.success("تم إنهاء المحادثة");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
    }
  }

  const noAnswerPattern =
    "لم أجد معلومات كافية حول هذا الموضوع في قاعدة معرفتي";

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden flex-col lg:flex-row">
      <div className={`flex min-h-0 w-full flex-1 flex-col border-l border-border bg-card-bg ${docPanelOpen ? "lg:w-[40%] lg:flex-none" : ""}`}>
        <div className="flex items-center gap-2 border-b border-border bg-gradient-to-l from-ai-light to-ai-lavender px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
            <Sparkles className="h-4 w-4 text-purple" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-text-primary">UniBot</h1>
            <p className="truncate text-xs text-text-secondary">مساعدك الأكاديمي الشخصي</p>
          </div>
          <div className="relative" ref={convDropdownRef}>
            <button
              onClick={() => setConvDropdownOpen(!convDropdownOpen)}
              className="flex items-center gap-1 max-w-[130px] rounded-lg border border-white/40 bg-white/30 px-2 py-1 text-xs text-text-primary outline-none backdrop-blur-sm"
            >
              <span className="min-w-0 flex-1 truncate text-right">
                {activeConvId
                  ? conversations.find((c) => c.id === activeConvId)?.title ||
                    new Date(
                      conversations.find((c) => c.id === activeConvId)?.created_at || ""
                    ).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })
                  : "+ جديد"}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </button>

            {convDropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-card-bg shadow-lg">
                <button
                  onClick={() => { handleNewConversation(); setConvDropdownOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-action-blue hover:bg-action-blue/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  محادثة جديدة
                </button>
                {conversations.length > 0 && (
                  <div className="max-h-52 divide-y divide-border/40 overflow-y-auto border-t border-border/40">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`flex items-center gap-1 px-3 py-1.5 hover:bg-app-bg ${
                          activeConvId === conv.id ? "bg-action-blue/5" : ""
                        }`}
                      >
                        <button
                          onClick={() => { loadConversation(conv.id); setConvDropdownOpen(false); }}
                          className="min-w-0 flex-1 truncate text-right text-xs text-text-primary"
                        >
                          {conv.title ||
                            new Date(conv.created_at).toLocaleDateString("ar-SA", {
                              month: "short",
                              day: "numeric",
                            })}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEndConversation(conv.id); }}
                          className="shrink-0 rounded p-0.5 text-text-secondary/40 transition-colors hover:bg-danger/10 hover:text-danger"
                          title="حذف المحادثة"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => setDocPanelOpen(!docPanelOpen)}
            className="rounded-lg p-1.5 text-text-secondary/80 transition-colors hover:bg-white/30"
            title={docPanelOpen ? "إخفاء المستندات" : "إظهار المستندات"}
          >
            {docPanelOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ai-light to-ai-lavender">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h2 className="mb-2 text-lg font-bold text-text-primary">مرحباً بك {studentName} في UniBot</h2>
              <p className="mb-5 max-w-xs text-xs text-text-secondary">
                اسألني عن بياناتك الشخصية أو عن اللوائح والسياسات الأكاديمية.
              </p>
              <div className="w-full space-y-2">
                {[
                  "ما هي المقررات التي أنا مسجل بها حالياً؟",
                  "ما هو سجل حضوري وغيابي؟",
                  "ما هي التكاليف والأنشطة المسندة إليّ؟",
                  "ما هي التعميمات الموجهة إليّ؟",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="w-full rounded-xl border border-border bg-app-bg p-2.5 text-right text-xs text-text-secondary transition-colors hover:border-action-blue hover:text-action-blue"
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
              className={`mb-4 flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  msg.role === "user"
                    ? "bg-action-blue text-white"
                    : "bg-gradient-to-br from-ai-light to-ai-lavender text-white"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${
                  msg.role === "user"
                    ? "bg-action-blue text-white"
                    : msg.content.includes(noAnswerPattern)
                    ? "border border-border bg-app-bg text-text-secondary"
                    : "border border-ai-lavender/30 bg-gradient-to-br from-ai-light/10 to-ai-lavender/10 text-text-primary"
                }`}
              >
                <div className="text-sm leading-relaxed">
                  {msg.role === "assistant" ? (
                    <MarkdownMessage content={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "assistant" &&
                  msg.source_chunk_ids.length > 0 &&
                  sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                      {sources
                        .filter((s) => msg.source_chunk_ids.includes(s.id))
                        .map((source, idx) => (
                          <button
                            key={source.id}
                            onClick={() => setSelectedSource(source)}
                            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                              selectedSource?.id === source.id
                                ? "bg-action-blue text-white"
                                : "bg-action-blue/20 text-action-blue hover:bg-action-blue/20"
                            }`}
                          >
                            {source.page_number ? (
                              <>
                                <FileText className="h-3 w-3" />
                                📄 ص. {source.page_number}
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
                {msg.role === "assistant" && msg.audio && (
                  <div className="mt-2 flex items-center gap-1.5 border-t border-border/40 pt-2">
                    <button
                      onClick={() => playAudio(msg)}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        playingAudioId === msg.id
                          ? "bg-purple text-white"
                          : "bg-purple/20 text-purple hover:bg-purple/20"
                      }`}
                      title={playingAudioId === msg.id ? "جاري التشغيل..." : "استماع للرد"}
                    >
                      <Volume2 className="h-3 w-3" />
                      {playingAudioId === msg.id ? "جاري التشغيل..." : "استماع"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="mb-4 flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ai-light to-ai-lavender text-white">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl border border-ai-lavender/30 bg-gradient-to-br from-ai-light/10 to-ai-lavender/10 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple/60 [animation-delay:0ms]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple/60 [animation-delay:150ms]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple/60 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border bg-card-bg px-4 py-3">
          <form onSubmit={handleSend} className="flex flex-col gap-2">
            {isRecording && (
              <div className="flex items-center gap-2 px-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
                </span>
                <span className="text-xs text-danger">جاري التسجيل...</span>
              </div>
            )}
            <div className="flex items-end gap-2">
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
                className="flex-1 resize-none overflow-hidden rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-action-blue"
                style={{ maxHeight: "10rem" }}
              />
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                  isRecording
                    ? "bg-danger text-white"
                    : "border border-border bg-app-bg text-text-secondary hover:bg-border"
                }`}
                title={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`flex-col bg-gray-50/30 ${docPanelOpen ? "hidden lg:flex lg:w-[60%]" : "hidden"}`}>
        <div className="flex items-center gap-3 border-b border-border bg-card-bg px-5 py-3">
          <BookOpen className="h-4 w-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">
            {selectedSource
              ? selectedSource.page_number
                ? `المستند — صفحة ${selectedSource.page_number}`
                : selectedSource.timestamp_sec
                ? `المستند — ${selectedSource.timestamp_sec} ث`
                : "مقتطف المصدر"
              : "عارض المستند"}
          </span>
          {selectedSource && (
            <button
              onClick={() => setSelectedSource(null)}
              className="mr-auto rounded-lg p-1 text-text-secondary transition-colors hover:bg-app-bg"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {selectedSource ? (
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-action-blue/20 px-4 py-2.5">
                <FileText className="h-4 w-4 text-action-blue" />
                <span className="text-xs font-semibold text-action-blue">
                  {selectedSource.page_number
                    ? `صفحة ${selectedSource.page_number}`
                    : selectedSource.timestamp_sec
                    ? `${selectedSource.timestamp_sec} ث`
                    : "مقتطف"}
                </span>
              </div>
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <p className="whitespace-pre-wrap text-sm leading-loose text-text-primary">
                  {selectedSource.content}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card-bg">
                <FileText className="h-12 w-12 text-text-secondary/30" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-text-primary">عارض المستندات</h3>
              <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
                عندما يستشهد UniBot بمصدر من المحتوى التعليمي، اضغط على شريحة المصدر في فقاعة الرسالة لعرض المقتطف هنا.
              </p>
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-card-bg px-4 py-2.5">
                <span className="rounded-full bg-action-blue/20 px-2 py-0.5 text-xs font-medium text-action-blue">
                  📄 ص. 15
                </span>
                <span className="text-xs text-text-secondary">مثال على شريحة مصدر</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
