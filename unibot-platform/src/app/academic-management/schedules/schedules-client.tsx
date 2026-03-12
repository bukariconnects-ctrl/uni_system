"use client";

import { useState } from "react";
import {
  createSchedule,
  updateScheduleStatus,
  deleteSchedule,
  updateSchedule,
} from "./actions";
import {
  Plus,
  X,
  CalendarClock,
  Trash2,
  Pencil,
  CheckCircle,
  AlertTriangle,
  Send,
  FileEdit,
} from "lucide-react";

interface ScheduleRow {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  status: string;
  section_id: string;
  venue_id: string | null;
  sections: {
    section_code: string;
    courses: { code: string; name: string } | null;
    profiles: { first_name: string; last_name: string } | null;
    semesters: { name: string } | null;
  } | null;
  venues: { name: string; code: string | null } | null;
}

interface SectionOption {
  id: string;
  section_code: string;
  course_id: string;
  semester_id: string;
  instructor_id: string | null;
  courses: { code: string; name: string } | null;
  semesters: { name: string; status: string } | null;
  profiles: { first_name: string; last_name: string } | null;
}

interface VenueOption {
  id: string;
  name: string;
  code: string | null;
  venue_type: string;
  capacity: number;
}

const DAYS = [
  { value: "sunday", label: "الأحد" },
  { value: "monday", label: "الإثنين" },
  { value: "tuesday", label: "الثلاثاء" },
  { value: "wednesday", label: "الأربعاء" },
  { value: "thursday", label: "الخميس" },
  { value: "friday", label: "الجمعة" },
  { value: "saturday", label: "السبت" },
];

const DAY_LABEL: Record<string, string> = {
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
};

const DAY_COLORS: Record<string, string> = {
  sunday: "bg-action-blue/10 border-action-blue/20",
  monday: "bg-success/10 border-success/20",
  tuesday: "bg-purple/10 border-purple/20",
  wednesday: "bg-warning/10 border-warning/20",
  thursday: "bg-danger/10 border-danger/20",
  friday: "bg-teal/10 border-teal/20",
  saturday: "bg-text-secondary/10 border-text-secondary/20",
};

function isConflictError(msg: string) {
  return msg.includes("تعارض مكاني") || msg.includes("تعارض المحاضر") || msg.includes("تعارض طلابي");
}

