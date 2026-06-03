"use client";

import { useState } from "react";
import {
  createTenant,
  updateTenantStatus,
  updateTenantQuota,
} from "./actions";
import {
  Plus,
  X,
  Building2,
  CircleDot,
  Ban,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { TenantStatus, SubscriptionPlanRow } from "@/lib/types/database";

interface TenantWithSubs {
  id: string;
  name: string;
  subdomain: string;
  admin_email: string;
  status: TenantStatus;
  max_users: number;
  max_storage_gb: number;
  storage_used_gb: number;
  primary_color: string;
  created_at: string;
  subscriptions: {
    status: string;
    subscription_plans: { name: string } | null;
  }[];
}

const STATUS_MAP: Record<
  TenantStatus,
  { label: string; color: string; icon: typeof CircleDot }
> = {
  active: { label: "نشطة", color: "text-success bg-success/10", icon: CircleDot },
  suspended: { label: "معلّقة", color: "text-warning bg-warning/10", icon: Ban },
  trial: { label: "تجريبية", color: "text-action-blue bg-action-blue/20", icon: CircleDot },
  deleted: { label: "محذوفة", color: "text-danger bg-danger/10", icon: Trash2 },
};

export function TenantsClient({
  initialTenants,
  plans,
}: {
  initialTenants: TenantWithSubs[];
  plans: SubscriptionPlanRow[];
}) {
  const [showWizard, setShowWizard] = useState(false);
  const [editQuota, setEditQuota] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStatusChange(id: string, status: TenantStatus) {
    const messages: Record<TenantStatus, string> = {
      active: "هل تريد تفعيل هذه الجامعة؟",
      suspended: "هل تريد تعليق هذه الجامعة؟ سيتم منع المستخدمين من الوصول.",
      trial: "هل تريد تحويل هذه الجامعة إلى الوضع التجريبي؟",
      deleted: "هل أنت متأكد من حذف هذه الجامعة؟ هذا الإجراء لا يمكن التراجع عنه.",
    };
    if (!confirm(messages[status])) return;
    setLoading(true);
    setError("");
    try {
      await updateTenantStatus(id, status);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuotaUpdate(id: string, formData: FormData) {
    setLoading(true);
    setError("");
    try {
      const max_users = parseInt(formData.get("max_users") as string);
      const max_storage_gb = parseInt(formData.get("max_storage_gb") as string);
      await updateTenantQuota(id, max_users, max_storage_gb);
      setEditQuota(null);
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
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          إنشاء جامعة جديدة
        </button>
      </div>

      {showWizard && (
        <CreateTenantWizard
          plans={plans}
          onClose={() => setShowWizard(false)}
        />
      )}

      <div className="space-y-4">
        {initialTenants.map((tenant) => (
          <div
            key={tenant.id}
            className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold"
                  style={{ backgroundColor: tenant.primary_color || "#00539C" }}
                >
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">{tenant.name}</h3>
                  <p className="text-sm text-text-secondary">{tenant.admin_email}</p>
                  <p className="text-xs text-text-secondary" dir="ltr">
                    {tenant.subdomain}.unibot.app
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(() => {
                  const s = STATUS_MAP[tenant.status];
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s.color}`}
                    >
                      <s.icon className="h-3 w-3" />
                      {s.label}
                    </span>
                  );
                })()}

                {tenant.subscriptions?.[0]?.subscription_plans?.name && (
                  <span className="rounded-full bg-purple/10 px-3 py-1 text-xs font-medium text-purple">
                    {tenant.subscriptions[0].subscription_plans.name}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
              <div>
                <p className="text-xs text-text-secondary">المستخدمون</p>
                <p className="text-sm font-medium text-text-primary">
                  — / {tenant.max_users.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">التخزين</p>
                <p className="text-sm font-medium text-text-primary">
                  {tenant.storage_used_gb} / {tenant.max_storage_gb} GB
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">تاريخ الإنشاء</p>
                <p className="text-sm font-medium text-text-primary" dir="ltr">
                  {new Date(tenant.created_at).toLocaleDateString("ar-SA")}
                </p>
              </div>
            </div>

            {editQuota === tenant.id ? (
              <form
                action={(fd) => handleQuotaUpdate(tenant.id, fd)}
                className="mt-4 flex items-end gap-3 border-t border-border pt-4"
              >
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-text-secondary">
                    الحد الأقصى للمستخدمين
                  </label>
                  <input
                    type="number"
                    name="max_users"
                    defaultValue={tenant.max_users}
                    min={1}
                    className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                    dir="ltr"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-text-secondary">
                    التخزين (GB)
                  </label>
                  <input
                    type="number"
                    name="max_storage_gb"
                    defaultValue={tenant.max_storage_gb}
                    min={1}
                    className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                    dir="ltr"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setEditQuota(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary"
                >
                  إلغاء
                </button>
              </form>
            ) : (
              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                <button
                  onClick={() => setEditQuota(tenant.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-app-bg"
                >
                  <Settings className="h-3.5 w-3.5" />
                  تعديل الحصص
                </button>
                {tenant.status === "active" && (
                  <button
                    onClick={() => handleStatusChange(tenant.id, "suspended")}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-lg border border-warning/30 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/10"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    تعليق
                  </button>
                )}
                {tenant.status === "suspended" && (
                  <button
                    onClick={() => handleStatusChange(tenant.id, "active")}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-lg border border-success/30 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/10"
                  >
                    <CircleDot className="h-3.5 w-3.5" />
                    تفعيل
                  </button>
                )}
                {tenant.status !== "deleted" && (
                  <button
                    onClick={() => handleStatusChange(tenant.id, "deleted")}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {initialTenants.length === 0 && !showWizard && (
          <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
            <p className="text-sm text-text-secondary">لا توجد جامعات مسجلة بعد</p>
            <button
              onClick={() => setShowWizard(true)}
              className="mt-3 text-sm font-medium text-action-blue hover:underline"
            >
              إنشاء أول جامعة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateTenantWizard({
  plans,
  onClose,
}: {
  plans: SubscriptionPlanRow[];
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formState, setFormState] = useState({
    name: "",
    subdomain: "",
    admin_email: "",
    admin_password: "",
    admin_first_name: "",
    admin_last_name: "",
    plan_id: plans[0]?.id || "",
    max_users: plans[0]?.max_users?.toString() || "100",
    max_storage_gb: plans[0]?.max_storage_gb?.toString() || "50",
  });

  function updateField(field: string, value: string) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  function handlePlanSelect(planId: string) {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setFormState((prev) => ({
        ...prev,
        plan_id: planId,
        max_users: plan.max_users.toString(),
        max_storage_gb: plan.max_storage_gb.toString(),
      }));
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(formState).forEach(([k, v]) => fd.append(k, v));
      await createTenant(fd);
      onClose();
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  const PLAN_LABELS: Record<string, string> = {
    basic: "أساسي",
    pro: "احترافي",
    enterprise: "مؤسسي",
  };

  return (
    <div className="rounded-2xl border border-border bg-card-bg shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-bold text-text-primary">إنشاء جامعة جديدة</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-2 border-b border-border px-6 py-3">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              s === step
                ? "bg-action-blue text-white"
                : s < step
                ? "bg-success/10 text-success"
                : "bg-app-bg text-text-secondary"
            }`}
          >
            {s}
          </div>
        ))}
        <div className="flex items-center gap-4 mr-3 text-xs text-text-secondary">
          <span className={step === 1 ? "text-action-blue font-medium" : ""}>
            بيانات الجامعة
          </span>
          <span className={step === 2 ? "text-action-blue font-medium" : ""}>
            خطة الاشتراك
          </span>
          <span className={step === 3 ? "text-action-blue font-medium" : ""}>
            التأكيد
          </span>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="p-6">
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-primary">
                اسم الجامعة
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue"
                placeholder="جامعة الملك فهد"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                النطاق الفرعي
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={formState.subdomain}
                  onChange={(e) => updateField("subdomain", e.target.value)}
                  className="w-full rounded-r-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
                  placeholder="kfu"
                  dir="ltr"
                />
                <span className="rounded-l-lg border border-r-0 border-border bg-app-bg px-3 py-2.5 text-xs text-text-secondary" dir="ltr">
                  .unibot.app
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                بريد المدير
              </label>
              <input
                type="email"
                value={formState.admin_email}
                onChange={(e) => updateField("admin_email", e.target.value)}
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
                placeholder="admin@kfu.edu.sa"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                الاسم الأول للمدير
              </label>
              <input
                type="text"
                value={formState.admin_first_name}
                onChange={(e) => updateField("admin_first_name", e.target.value)}
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
                placeholder="أحمد"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                اسم العائلة للمدير
              </label>
              <input
                type="text"
                value={formState.admin_last_name}
                onChange={(e) => updateField("admin_last_name", e.target.value)}
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
                placeholder="المحمدي"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-primary">
                كلمة مرور المدير
              </label>
              <input
                type="password"
                value={formState.admin_password}
                onChange={(e) => updateField("admin_password", e.target.value)}
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`rounded-2xl border-2 p-4 text-right transition-colors ${
                    formState.plan_id === plan.id
                      ? "border-action-blue bg-action-blue/5"
                      : "border-border hover:border-action-blue/30"
                  }`}
                >
                  <p className="text-sm font-bold text-text-primary">
                    {PLAN_LABELS[plan.name] || plan.name}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-action-blue">
                    ${plan.price_monthly}
                    <span className="text-xs font-normal text-text-secondary">
                      /شهرياً
                    </span>
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-text-secondary">
                    <p>{plan.max_users.toLocaleString()} مستخدم</p>
                    <p>{plan.max_storage_gb} GB تخزين</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  تخصيص الحد الأقصى للمستخدمين
                </label>
                <input
                  type="number"
                  value={formState.max_users}
                  onChange={(e) => updateField("max_users", e.target.value)}
                  min={1}
                  className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  تخصيص التخزين (GB)
                </label>
                <input
                  type="number"
                  value={formState.max_storage_gb}
                  onChange={(e) => updateField("max_storage_gb", e.target.value)}
                  min={1}
                  className="w-full rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-app-bg p-4">
              <h3 className="mb-3 text-sm font-bold text-text-primary">ملخص البيانات</h3>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-text-secondary">اسم الجامعة:</span>{" "}
                  <span className="font-medium text-text-primary">{formState.name}</span>
                </div>
                <div>
                  <span className="text-text-secondary">النطاق:</span>{" "}
                  <span className="font-medium text-text-primary" dir="ltr">
                    {formState.subdomain}.unibot.app
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">بريد المدير:</span>{" "}
                  <span className="font-medium text-text-primary" dir="ltr">
                    {formState.admin_email}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">اسم المدير:</span>{" "}
                  <span className="font-medium text-text-primary">
                    {formState.admin_first_name} {formState.admin_last_name}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">الخطة:</span>{" "}
                  <span className="font-medium text-text-primary">
                    {PLAN_LABELS[
                      plans.find((p) => p.id === formState.plan_id)?.name || ""
                    ] || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">المستخدمون / التخزين:</span>{" "}
                  <span className="font-medium text-text-primary">
                    {formState.max_users} / {formState.max_storage_gb} GB
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <button
          onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-app-bg"
        >
          <ChevronRight className="h-4 w-4" />
          {step === 1 ? "إلغاء" : "السابق"}
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="flex items-center gap-1.5 rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
          >
            التالي
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-action-blue px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
          >
            {loading ? "جاري الإنشاء..." : "إنشاء الجامعة"}
          </button>
        )}
      </div>
    </div>
  );
}
