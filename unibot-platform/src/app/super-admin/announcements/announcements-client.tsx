"use client";

import { useState } from "react";
import {
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
} from "./actions";
import { Plus, X, Trash2, Eye, EyeOff, Megaphone } from "lucide-react";
import type { SystemAnnouncement } from "@/lib/types/database";

export function AnnouncementsClient({
  initialAnnouncements,
}: {
  initialAnnouncements: SystemAnnouncement[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError("");
    try {
      await createAnnouncement(formData);
      setShowForm(false);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    setLoading(true);
    setError("");
    try {
      await toggleAnnouncement(id, !currentActive);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الإعلان؟")) return;
    setLoading(true);
    setError("");
    try {
      await deleteAnnouncement(id);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  function isExpired(expiresAt: string | null) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          إعلان جديد
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">إعلان جديد</h2>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form action={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                عنوان الإعلان
              </label>
              <input
                type="text"
                name="title"
                required
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
                placeholder="صيانة مجدولة للمنصة"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                نص الإعلان
              </label>
              <textarea
                name="body"
                required
                rows={4}
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
                placeholder="سيتم إجراء صيانة على المنصة يوم..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                تاريخ انتهاء الصلاحية (اختياري)
              </label>
              <input
                type="datetime-local"
                name="expires_at"
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
            >
              {loading ? "جاري النشر..." : "نشر الإعلان"}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {initialAnnouncements.map((announcement) => {
          const expired = isExpired(announcement.expires_at);
          return (
            <div
              key={announcement.id}
              className={`rounded-2xl border bg-card-bg p-6 shadow-sm ${
                !announcement.is_active || expired
                  ? "border-border opacity-60"
                  : "border-action-blue/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${
                      announcement.is_active && !expired
                        ? "bg-action-blue/10"
                        : "bg-app-bg"
                    }`}
                  >
                    <Megaphone
                      className={`h-5 w-5 ${
                        announcement.is_active && !expired
                          ? "text-action-blue"
                          : "text-text-secondary"
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary">
                      {announcement.title}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary whitespace-pre-wrap">
                      {announcement.body}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-text-secondary">
                      <span>
                        {new Date(announcement.created_at).toLocaleDateString("ar-SA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      {announcement.expires_at && (
                        <span className={expired ? "text-danger" : ""}>
                          {expired ? "منتهي الصلاحية" : "ينتهي: "}
                          {new Date(announcement.expires_at).toLocaleDateString("ar-SA")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      announcement.is_active && !expired
                        ? "bg-success/10 text-success"
                        : "bg-text-secondary/10 text-text-secondary"
                    }`}
                  >
                    {announcement.is_active && !expired ? "نشط" : "غير نشط"}
                  </span>
                  <button
                    onClick={() =>
                      handleToggle(announcement.id, announcement.is_active)
                    }
                    disabled={loading}
                    className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg"
                    title={announcement.is_active ? "إخفاء" : "إظهار"}
                  >
                    {announcement.is_active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    disabled={loading}
                    className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {initialAnnouncements.length === 0 && !showForm && (
          <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
            <Megaphone className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
            <p className="text-sm text-text-secondary">لا توجد إعلانات بعد</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm font-medium text-action-blue hover:underline"
            >
              نشر أول إعلان
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
