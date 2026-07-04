"use client";

import { useState } from "react";
import {
  createCampus,
  updateCampus,
  deleteCampus,
  cloneCollegeToCampus,
} from "./actions";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  X,
  Copy,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

interface CampusRow {
  id: string;
  name: string;
  location: string | null;
  is_active: boolean;
}

interface CollegeForClone {
  id: string;
  name: string;
  code: string | null;
  campus_id: string | null;
  campuses: { name: string }[] | null;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

type ModalState =
  | { type: "add" }
  | { type: "edit"; campus: CampusRow }
  | { type: "clone"; campusId: string; campusName: string }
  | null;

export function CampusesClient({
  initialCampuses,
  colleges,
}: {
  initialCampuses: CampusRow[];
  colleges: CollegeForClone[];
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const closeModal = () => {
    setModal(null);
  };

  async function run(action: () => Promise<void>, successMsg?: string) {
    setLoading(true);
    const loadingToast = toast.loading("جاري تنفيذ العملية...");
    try {
      await action();
      closeModal();
      toast.dismiss(loadingToast);
      toast.success(successMsg || "تمت العملية بنجاح");
      window.location.reload();
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ غير متوقع";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleClone(sourceCollegeId: string, targetCampusId: string) {
    setLoading(true);
    const loadingToast = toast.loading("جاري استنساخ الهيكل...");
    try {
      await cloneCollegeToCampus(sourceCollegeId, targetCampusId);
      toast.dismiss(loadingToast);
      toast.success("تم الاستنساخ بنجاح! تم نسخ الهيكل الأكاديمي إلى الفرع الجديد.");
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ أثناء الاستنساخ";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card-bg px-4 py-2.5">
          <MapPin className="h-4 w-4 text-action-blue" />
          <span className="text-sm font-medium text-text-primary">{initialCampuses.length} فرع</span>
        </div>
        <button
          onClick={() => setModal({ type: "add" })}
          className="flex items-center gap-2 rounded-xl bg-action-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          إضافة فرع
        </button>
      </div>

      {initialCampuses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-action-blue/20">
            <MapPin className="h-8 w-8 text-action-blue" />
          </div>
          <p className="text-base font-semibold text-text-primary">لا توجد فروع بعد</p>
          <p className="mt-1 text-sm text-text-secondary">أضف الفرع الرئيسي للجامعة أو الفروع الإقليمية</p>
          <button
            onClick={() => setModal({ type: "add" })}
            className="mt-5 flex items-center gap-2 rounded-xl bg-action-blue px-5 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            إضافة أول فرع
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialCampuses.map((campus) => (
            <div key={campus.id} className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-blue/20">
                    <MapPin className="h-5 w-5 text-action-blue" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary">{campus.name}</p>
                    {campus.location && (
                      <p className="text-xs text-text-secondary">{campus.location}</p>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  campus.is_active ? "bg-success/10 text-success" : "bg-text-secondary/10 text-text-secondary"
                }`}>
                  {campus.is_active ? "نشط" : "غير نشط"}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setModal({ type: "edit", campus })}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium text-text-secondary transition-colors hover:border-action-blue/40 hover:text-action-blue"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  تعديل
                </button>
                <button
                  onClick={() => setModal({ type: "clone", campusId: campus.id, campusName: campus.name })}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium text-text-secondary transition-colors hover:border-purple/40 hover:text-purple"
                >
                  <Copy className="h-3.5 w-3.5" />
                  استنساخ هيكل
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`هل أنت متأكد من حذف فرع "${campus.name}"؟`)) return;
                    await run(() => deleteCampus(campus.id), "تم حذف الفرع");
                  }}
                  className="flex items-center justify-center rounded-xl border border-border p-2 text-text-secondary transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {modal?.type === "add" && (
        <Modal title="إضافة فرع جديد" onClose={closeModal}>
          <form
            action={(fd) => run(() => createCampus(fd), "تم إنشاء الفرع")}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-primary">اسم الفرع *</label>
              <input
                name="name"
                required
                placeholder="مثال: الفرع الرئيسي — صنعاء"
                className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-primary">الموقع الجغرافي</label>
              <input
                name="location"
                placeholder="مثال: صنعاء، شارع حدة"
                className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "جاري الحفظ..." : "إضافة الفرع"}
            </button>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {modal?.type === "edit" && (
        <Modal title="تعديل بيانات الفرع" onClose={closeModal}>
          <form
            action={(fd) => run(() => updateCampus(modal.campus.id, fd), "تم تحديث الفرع")}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-primary">اسم الفرع *</label>
              <input
                name="name"
                required
                defaultValue={modal.campus.name}
                className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-primary">الموقع الجغرافي</label>
              <input
                name="location"
                defaultValue={modal.campus.location || ""}
                className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-app-bg px-4 py-3">
              <span className="text-sm font-medium text-text-primary">حالة الفرع</span>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  value="true"
                  defaultChecked={modal.campus.is_active}
                  className="h-4 w-4 accent-action-blue"
                />
                <span className="text-sm text-text-secondary">نشط</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
            </button>
          </form>
        </Modal>
      )}

      {/* Clone Modal */}
      {modal?.type === "clone" && (
        <Modal title={`استنساخ هيكل أكاديمي إلى: ${modal.campusName}`} onClose={closeModal}>
          <div className="space-y-4">
            <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
              سيتم نسخ الهيكل الأكاديمي (الكلية + أقسامها + تخصصاتها + مستوياتها) إلى هذا الفرع بـ UUIDs جديدة، دون نسخ الطلاب أو المدرسين أو القاعات.
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-primary">اختر الكلية المصدر</label>
              {colleges.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-4 text-center text-sm text-text-secondary">
                  لا توجد كليات متاحة للاستنساخ
                </p>
              ) : (
                <div className="space-y-2">
                  {colleges.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => handleClone(col.id, modal.campusId)}
                      disabled={loading}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-app-bg px-4 py-3 text-right text-sm transition-colors hover:border-purple/40 hover:bg-purple/5 disabled:opacity-50"
                    >
                      <span className="font-medium text-text-primary">{col.name}</span>
                      <span className="text-xs text-text-secondary">
                        {Array.isArray(col.campuses) ? col.campuses[0]?.name : (col.campuses as any)?.name || "بدون فرع"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
