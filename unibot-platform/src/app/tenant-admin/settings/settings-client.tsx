"use client";

import { useState } from "react";
import {
  updateBranding,
  updateLocalization,
  updateAbsenceThreshold,
} from "./actions";
import { Palette, Globe, ShieldAlert } from "lucide-react";
import type { Tenant } from "@/lib/types/database";

const TIMEZONES = [
  { value: "Asia/Riyadh", label: "الرياض (UTC+3)" },
  { value: "Asia/Dubai", label: "دبي (UTC+4)" },
  { value: "Africa/Cairo", label: "القاهرة (UTC+2)" },
  { value: "Asia/Amman", label: "عمّان (UTC+3)" },
  { value: "Asia/Baghdad", label: "بغداد (UTC+3)" },
  { value: "Asia/Kuwait", label: "الكويت (UTC+3)" },
  { value: "Europe/London", label: "لندن (UTC+0)" },
];

const LANGUAGES = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
];

export function SettingsClient({ tenant }: { tenant: Tenant }) {
  const [loading, setLoading] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleAction(
    actionName: string,
    action: (fd: FormData) => Promise<void>,
    formData: FormData
  ) {
    setLoading(actionName);
    setError("");
    setSuccess("");
    try {
      await action(formData);
      setSuccess(actionName);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue/10">
            <Palette className="h-5 w-5 text-action-blue" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">العلامة التجارية</h2>
            <p className="text-sm text-text-secondary">
              تخصيص مظهر الجامعة (الشعار والألوان)
            </p>
          </div>
        </div>

        <form
          action={(fd) => handleAction("branding", updateBranding, fd)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-primary">
              رابط الشعار (URL)
            </label>
            <input
              type="url"
              name="logo_url"
              defaultValue={tenant.logo_url || ""}
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
              placeholder="https://example.com/logo.png"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              اللون الأساسي
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                name="primary_color"
                defaultValue={tenant.primary_color}
                className="h-10 w-14 cursor-pointer rounded-lg border border-border"
              />
              <input
                type="text"
                defaultValue={tenant.primary_color}
                readOnly
                className="flex-1 rounded-lg border border-border bg-app-bg px-3 py-2.5 text-sm text-text-secondary"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              اللون الثانوي
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                name="secondary_color"
                defaultValue={tenant.secondary_color}
                className="h-10 w-14 cursor-pointer rounded-lg border border-border"
              />
              <input
                type="text"
                defaultValue={tenant.secondary_color}
                readOnly
                className="flex-1 rounded-lg border border-border bg-app-bg px-3 py-2.5 text-sm text-text-secondary"
                dir="ltr"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-primary">
              رسالة الترحيب
            </label>
            <textarea
              name="welcome_message"
              rows={3}
              defaultValue={tenant.welcome_message || ""}
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
              placeholder="مرحباً بكم في نظام الجامعة الذكي..."
            />
          </div>

          <div className="sm:col-span-2">
            <SubmitButton
              loading={loading === "branding"}
              success={success === "branding"}
            />
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10">
            <Globe className="h-5 w-5 text-teal" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              اللغة والمنطقة الزمنية
            </h2>
            <p className="text-sm text-text-secondary">
              إعدادات التوطين والمنطقة الزمنية
            </p>
          </div>
        </div>

        <form
          action={(fd) => handleAction("localization", updateLocalization, fd)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              المنطقة الزمنية
            </label>
            <select
              name="timezone"
              defaultValue={tenant.timezone}
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              اللغة الافتراضية
            </label>
            <select
              name="default_language"
              defaultValue={tenant.default_language}
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <SubmitButton
              loading={loading === "localization"}
              success={success === "localization"}
            />
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10">
            <ShieldAlert className="h-5 w-5 text-danger" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">نسبة الحرمان</h2>
            <p className="text-sm text-text-secondary">
              النسبة المئوية للغياب التي تؤدي لحرمان الطالب تلقائياً
            </p>
          </div>
        </div>

        <form
          action={(fd) =>
            handleAction("absence", updateAbsenceThreshold, fd)
          }
          className="flex items-end gap-4"
        >
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-text-primary">
              نسبة الحرمان (%)
            </label>
            <input
              type="number"
              name="absence_threshold"
              min={0}
              max={100}
              step={0.01}
              defaultValue={tenant.absence_threshold}
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
              dir="ltr"
            />
            <p className="mt-1 text-xs text-text-secondary">
              القيمة الحالية في DB: CHECK (absence_threshold BETWEEN 0 AND 100)
            </p>
          </div>
          <SubmitButton
            loading={loading === "absence"}
            success={success === "absence"}
          />
        </form>
      </div>
    </div>
  );
}

function SubmitButton({
  loading,
  success,
}: {
  loading: boolean;
  success: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
        success
          ? "bg-success hover:bg-success/90"
          : "bg-action-blue hover:bg-action-blue/90"
      }`}
    >
      {loading ? "جاري الحفظ..." : success ? "تم الحفظ ✓" : "حفظ التغييرات"}
    </button>
  );
}
