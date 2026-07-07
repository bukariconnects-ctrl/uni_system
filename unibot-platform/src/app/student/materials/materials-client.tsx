"use client";

import { useState } from "react";
import {
  BookOpen,
  FileText,
  Video,
  Presentation,
  Link2,
  Download,
  Sparkles,
  CalendarDays,
  GraduationCap,
} from "lucide-react";

const CONTENT_TYPES: Record<string, { label: string; icon: any }> = {
  pdf: { label: "PDF", icon: FileText },
  video: { label: "فيديو", icon: Video },
  presentation: { label: "عرض تقديمي", icon: Presentation },
  document: { label: "مستند", icon: FileText },
  audio: { label: "صوتي", icon: FileText },
  link: { label: "رابط", icon: Link2 },
  other: { label: "أخرى", icon: FileText },
};

/** Render syllabus content (JSON array of weeks, or text) */
function SyllabusContent({ content }: { content: unknown }) {
  // Array of weekly topics — render as structured cards
  if (Array.isArray(content)) {
    return (
      <div className="space-y-4">
        {(content as any[]).map((item: any, i: number) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-app-bg/50 p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-action-blue/20 text-xs font-bold text-action-blue">
                {item.week || item.week_number || i + 1}
              </span>
              <span className="text-sm font-bold text-text-primary">
                {item.week_title || `الأسبوع ${item.week || item.week_number || i + 1}`}
              </span>
            </div>
            {item.topics && Array.isArray(item.topics) && (
              <ul className="mr-5 list-disc space-y-1 text-sm text-text-secondary">
                {item.topics.map((topic: string, j: number) => (
                  <li key={j}>{topic}</li>
                ))}
              </ul>
            )}
            {item.objectives && Array.isArray(item.objectives) && (
              <div className="mt-2">
                <p className="text-xs font-medium text-text-primary">الأهداف:</p>
                <ul className="mr-5 list-disc space-y-0.5 text-xs text-text-secondary">
                  {item.objectives.map((obj: string, j: number) => (
                    <li key={j}>{obj}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Object with a "text" field (sentinel from fallback upsertSyllabus)
  if (content && typeof content === "object" && "text" in (content as any)) {
    return (
      <div className="whitespace-pre-wrap rounded-xl border border-border bg-app-bg/50 p-4 text-sm text-text-primary leading-relaxed">
        {(content as any).text}
      </div>
    );
  }

  // Fallback: render as JSON
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-app-bg/50 p-4 text-xs text-text-secondary">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}

export function StudentMaterialsClient({
  enrollments,
  materials,
  syllabi,
}: {
  enrollments: any[];
  materials: any[];
  syllabi: any[];
}) {
  const [tab, setTab] = useState<"materials" | "plans">("materials");
  const [filterCourse, setFilterCourse] = useState("");
  const [planCourseId, setPlanCourseId] = useState("");

  const planCourseIds = [...new Set(syllabi.map((s: any) => s.course_id))];

  const filtered = filterCourse
    ? materials.filter((m: any) => m.course_id === filterCourse)
    : materials;

  const grouped = filtered.reduce((acc: Record<number, any[]>, m: any) => {
    const week = m.week_number || 0;
    if (!acc[week]) acc[week] = [];
    acc[week].push(m);
    return acc;
  }, {});

  const selectedSyllabi = planCourseId
    ? syllabi.filter((s: any) => s.course_id === planCourseId)
    : [];

  return (
    <div className="space-y-4">
      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl bg-app-bg p-1">
        <button
          onClick={() => setTab("materials")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "materials"
              ? "bg-card-bg text-action-blue shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          المواد التعليمية
        </button>
        <button
          onClick={() => setTab("plans")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "plans"
              ? "bg-card-bg text-action-blue shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <FileText className="h-4 w-4" />
          خطط المقررات
        </button>
      </div>

      {/* ══════════════════════════════════════════════
          TAB 1: MATERIALS
          ══════════════════════════════════════════════ */}
      {tab === "materials" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
            >
              <option value="">كل المقررات</option>
              {enrollments.map((e: any) => (
                <option key={e.course_id} value={e.course_id}>
                  {e.courses?.code}
                </option>
              ))}
            </select>
            <span className="text-sm text-text-secondary">
              {filtered.length} مادة
            </span>
          </div>

          {Object.keys(grouped).length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">
                لا توجد مواد منشورة بعد
              </p>
            </div>
          )}

          {Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([week, items]) => (
              <div key={week}>
                <h3 className="mb-2 text-sm font-bold text-text-primary">
                  {Number(week) === 0 ? "بدون أسبوع" : `الأسبوع ${week}`}
                </h3>
                <div className="space-y-2">
                  {(items as any[]).map((material: any) => {
                    const typeInfo =
                      CONTENT_TYPES[material.content_type] ||
                      CONTENT_TYPES.other;
                    const TypeIcon = typeInfo.icon;
                    return (
                      <div
                        key={material.id}
                        className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue/20">
                              <TypeIcon className="h-5 w-5 text-action-blue" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-text-primary">
                                  {material.title}
                                </span>
                                <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                                  {typeInfo.label}
                                </span>
                                {material.is_ai_approved && (
                                  <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-ai-light to-ai-lavender px-2 py-0.5 text-xs text-white">
                                    <Sparkles className="h-3 w-3" />
                                    AI
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-text-secondary">
                                <span>{material.courses?.code}</span>
                                {material.file_size_bytes && (
                                  <span>
                                    {(material.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                                  </span>
                                )}
                                <span>
                                  {new Date(material.created_at).toLocaleDateString("ar-SA")}
                                </span>
                              </div>
                              {material.description && (
                                <p className="mt-1 text-xs text-text-secondary">
                                  {material.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {material.file_url && (
                            <a
                              href={material.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-lg border border-action-blue/30 px-3 py-1.5 text-xs font-medium text-action-blue hover:bg-action-blue/5"
                            >
                              <Download className="h-3.5 w-3.5" />
                              تحميل
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 2: COURSE PLANS
          ══════════════════════════════════════════════ */}
      {tab === "plans" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={planCourseId}
              onChange={(e) => setPlanCourseId(e.target.value)}
              className="rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
            >
              <option value="">-- اختر المقرر --</option>
              {enrollments
                .filter((e: any) => planCourseIds.includes(e.course_id))
                .map((e: any) => (
                  <option key={e.course_id} value={e.course_id}>
                    {e.courses?.code} — {e.courses?.name}
                  </option>
                ))}
            </select>
            {planCourseId && (
              <span className="text-sm text-text-secondary">
                {selectedSyllabi.length} خطة
              </span>
            )}
          </div>

          {!planCourseId && (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">
                اختر مقرراً لعرض خطته الدراسية
              </p>
            </div>
          )}

          {planCourseId && selectedSyllabi.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">
                لا توجد خطة منشورة لهذا المقرر بعد
              </p>
            </div>
          )}

          {selectedSyllabi.map((syllabus: any) => (
            <div
              key={syllabus.id}
              className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm"
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue/10">
                    <CalendarDays className="h-5 w-5 text-action-blue" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {syllabus.courses?.code} — {syllabus.courses?.name}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      {syllabus.profiles?.first_name}{" "}
                      {syllabus.profiles?.last_name}
                      {" · "}
                      {new Date(syllabus.created_at).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  {syllabus.status === "approved" ? "معتمدة" : "منشورة"}
                </span>
              </div>

              {/* Content */}
              <SyllabusContent content={syllabus.content} />
            </div>
          ))}

          {/* If no courses have plans at all */}
          {planCourseIds.length === 0 && !planCourseId && (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <GraduationCap className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">
                لم يتم نشر أي خطة مقرر بعد
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
