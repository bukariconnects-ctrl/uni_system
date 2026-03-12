"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getMessages,
  sendMessage,
  searchUsers,
  startConversation,
} from "./actions";
import {
  MessageSquare,
  Hash,
  Send,
  Search,
  Plus,
  Users,
  X,
} from "lucide-react";

type ChatTarget = {
  type: "channel" | "conversation";
  id: string;
  name: string;
};

export function StudentMessagesClient({
  channels,
  conversations,
  currentUserId,
  tenantId,
}: {
  channels: any[];
  conversations: any[];
  currentUserId: string;
  tenantId: string;
}) {
  const [target, setTarget] = useState<ChatTarget | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    if (!target) return;

    loadMessages();

    const filterColumn = target.type === "channel" ? "channel_id" : "conversation_id";

    const channel = supabase
      .channel(`chat-${target.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg[filterColumn] !== target.id) return;
          if (newMsg.sender_id === currentUserId) return;
          const { data: sender } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, role")
            .eq("id", newMsg.sender_id)
            .single();
          setMessages((prev) => [...prev, { ...newMsg, sender: sender ?? null }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [target?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    if (!target) return;
    setLoading(true);
    try {
      const data = await getMessages(target.type, target.id);
      setMessages(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    const fd = new FormData(e.currentTarget);
    const body = fd.get("body") as string;
    if (!body?.trim()) return;

    if (inputRef.current) inputRef.current.value = "";

    const optimistic = {
      id: `temp-${Date.now()}`,
      body: body.trim(),
      sender_id: currentUserId,
      sender: { id: currentUserId, first_name: "أنت", last_name: "", role: "" },
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    fd.set("message_type", target.type === "channel" ? "channel" : "direct");
    if (target.type === "channel") {
      fd.set("channel_id", target.id);
    } else {
      fd.set("conversation_id", target.id);
    }

    try {
      await sendMessage(fd);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "فشل إرسال الرسالة");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const data = await searchUsers(q);
      setSearchResults(data);
    } catch { setSearchResults([]); }
  }

  async function handleStartChat(userId: string, userName: string) {
    setLoading(true);
    try {
      const convId = await startConversation(userId);
      setTarget({ type: "conversation", id: convId, name: userName });
      setShowNewChat(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  const ROLE_LABELS: Record<string, string> = { faculty: "محاضر", student: "طالب" };

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-2xl border border-border bg-card-bg shadow-sm">
      <div className="flex w-72 flex-col border-l border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold text-text-primary">المحادثات</h3>
          <button onClick={() => setShowNewChat(!showNewChat)} className="rounded-lg p-1.5 text-action-blue hover:bg-action-blue/10">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {showNewChat && (
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="بحث عن مستخدم..."
                className="w-full rounded-lg border border-border bg-app-bg py-2 pr-9 pl-3 text-sm outline-none focus:border-action-blue"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {searchResults.map((user: any) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartChat(user.id, `${user.first_name} ${user.last_name}`)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-right text-sm hover:bg-app-bg"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                      {user.first_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-text-primary">{user.first_name} {user.last_name}</span>
                      <span className="mr-1 text-xs text-text-secondary">({ROLE_LABELS[user.role] || user.role})</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {channels.length > 0 && (
            <div className="p-2">
              <p className="mb-1 px-2 text-xs font-medium text-text-secondary">القنوات</p>
              {channels.map((ch: any) => (
                <button
                  key={ch.id}
                  onClick={() => setTarget({ type: "channel", id: ch.id, name: ch.sections?.courses?.code ? `${ch.sections.courses.code} (${ch.sections.section_code})` : ch.name })}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-right text-sm transition-colors ${target?.id === ch.id ? "bg-action-blue/10 text-action-blue" : "text-text-secondary hover:bg-app-bg hover:text-text-primary"}`}
                >
                  <Hash className="h-4 w-4" />
                  <span className="truncate">{ch.sections?.courses?.code ? `${ch.sections.courses.code} (${ch.sections.section_code})` : ch.name}</span>
                </button>
              ))}
            </div>
          )}

          {conversations.length > 0 && (
            <div className="p-2">
              <p className="mb-1 px-2 text-xs font-medium text-text-secondary">محادثات مباشرة</p>
              {conversations.map((conv: any) => (
                <button
                  key={conv.id}
                  onClick={() => setTarget({ type: "conversation", id: conv.id, name: `${conv.other_user?.first_name} ${conv.other_user?.last_name}` })}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-right text-sm transition-colors ${target?.id === conv.id ? "bg-action-blue/10 text-action-blue" : "text-text-secondary hover:bg-app-bg hover:text-text-primary"}`}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                    {conv.other_user?.first_name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <span className="truncate">{conv.other_user?.first_name} {conv.other_user?.last_name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {channels.length === 0 && conversations.length === 0 && (
            <div className="p-6 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-text-secondary" />
              <p className="text-xs text-text-secondary">لا توجد محادثات</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {!target ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-3 h-12 w-12 text-text-secondary" />
              <p className="text-sm text-text-secondary">اختر محادثة للبدء</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              {target.type === "channel" ? <Hash className="h-5 w-5 text-action-blue" /> : <Users className="h-5 w-5 text-action-blue" />}
              <span className="font-bold text-text-primary">{target.name}</span>
            </div>

            {error && (
              <div className="mx-4 mt-2 rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">
                {error}
                <button onClick={() => setError("")} className="mr-2"><X className="inline h-3 w-3" /></button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {loading && messages.length === 0 && (
                <div className="text-center text-sm text-text-secondary">جاري التحميل...</div>
              )}
              <div className="space-y-3">
                {messages.map((msg: any) => {
                  const isMe = msg.sender_id === currentUserId;
                  const showSenderName = target.type === "channel" || !isMe;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-action-blue text-white" : "bg-app-bg text-text-primary"}`}>
                        {showSenderName && (
                          <p className={`mb-0.5 text-xs font-medium ${isMe ? "text-white/70" : "opacity-70"}`}>
                            {isMe ? "أنت" : `${msg.sender?.first_name} ${msg.sender?.last_name}`}
                          </p>
                        )}
                        <p className="text-sm">{msg.body}</p>
                        <p className={`mt-1 text-xs ${isMe ? "text-white/60" : "text-text-secondary"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t border-border p-4">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  name="body"
                  placeholder="اكتب رسالتك..."
                  autoComplete="off"
                  className="flex-1 rounded-xl border border-border bg-app-bg px-4 py-2.5 text-sm outline-none focus:border-action-blue"
                />
                <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue text-white hover:bg-action-blue/90">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
