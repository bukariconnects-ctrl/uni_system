"use client";

import { useState } from "react";
import {
  Upload,
  FileText,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Trash2,
  BookOpen,
  Shield,
  FileCheck,
} from "lucide-react";
import type { AiKnowledgeDocument, AiDocumentType } from "@/lib/types/database";
import {
  uploadKnowledgeDocument,
  toggleDocumentActive,
  deleteKnowledgeDocument,
  reindexDocument,
} from "./actions";

const docTypeLabels: Record<AiDocumentType, string> = {
  regulation: "لائحة",
  course_material: "مادة تعليمية",
  handbook: "دليل",
  policy: "سياسة",
  other: "أخرى",
};

const docTypeIcons: Record<AiDocumentType, typeof FileText> = {
  regulation: Shield,
  course_material: BookOpen,
  handbook: FileCheck,
  policy: FileText,
  other: FileText,
};

export function KnowledgeClient({
  documents,
}: {
  documents: AiKnowledgeDocument[];
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fileName, setFileName] = useState("");
  const [reindexingId, setReindexingId] = useState<string | null>(null);

  async function handleUpload(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await uploadKnowledgeDocument(formData);
      setSuccess("تم رفع الوثيقة بنجاح وبدأت عملية الفهرسة");
      setShowUpload(false);
      setFileName("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ في الرفع");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      await toggleDocumentActive(id, !current);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذه الوثيقة من قاعدة المعرفة؟")) return;
    try {
      await deleteKnowledgeDocument(id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function handleReindex(id: string) {
    setReindexingId(id);
    try {
      const result = await reindexDocument(id);
      setSuccess(`تمت إعادة الفهرسة: ${result.total_chunks} جزء`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setReindexingId(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            قاعدة المعرفة
          </h1>
          <p className="text-sm text-text-secondary">
            إدارة الوثائق واللوائح التي يستخدمها UniBot للإجابة
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
        >
          <Upload className="h-4 w-4" />
          رفع وثيقة
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

      {showUpload && (
        <div className="rounded-2xl border border-border bg-card-bg p-6">
          <h2 className="mb-4 text-lg font-bold text-text-primary">
            رفع وثيقة جديدة
          </h2>
          <form action={handleUpload} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                عنوان الوثيقة
              </label>
              <input
                name="title"
                required
                className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                نوع الوثيقة
              </label>
              <select
                name="doc_type"
                className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
              >
                <option value="regulation">لائحة</option>
                <option value="handbook">دليل</option>
                <option value="policy">سياسة</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                الملف (PDF / نص)
              </label>
              <div
                className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                  fileName
                    ? "border-action-blue bg-action-blue/5"
                    : "border-border hover:border-action-blue/50"
                }`}
                onClick={() =>
                  document.getElementById("knowledge-file")?.click()
                }
              >
                <input
                  id="knowledge-file"
                  type="file"
                  name="file"
                  accept=".pdf,.txt,.md,.doc,.docx"
                  className="hidden"
                  onChange={(e) =>
                    setFileName(e.target.files?.[0]?.name || "")
                  }
                />
                <div className="text-center">
                  <Upload className="mx-auto mb-2 h-8 w-8 text-text-secondary" />
                  {fileName ? (
                    <p className="text-sm font-medium text-action-blue">
                      {fileName}
                    </p>
                  ) : (
                    <p className="text-sm text-text-secondary">
                      اسحب الملف هنا أو انقر للاختيار
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
              >
                {loading ? "جارٍ الرفع والفهرسة..." : "رفع وفهرسة"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpload(false);
                  setFileName("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-app-bg"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {documents.length === 0 && (
          <div className="rounded-2xl border border-border bg-card-bg p-12 text-center">
            <BookOpen className="mx-auto mb-3 h-12 w-12 text-text-secondary/50" />
            <p className="text-lg font-medium text-text-primary">
              لا توجد وثائق بعد
            </p>
            <p className="text-sm text-text-secondary">
              ارفع اللوائح والأدلة لتمكين UniBot من الإجابة
            </p>
          </div>
        )}

        {documents.map((doc) => {
          const Icon = docTypeIcons[doc.doc_type] || FileText;
          return (
            <div
              key={doc.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card-bg p-4 transition-shadow hover:shadow-sm"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  doc.is_active
                    ? "bg-action-blue/20 text-action-blue"
                    : "bg-app-bg text-text-secondary"
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-text-primary">
                    {doc.title}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      doc.is_active
                        ? "bg-success/10 text-success"
                        : "bg-app-bg text-text-secondary"
                    }`}
                  >
                    {doc.is_active ? "نشط" : "معطّل"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span>{docTypeLabels[doc.doc_type]}</span>
                  <span>{doc.total_chunks} جزء</span>
                  <span>
                    {new Date(doc.created_at).toLocaleDateString("ar-SA")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReindex(doc.id)}
                  disabled={reindexingId === doc.id}
                  className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-app-bg hover:text-action-blue disabled:opacity-50"
                  title="إعادة فهرسة"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${reindexingId === doc.id ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  onClick={() => handleToggle(doc.id, doc.is_active)}
                  className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-app-bg"
                  title={doc.is_active ? "تعطيل" : "تفعيل"}
                >
                  {doc.is_active ? (
                    <ToggleRight className="h-5 w-5 text-success" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
