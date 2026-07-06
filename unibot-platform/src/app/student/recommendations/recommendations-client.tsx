"use client";

import { useState, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  Lightbulb,
  Send,
  Sparkles,
  BookOpen,
  GraduationCap,
  Loader2,
  Star,
  AlertTriangle,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Brain,
  Bell,
} from "lucide-react";
import { toast } from "sonner";

// ── Markdown renderer components ──────────────────────────────
const MD_COMPONENTS: Components = {
  strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pr-5 text-sm leading-relaxed text-text-primary space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pr-5 text-sm leading-relaxed text-text-primary space-y-1">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  h1: ({ children }) => <h1 className="mb-3 mt-5 text-base font-bold text-text-primary">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-sm font-bold text-text-primary">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-bold text-text-primary">{children}</h3>,
  p: ({ children }) => <p className="mb-2 text-sm leading-relaxed text-text-primary">{children}</p>,
  code: ({ children }) => (
    <code className="rounded bg-[var(--color-border)]/40 px-1.5 py-0.5 text-xs text-text-primary">{children}</code>
  ),
};

// ── Types ─────────────────────────────────────────────────────
interface Course {
  name: string;
}

interface SenderProfile {
  first_name: string;
  last_name: string;
}

interface Recommendation {
  id: string;
  title: string;
  body: string;
  sent_by: string | null;
  course_id: string | null;
  rec_type: string | null;
  courses: Course | Course[] | null;
  profiles: SenderProfile | SenderProfile[] | null;
  is_read: boolean;
  created_at: string;
}

// ── Color/icon config per rec_type ────────────────────────────
interface TypeConfig {
  border: string;
  bg: string;
  icon: React.ReactNode;
  badge: string;
  badgeText: string;
  label: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  daily_tip: {
    border: "border-blue/30",
    bg: "bg-gradient-to-br from-blue/5 via-card-bg to-blue/5",
    icon: <Sparkles className="h-5 w-5 text-blue" />,
    badge: "bg-blue/10 text-blue",
    badgeText: "نصيحة اليوم",
    label: "توصية يومية",
  },
  remedial: {
    border: "border-orange/30",
    bg: "bg-gradient-to-br from-orange/5 to-card-bg",
    icon: <AlertTriangle className="h-5 w-5 text-orange" />,
    badge: "bg-orange/10 text-orange",
    badgeText: "توصية تحسين",
    label: "توصية علاجية",
  },
  enrichment: {
    border: "border-success/30",
    bg: "bg-gradient-to-br from-success/5 to-card-bg",
    icon: <Star className="h-5 w-5 text-success" />,
    badge: "bg-success/10 text-success",
    badgeText: "توصية إثراء",
    label: "توصية إثرائية",
  },
  on_demand: {
    border: "border-purple/30",
    bg: "bg-gradient-to-br from-purple/5 to-card-bg",
    icon: <Lightbulb className="h-5 w-5 text-purple" />,
    badge: "bg-purple/10 text-purple",
    badgeText: "بناء على طلبك",
    label: "طلب توصية",
  },
  manual: {
    border: "border-academic-navy/20",
    bg: "bg-gradient-to-br from-academic-navy/[0.04] to-card-bg",
    icon: <User className="h-5 w-5 text-academic-navy" />,
    badge: "bg-academic-navy/10 text-academic-navy",
    badgeText: "توصية من محاضر",
    label: "توصية محاضر",
  },
};

const DEFAULT_CONFIG: TypeConfig = {
  border: "border-border",
  bg: "bg-card-bg",
  icon: <GraduationCap className="h-5 w-5 text-academic-navy" />,
  badge: "bg-academic-navy/10 text-academic-navy",
  badgeText: "توصية",
  label: "توصية",
};