export function SchedulesClient({
  initialSchedules,
  sections,
  venues,
}: {
  initialSchedules: ScheduleRow[];
  sections: SectionOption[];
  venues: VenueOption[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterDay, setFilterDay] = useState<string>("all");

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

  const filtered = filterDay === "all"
    ? initialSchedules
    : initialSchedules.filter((s) => s.day_of_week === filterDay);

  const grouped = DAYS.reduce<Record<string, ScheduleRow[]>>((acc, day) => {
    acc[day.value] = filtered.filter((s) => s.day_of_week === day.value);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {error && (
        <div className={`rounded-xl px-4 py-3 text-sm ${isConflictError(error) ? "bg-warning/10 border border-warning/30 text-warning" : "bg-danger/10 text-danger"}`}>
          <div className="flex items-center gap-2">
            {isConflictError(error) ? <AlertTriangle className="h-5 w-5 flex-shrink-0" /> : null}
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilterDay("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterDay === "all" ? "bg-academic-navy text-white" : "bg-app-bg text-text-secondary hover:text-text-primary"}`}
          >
            الكل
          </button>
          {DAYS.map((d) => (
            <button
              key={d.value}
              onClick={() => setFilterDay(d.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterDay === d.value ? "bg-academic-navy text-white" : "bg-app-bg text-text-secondary hover:text-text-primary"}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90">
          <Plus className="h-4 w-4" />
          محاضرة جديدة
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">إضافة محاضرة للجدول</h3>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><X className="h-5 w-5" /></button>
          </div>
          <form action={(fd) => handleAction(() => createSchedule(fd))} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">الشعبة</label>
              <select name="section_id" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                <option value="">-- اختر --</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.courses?.code} ({s.section_code}) — {s.profiles ? `${s.profiles.first_name} ${s.profiles.last_name}` : "بدون محاضر"} — {s.semesters?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">القاعة</label>
              <select name="venue_id" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                <option value="">-- بدون قاعة --</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.code ? `(${v.code})` : ""} — سعة {v.capacity}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">اليوم</label>
              <select name="day_of_week" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">وقت البداية</label>
              <input type="time" name="start_time" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">وقت النهاية</label>
              <input type="time" name="end_time" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
                {loading ? "جاري الإضافة..." : "إضافة للجدول"}
              </button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <CalendarClock className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لا توجد محاضرات مجدولة {filterDay !== "all" ? `يوم ${DAY_LABEL[filterDay]}` : ""}</p>
        </div>
      )}

      <div className="space-y-4">
        {DAYS.map((day) => {
          const daySchedules = grouped[day.value];
          if (!daySchedules || daySchedules.length === 0) return null;
          return (
            <div key={day.value}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-text-primary">
                <span className={`inline-block h-3 w-3 rounded-full ${DAY_COLORS[day.value]?.split(" ")[0]}`} />
                {day.label}
                <span className="text-xs font-normal text-text-secondary">({daySchedules.length} محاضرات)</span>
              </h3>
              <div className="space-y-2">
                {daySchedules.map((schedule) => (
                  <div key={schedule.id} className={`rounded-2xl border p-4 shadow-sm ${DAY_COLORS[schedule.day_of_week] || "bg-card-bg border-border"}`}>
                    {editId === schedule.id ? (
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-bold text-text-primary">تعديل الموعد</h4>
                          <button onClick={() => setEditId(null)} className="rounded-lg p-1 text-text-secondary hover:bg-card-bg"><X className="h-4 w-4" /></button>
                        </div>
                        <form action={(fd) => handleAction(() => updateSchedule(schedule.id, fd))} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-text-primary">القاعة</label>
                            <select name="venue_id" defaultValue={schedule.venue_id || ""} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                              <option value="">-- بدون --</option>
                              {venues.map((v) => <option key={v.id} value={v.id}>{v.name} {v.code ? `(${v.code})` : ""}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-text-primary">اليوم</label>
                            <select name="day_of_week" defaultValue={schedule.day_of_week} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                              {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-text-primary">البداية</label>
                            <input type="time" name="start_time" defaultValue={schedule.start_time} required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-text-primary">النهاية</label>
                            <input type="time" name="end_time" defaultValue={schedule.end_time} required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
                          </div>
                          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                            <button type="submit" disabled={loading} className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
                              {loading ? "جاري التحديث..." : "تحديث"}
                            </button>
                            <button type="button" onClick={() => setEditId(null)} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-card-bg">إلغاء</button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-lg font-bold text-text-primary" dir="ltr">{schedule.start_time?.slice(0, 5)}</p>
                            <p className="text-xs text-text-secondary" dir="ltr">{schedule.end_time?.slice(0, 5)}</p>
                          </div>
                          <div className="h-10 w-px bg-border" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-text-primary">
                                {schedule.sections?.courses?.code} ({schedule.sections?.section_code})
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-xs ${schedule.status === "published" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                                {schedule.status === "published" ? "منشور" : "مسودة"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <span>{schedule.sections?.courses?.name}</span>
                              {schedule.sections?.profiles && (
                                <span>— {schedule.sections.profiles.first_name} {schedule.sections.profiles.last_name}</span>
                              )}
                              {schedule.venues && (
                                <span>— {schedule.venues.name} {schedule.venues.code ? `(${schedule.venues.code})` : ""}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditId(schedule.id)} className="rounded-lg p-1.5 text-text-secondary hover:bg-card-bg" title="تعديل"><Pencil className="h-4 w-4" /></button>
                          {schedule.status === "draft" && (
                            <button onClick={() => handleAction(() => updateScheduleStatus(schedule.id, "published"))} className="rounded-lg p-1.5 text-text-secondary hover:bg-success/10 hover:text-success" title="نشر"><Send className="h-4 w-4" /></button>
                          )}
                          {schedule.status === "published" && (
                            <button onClick={() => handleAction(() => updateScheduleStatus(schedule.id, "draft"))} className="rounded-lg p-1.5 text-text-secondary hover:bg-warning/10 hover:text-warning" title="تحويل لمسودة"><FileEdit className="h-4 w-4" /></button>
                          )}
                          <button
                            onClick={() => { if (confirm("حذف هذه المحاضرة من الجدول؟")) handleAction(() => deleteSchedule(schedule.id)); }}
                            className="rounded-lg p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
