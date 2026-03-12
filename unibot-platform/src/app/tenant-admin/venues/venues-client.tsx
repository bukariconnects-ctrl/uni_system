"use client";

import { useState } from "react";
import { createVenue, updateVenue, deleteVenue } from "./actions";
import { Plus, Pencil, Trash2, MapPin, X, Projector, Wind } from "lucide-react";

interface VenueRow {
  id: string;
  name: string;
  code: string | null;
  venue_type: string;
  capacity: number;
  building: string | null;
  floor: string | null;
  has_projector: boolean;
  has_ac: boolean;
  is_active: boolean;
}

const VENUE_TYPES = [
  { value: "lecture_hall", label: "قاعة محاضرات" },
  { value: "lab", label: "مختبر" },
  { value: "auditorium", label: "مدرج" },
  { value: "other", label: "أخرى" },
];

export function VenuesClient({ initialVenues }: { initialVenues: VenueRow[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAction(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
      setShowForm(false);
      setEditId(null);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90">
          <Plus className="h-4 w-4" />
          قاعة جديدة
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">قاعة جديدة</h3>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><X className="h-5 w-5" /></button>
          </div>
          <VenueForm loading={loading} onSubmit={(fd) => handleAction(() => createVenue(fd))} />
        </div>
      )}

      {initialVenues.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <MapPin className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لا توجد قاعات بعد</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {initialVenues.map((venue) => (
          <div key={venue.id} className={`rounded-2xl border bg-card-bg p-4 shadow-sm ${venue.is_active ? "border-border" : "border-danger/20 opacity-60"}`}>
            {editId === venue.id ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-text-primary">تعديل القاعة</h3>
                  <button onClick={() => setEditId(null)} className="rounded-lg p-1 text-text-secondary hover:bg-app-bg"><X className="h-4 w-4" /></button>
                </div>
                <VenueForm loading={loading} defaultValues={venue} onSubmit={(fd) => handleAction(() => updateVenue(venue.id, fd))} />
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${venue.venue_type === "lab" ? "bg-success/10" : venue.venue_type === "auditorium" ? "bg-purple/10" : "bg-action-blue/10"}`}>
                      <MapPin className={`h-4 w-4 ${venue.venue_type === "lab" ? "text-success" : venue.venue_type === "auditorium" ? "text-purple" : "text-action-blue"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-text-primary">{venue.name}</span>
                        {venue.code && <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary" dir="ltr">{venue.code}</span>}
                      </div>
                      <span className="text-xs text-text-secondary">
                        {VENUE_TYPES.find((t) => t.value === venue.venue_type)?.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setEditId(venue.id)} className="rounded-lg p-1 text-text-secondary hover:bg-app-bg"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm("حذف هذه القاعة؟")) handleAction(() => deleteVenue(venue.id)); }} className="rounded-lg p-1 text-text-secondary hover:bg-danger/10 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-text-secondary">
                  <div className="flex items-center justify-between">
                    <span>السعة</span>
                    <span className="font-medium text-text-primary">{venue.capacity}</span>
                  </div>
                  {venue.building && (
                    <div className="flex items-center justify-between">
                      <span>المبنى</span>
                      <span className="font-medium text-text-primary">{venue.building}</span>
                    </div>
                  )}
                  {venue.floor && (
                    <div className="flex items-center justify-between">
                      <span>الطابق</span>
                      <span className="font-medium text-text-primary">{venue.floor}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <span className={`flex items-center gap-1 ${venue.has_projector ? "text-success" : "text-text-secondary/50"}`}>
                      <Projector className="h-3.5 w-3.5" /> بروجكتور
                    </span>
                    <span className={`flex items-center gap-1 ${venue.has_ac ? "text-success" : "text-text-secondary/50"}`}>
                      <Wind className="h-3.5 w-3.5" /> تكييف
                    </span>
                  </div>
                  {!venue.is_active && (
                    <span className="mt-1 inline-block rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">غير نشطة</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function VenueForm({
  loading,
  defaultValues,
  onSubmit,
}: {
  loading: boolean;
  defaultValues?: VenueRow;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-text-primary">اسم القاعة</label>
        <input type="text" name="name" required defaultValue={defaultValues?.name || ""} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-primary">كود القاعة</label>
        <input type="text" name="code" defaultValue={defaultValues?.code || ""} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" placeholder="H101" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-primary">النوع</label>
        <select name="venue_type" defaultValue={defaultValues?.venue_type || "lecture_hall"} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
          {VENUE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-primary">السعة</label>
        <input type="number" name="capacity" min="1" defaultValue={defaultValues?.capacity || 30} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-primary">المبنى</label>
        <input type="text" name="building" defaultValue={defaultValues?.building || ""} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-primary">الطابق</label>
        <input type="text" name="floor" defaultValue={defaultValues?.floor || ""} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="hidden" name="has_projector" value="false" />
          <input type="checkbox" name="has_projector" value="true" defaultChecked={defaultValues?.has_projector ?? true} className="h-4 w-4 rounded accent-action-blue" />
          بروجكتور
        </label>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="hidden" name="has_ac" value="false" />
          <input type="checkbox" name="has_ac" value="true" defaultChecked={defaultValues?.has_ac ?? true} className="h-4 w-4 rounded accent-action-blue" />
          تكييف
        </label>
      </div>
      {defaultValues && (
        <div>
          <label className="mb-1 block text-xs font-medium text-text-primary">الحالة</label>
          <select name="is_active" defaultValue={String(defaultValues.is_active)} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
            <option value="true">نشطة</option>
            <option value="false">غير نشطة</option>
          </select>
        </div>
      )}
      <div className="sm:col-span-2">
        <button type="submit" disabled={loading} className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
          {loading ? "جاري الحفظ..." : defaultValues ? "تحديث القاعة" : "إنشاء القاعة"}
        </button>
      </div>
    </form>
  );
}