// ── Helpers ───────────────────────────────────────────────────
function getTypeConfig(rec: Recommendation): TypeConfig {
  const { title, rec_type } = rec;
  if (rec_type && TYPE_CONFIG[rec_type]) return TYPE_CONFIG[rec_type];
  if (title.includes("نصيحة يومية")) return TYPE_CONFIG.daily_tip;
  if (title.includes("تحسين الأداء")) return TYPE_CONFIG.remedial;
  if (title.includes("إثراء معرفي")) return TYPE_CONFIG.enrichment;
  if (title.includes("طلب توصية")) return TYPE_CONFIG.on_demand;
  return DEFAULT_CONFIG;
}

function getSenderName(rec: Recommendation): string | null {
  if (!rec.profiles) return null;
  const p = Array.isArray(rec.profiles) ? rec.profiles[0] : rec.profiles;
  if (!p) return null;
  return `${p.first_name} ${p.last_name}`;
}

function getCourseName(rec: Recommendation): string | null {
  if (!rec.courses) return null;
  const c = Array.isArray(rec.courses) ? rec.courses[0] : rec.courses;
  return c?.name || null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return "منذ أقل من ساعة";
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days === 1) return "أمس";
  if (days < 7) return `منذ ${days} أيام`;
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسبوع`;
  return formatDate(dateStr);
}

// ── Tabs ──────────────────────────────────────────────────────
type TabId = "all" | "daily_tip" | "ai" | "faculty" | "my_requests";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  count: number;
}

// ── Card Component ────────────────────────────────────────────
function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const config = getTypeConfig(rec);
  const senderName = getSenderName(rec);
  const courseName = getCourseName(rec);
  const date = formatDate(rec.created_at);
  const relativeDate = formatRelativeDate(rec.created_at);

  // Check if content is long (rough heuristic: more than 600 chars)
  const isLong = rec.body.length > 600;

  return (
    <div
      className={`group rounded-2xl border-2 p-5 shadow-sm transition-all duration-200 hover:shadow-lg ${config.border} ${config.bg}`}
    >
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-card-bg/80 shadow-sm">
            {config.icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text-primary leading-snug">
              {rec.title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {/* Type badge */}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badge}`}>
                {config.badgeText}
              </span>

              {/* Course name */}
              {courseName && (
                <span className="flex items-center gap-1 text-xs text-text-secondary bg-card-bg/80 rounded-full px-2.5 py-0.5 border border-border/50">
                  <BookOpen className="h-3 w-3" />
                  {courseName}
                </span>
              )}

              {/* Sender name (faculty) */}
              {senderName && (
                <span className="flex items-center gap-1 text-xs text-academic-navy bg-academic-navy/[0.06] rounded-full px-2.5 py-0.5 border border-academic-navy/20">
                  <User className="h-3 w-3" />
                  {senderName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Date — hidden on mobile, shown on hover */}
        <time
          dateTime={rec.created_at}
          className="hidden sm:flex items-center gap-1 text-xs text-text-secondary/70 shrink-0"
          title={date}
        >
          <Clock className="h-3 w-3" />
          {relativeDate}
        </time>
      </div>

      {/* Content */}
      <div className={`prose prose-sm max-w-none text-text-primary transition-all duration-200 ${!expanded && isLong ? "relative max-h-48 overflow-hidden" : ""}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {rec.body}
        </ReactMarkdown>

        {/* Fade-out gradient for collapsed long content */}
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card-bg/90 to-transparent" />
        )}
      </div>

      {/* Expand/Collapse for long content */}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-purple hover:text-purple/80 transition-colors"
        >
          {expanded ? (
            <>عرض أقل <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>عرض المزيد <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}

      {/* Mobile date footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 sm:hidden">
        <time dateTime={rec.created_at} className="text-xs text-text-secondary/70">
          {relativeDate}
        </time>
        {!rec.is_read && (
          <span className="flex items-center gap-1 text-xs font-medium text-blue">
            <Bell className="h-3 w-3" />
            جديد
          </span>
        )}
      </div>
    </div>
  );
}

// ── Daily Tip Hero ────────────────────────────────────────────
function DailyTipHero({ rec }: { rec: Recommendation }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-blue/30 bg-gradient-to-br from-blue/5 via-card-bg to-purple/5 p-6 shadow-sm transition-all hover:shadow-md">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-blue/[0.08] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-purple/[0.08] blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue/10 shadow-sm">
            <Sparkles className="h-5 w-5 text-blue" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">نصيحة اليوم 💡</h2>
            <p className="text-xs text-text-secondary">
              {formatDate(rec.created_at)}
            </p>
          </div>
          <span className="mr-auto rounded-full bg-blue/10 px-2.5 py-0.5 text-xs font-medium text-blue">
            يومي
          </span>
        </div>

        {/* Content */}
        <div className="text-sm leading-relaxed text-text-primary">
          {rec.body}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export function RecommendationsClient({
  initialRecommendations,
}: {
  initialRecommendations: Recommendation[];
}) {
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [topic, setTopic] = useState("");
  const [courseName, setCourseName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Tab counts ────────────────────────────────────────────────
  const tabs: Tab[] = useMemo(() => [
    {
      id: "all",
      label: "الكل",
      icon: <Brain className="h-4 w-4" />,
      count: recommendations.length,
    },
    {
      id: "daily_tip",
      label: "نصيحة اليوم",
      icon: <Sparkles className="h-4 w-4" />,
      count: recommendations.filter((r) => r.rec_type === "daily_tip").length,
    },
    {
      id: "ai",
      label: "التوصيات الآلية",
      icon: <Star className="h-4 w-4" />,
      count: recommendations.filter(
        (r) => (r.rec_type === "remedial" || r.rec_type === "enrichment") && !r.sent_by,
      ).length,
    },
    {
      id: "faculty",
      label: "توصيات المحاضرين",
      icon: <User className="h-4 w-4" />,
      count: recommendations.filter((r) => r.sent_by).length,
    },
    {
      id: "my_requests",
      label: "طلباتي",
      icon: <MessageSquare className="h-4 w-4" />,
      count: recommendations.filter((r) => r.rec_type === "on_demand").length,
    },
  ], [recommendations]);

  // ── Filtered recommendations per tab ──────────────────────────
  const filteredRecommendations = useMemo(() => {
    switch (activeTab) {
      case "all":
        // Show all except daily_tip in main feed (daily_tip is shown as hero)
        return recommendations.filter((r) => r.rec_type !== "daily_tip");
      case "daily_tip":
        return recommendations.filter((r) => r.rec_type === "daily_tip");
      case "ai":
        return recommendations.filter(
          (r) => (r.rec_type === "remedial" || r.rec_type === "enrichment") && !r.sent_by,
        );
      case "faculty":
        return recommendations.filter((r) => r.sent_by);
      case "my_requests":
        return recommendations.filter((r) => r.rec_type === "on_demand");
      default:
        return recommendations;
    }
  }, [recommendations, activeTab]);

  // Extract daily tip for the hero section
  const dailyTip = useMemo(
    () => recommendations.find((r) => r.rec_type === "daily_tip") || null,
    [recommendations],
  );

  // ── Submit handler ────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    const loadingToast = toast.loading("جاري استشارة الذكاء الاصطناعي...");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/recommendations/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), courseName: courseName.trim() || undefined }),
      });

      toast.dismiss(loadingToast);

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "حدث خطأ");
        return;
      }

      const data = await res.json();
      if (data.recommendation) {
        setRecommendations((prev) => [data.recommendation, ...prev]);
        // Switch to "طلباتي" tab to show the new recommendation
        setActiveTab("my_requests");
      }
      toast.success("تم إنشاء التوصية بنجاح");
      setTopic("");
      setCourseName("");
      setShowRequestForm(false);
    } catch {
      toast.dismiss(loadingToast);
      toast.error("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  // ── Empty state per tab ───────────────────────────────────────
  function EmptyState({ tab }: { tab: Tab }) {
    const messages: Record<TabId, { title: string; desc: string }> = {
      all: {
        title: "لا توجد توصيات بعد",
        desc: "سيتم عرض التوصيات هنا عندما يبدأ النظام بتقديمها لك",
      },
      daily_tip: {
        title: "لا توجد نصيحة اليوم",
        desc: "النصيحة اليومية ستظهر هنا بمجرد توليدها",
      },
      ai: {
        title: "لا توجد توصيات آلية",
        desc: "التوصيات التلقائية تظهر عندما تحصل على درجات في التكاليف",
      },
      faculty: {
        title: "لا توجد توصيات من المحاضرين",
        desc: "عندما يرسل لك المحاضرون توصيات، ستظهر هنا",
      },
      my_requests: {
        title: "لم تطلب أي توصية بعد",
        desc: "استخدم زر 'طلب توصية' لطلب توصيات تعليمية مخصصة",
      },
    };

    const m = messages[tab.id];
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-card-bg/50 py-16">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple/5">
          {tab.icon}
        </div>
        <p className="text-sm font-medium text-text-primary">{m.title}</p>
        <p className="mt-1 text-xs text-text-secondary">{m.desc}</p>
        {(tab.id === "all" || tab.id === "my_requests") && (
          <button
            onClick={() => setShowRequestForm(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-purple px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-purple/90"
          >
            <Lightbulb className="h-4 w-4" />
            اطلب توصية الآن
          </button>
        )}
      </div>
    );
  }

  // ── Tab bar ────────────────────────────────────────────────────
  function TabBar() {
    return (
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card-bg p-1.5 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-purple text-white shadow-sm"
                : "text-text-secondary hover:bg-app-bg hover:text-text-primary"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-purple/10 text-purple"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // ── Request Form (collapsible) ────────────────────────────────
  function RequestForm() {
    if (!showRequestForm) return null;

    return (
      <div className="rounded-2xl border-2 border-purple/20 bg-gradient-to-br from-purple/5 to-blue/5 p-5 shadow-sm transition-all">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-purple" />
            <h2 className="text-sm font-bold text-text-primary">اطلب توصية تعليمية</h2>
          </div>
          <button
            onClick={() => setShowRequestForm(false)}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            إلغاء
          </button>
        </div>
        <p className="mb-4 text-xs text-text-secondary">
          اكتب موضوعاً تريد معرفة أفضل المصادر التعليمية عنه — كتب، قنوات يوتيوب، منصات تدريب
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مثال: شبكات الحاسوب، TCP/IP، قواعد البيانات..."
              className="flex-1 rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-purple/30"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="flex items-center gap-2 rounded-xl bg-purple px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-purple/90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              اطلب
            </button>
          </div>
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="اسم المادة (اختياري) — مثال: شبكات الحاسوب"
            className="rounded-xl border border-border bg-card-bg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-purple/30"
            disabled={loading}
          />
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">التوصيات الذكية</h1>
          <p className="mt-1 text-sm text-text-secondary">
            توصيات تعليمية مخصصة لمساعدتك على التفوق الأكاديمي
          </p>
        </div>
        <button
          onClick={() => setShowRequestForm((prev) => !prev)}
          className="hidden sm:flex items-center gap-2 rounded-xl bg-purple px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-purple/90 shadow-sm"
        >
          <Lightbulb className="h-4 w-4" />
          طلب توصية
        </button>
      </div>

      {/* Floating action button for mobile */}
      <button
        onClick={() => setShowRequestForm((prev) => !prev)}
        className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-purple text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:hidden"
        aria-label="طلب توصية"
      >
        {showRequestForm ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <Lightbulb className="h-6 w-6" />
        )}
      </button>

      {/* Request form (collapsible) */}
      <RequestForm />

      {/* Daily Tip Hero Section */}
      {dailyTip && activeTab === "all" && (
        <DailyTipHero rec={dailyTip} />
      )}

      {/* Tab Bar */}
      <TabBar />

      {/* Recommendations Feed */}
      <div className="space-y-4">
        {filteredRecommendations.length === 0 ? (
          <EmptyState tab={tabs.find((t) => t.id === activeTab) || tabs[0]} />
        ) : (
          filteredRecommendations.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))
        )}
      </div>
    </div>
  );
}
