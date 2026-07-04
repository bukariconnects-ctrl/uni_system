"use client";

import { useState, useRef } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

const MD_COMPONENTS: Components = {
  strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pr-5 text-sm leading-relaxed text-text-primary">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pr-5 text-sm leading-relaxed text-text-primary">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  h1: ({ children }) => <h1 className="mb-2 mt-4 text-base font-bold text-text-primary">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-3 text-sm font-bold text-text-primary">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-bold text-text-primary">{children}</h3>,
  p: ({ children }) => <p className="mb-2 text-sm leading-relaxed text-text-primary">{children}</p>,
  code: ({ children }) => (
    <code className="rounded bg-black/10 px-1 py-0.5 text-xs text-text-primary">{children}</code>
  ),
};

interface Course {
  name: string;
}

interface Recommendation {
  id: string;
  title: string;
  body: string;
  sent_by: string | null;
  course_id: string | null;
  courses: Course | Course[] | null;
  is_read: boolean;
  created_at: string;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function detectType(title: string): "remedial" | "enrichment" | "requested" | "daily_tip" | "manual" {
  if (title.includes("نصيحة يومية")) return "daily_tip";
  if (title.includes("تحسين الأداء")) return "remedial";
  if (title.includes("إثراء معرفي")) return "enrichment";
  if (title.includes("طلب توصية")) return "requested";
  return "manual";
}

export function RecommendationsClient({
  initialRecommendations,
}: {
  initialRecommendations: Recommendation[];
}) {
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [topic, setTopic] = useState("");
  const [courseName, setCourseName] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    const loadingToast = toast.loading("جاري استشارة الذكاء الاصطناعي...");
    try {
      const res = await fetch(`${appUrl}/api/ai/recommendations/request`, {
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
      }
      toast.success("تم إنشاء التوصية بنجاح");
      setTopic("");
      setCourseName("");
    } catch {
      toast.dismiss(loadingToast);
      toast.error("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">التوصيات الذكية</h1>
        <p className="mt-1 text-sm text-text-secondary">
          توصيات تعليمية مخصصة لمساعدتك على التفوق الأكاديمي
        </p>
      </div>

      {/* Interactive Request Section */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-purple-50 to-blue-50 p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-purple" />
          <h2 className="text-base font-bold text-text-primary">اطلب توصية تعليمية</h2>
        </div>
        <p className="mb-4 text-sm text-text-secondary">
          اكتب موضوعاً تريد معرفة أفضل المصادر التعليمية عنه (كتب، قنوات يوتيوب، منصات تدريب)
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مثال: شبكات الحاسوب، TCP/IP، قواعد البيانات المتقدمة..."
              className="flex-1 rounded-xl border border-border bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-purple/30"
              disabled={loading}
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
            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-purple/30"
            disabled={loading}
          />
        </form>
      </div>

      {/* Recommendations Feed */}
      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card-bg py-12">
            <Sparkles className="mb-3 h-10 w-10 text-text-secondary" />
            <p className="text-sm text-text-secondary">لا توجد توصيات بعد</p>
            <p className="text-xs text-text-secondary">
              اكتب موضوعاً أعلاه لتحصل على توصيات ذكية
            </p>
          </div>
        ) : (
          recommendations.map((rec) => {
            const type = detectType(rec.title);
            const course = rec.courses
              ? Array.isArray(rec.courses)
                ? rec.courses[0]
                : rec.courses
              : null;
            const date = new Date(rec.created_at).toLocaleDateString("ar-SA", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            const borderColor =
              type === "remedial"
                ? "border-orange-400/30 bg-gradient-to-br from-orange-50 to-white"
                : type === "enrichment"
                ? "border-green-400/30 bg-gradient-to-br from-green-50 to-white"
                : type === "requested"
                ? "border-purple-400/30 bg-gradient-to-br from-purple-50 to-white"
                : type === "daily_tip"
                ? "border-blue-400/30 bg-gradient-to-br from-blue-50 to-white"
                : "border-border bg-card-bg";

            const icon =
              type === "remedial" ? (
                <AlertTriangle className="h-5 w-5 text-orange" />
              ) : type === "enrichment" ? (
                <Star className="h-5 w-5 text-green" />
              ) : type === "requested" ? (
                <Lightbulb className="h-5 w-5 text-purple" />
              ) : type === "daily_tip" ? (
                <Sparkles className="h-5 w-5 text-action-blue" />
              ) : (
                <GraduationCap className="h-5 w-5 text-academic-navy" />
              );

            const badge =
              type === "remedial" ? (
                <span className="rounded-full bg-orange/10 px-2.5 py-0.5 text-xs font-medium text-orange">
                  توصية تحسين
                </span>
              ) : type === "enrichment" ? (
                <span className="rounded-full bg-green/10 px-2.5 py-0.5 text-xs font-medium text-green">
                  توصية إثراء
                </span>
              ) : type === "requested" ? (
                <span className="rounded-full bg-purple/10 px-2.5 py-0.5 text-xs font-medium text-purple">
                  بناء على طلبك
                </span>
              ) : type === "daily_tip" ? (
                <span className="rounded-full bg-action-blue/10 px-2.5 py-0.5 text-xs font-medium text-action-blue">
                  نصيحة اليوم
                </span>
              ) : (
                <span className="rounded-full bg-academic-navy/10 px-2.5 py-0.5 text-xs font-medium text-academic-navy">
                  توصية
                </span>
              );

            return (
              <div
                key={rec.id}
                className={`rounded-2xl border-2 p-5 shadow-sm transition-shadow hover:shadow-md ${borderColor}`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{icon}</div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">
                        {rec.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {badge}
                        {course && (
                          <span className="flex items-center gap-1 text-xs text-text-secondary">
                            <BookOpen className="h-3 w-3" />
                            {course.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-text-secondary">
                          <Clock className="h-3 w-3" />
                          {date}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-text-primary">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                    {rec.body}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
