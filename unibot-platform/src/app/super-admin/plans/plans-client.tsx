"use client";

import { useState } from "react";
import { createPlan, updatePlan, deletePlan } from "./actions";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import type { SubscriptionPlanRow } from "@/lib/types/database";

const PLAN_NAMES = [
  { value: "basic", label: "أساسي" },
  { value: "pro", label: "احترافي" },
  { value: "enterprise", label: "مؤسسي" },
];

export function PlansClient({
  initialPlans,
}: {
  initialPlans: SubscriptionPlanRow[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError("");
    try {
      await createPlan(formData);
      setShowForm(false);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string, formData: FormData) {
    setLoading(true);
    setError("");
    try {
      await updatePlan(id, formData);
      setEditingId(null);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذه الخطة؟")) return;
    setLoading(true);
    setError("");
    try {
      await deletePlan(id);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
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
          إضافة خطة جديدة
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">خطة جديدة</h2>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <PlanForm onSubmit={handleCreate} loading={loading} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm"
          >
            {editingId === plan.id ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-text-primary">تعديل الخطة</h3>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <PlanForm
                  onSubmit={(fd) => handleUpdate(plan.id, fd)}
                  loading={loading}
                  defaultValues={plan}
                />
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        plan.name === "enterprise"
                          ? "bg-purple/10 text-purple"
                          : plan.name === "pro"
                          ? "bg-action-blue/20 text-action-blue"
                          : "bg-teal/10 text-teal"
                      }`}
                    >
                      {PLAN_NAMES.find((p) => p.value === plan.name)?.label || plan.name}
                    </span>
                    {plan.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        <Check className="h-3 w-3" />
                        نشط
                      </span>
                    ) : (
                      <span className="rounded-full bg-text-secondary/10 px-2 py-0.5 text-xs font-medium text-text-secondary">
                        غير نشط
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingId(plan.id)}
                      className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg hover:text-action-blue"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-3xl font-bold text-text-primary">
                    ${plan.price_monthly}
                    <span className="text-sm font-normal text-text-secondary">/شهرياً</span>
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">الحد الأقصى للمستخدمين</span>
                    <span className="font-medium text-text-primary">
                      {plan.max_users.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">التخزين</span>
                    <span className="font-medium text-text-primary">
                      {plan.max_storage_gb} GB
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {plans.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <p className="text-sm text-text-secondary">لا توجد خطط اشتراك بعد</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-sm font-medium text-action-blue hover:underline"
          >
            إضافة أول خطة
          </button>
        </div>
      )}
    </div>
  );
}

function PlanForm({
  onSubmit,
  loading,
  defaultValues,
}: {
  onSubmit: (formData: FormData) => void;
  loading: boolean;
  defaultValues?: SubscriptionPlanRow;
}) {
  return (
    <form
      action={onSubmit}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          نوع الخطة
        </label>
        <select
          name="name"
          defaultValue={defaultValues?.name || "basic"}
          className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
        >
          {PLAN_NAMES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          السعر الشهري ($)
        </label>
        <input
          type="number"
          name="price_monthly"
          step="0.01"
          min="0"
          defaultValue={defaultValues?.price_monthly || ""}
          required
          className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
          dir="ltr"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          الحد الأقصى للمستخدمين
        </label>
        <input
          type="number"
          name="max_users"
          min="1"
          defaultValue={defaultValues?.max_users || ""}
          required
          className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
          dir="ltr"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          التخزين (GB)
        </label>
        <input
          type="number"
          name="max_storage_gb"
          min="1"
          defaultValue={defaultValues?.max_storage_gb || ""}
          required
          className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
          dir="ltr"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-text-primary">
          المميزات (JSON)
        </label>
        <textarea
          name="features"
          rows={3}
          defaultValue={
            defaultValues?.features
              ? JSON.stringify(defaultValues.features, null, 2)
              : '{\n  "ai_chatbot": true,\n  "analytics": true\n}'
          }
          className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 font-mono text-sm text-text-primary outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
          dir="ltr"
        />
      </div>

      {defaultValues && (
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <input
              type="checkbox"
              name="is_active"
              value="true"
              defaultChecked={defaultValues.is_active}
              className="h-4 w-4 rounded border-border text-action-blue focus:ring-action-blue"
            />
            الخطة نشطة
          </label>
        </div>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
        >
          {loading
            ? "جاري الحفظ..."
            : defaultValues
            ? "تحديث الخطة"
            : "إنشاء الخطة"}
        </button>
      </div>
    </form>
  );
}
