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

export function StudentMaterialsClient({
  enrollments,
  materials,
}: {
  enrollments: any[];
  materials: any[];
}) {
  const [filterCourse, setFilterCourse] = useState("");

  const filtered = filterCourse
    ? materials.filter((m: any) => m.course_id === filterCourse)
    : materials;

  const grouped = filtered.reduce((acc: Record<number, any[]>, m: any) => {
    const week = m.week_number || 0;
    if (!acc[week]) acc[week] = [];
    acc[week].push(m);
    return acc;
  }, {});

  return (
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
        <span className="text-sm text-text-secondary">{filtered.length} مادة</span>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لا توجد مواد منشورة بعد</p>
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
                const typeInfo = CONTENT_TYPES[material.content_type] || CONTENT_TYPES.other;
                const TypeIcon = typeInfo.icon;
                return (
                  <div key={material.id} className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue/20">
                          <TypeIcon className="h-5 w-5 text-action-blue" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-text-primary">{material.title}</span>
                            <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">{typeInfo.label}</span>
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
                              <span>{(material.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                            )}
                            <span>{new Date(material.created_at).toLocaleDateString("ar-SA")}</span>
                          </div>
                          {material.description && (
                            <p className="mt-1 text-xs text-text-secondary">{material.description}</p>
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
  );
}
