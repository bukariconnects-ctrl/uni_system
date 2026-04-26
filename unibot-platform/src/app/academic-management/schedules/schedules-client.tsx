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
  Send,
  FileEdit,
  AlertTriangle,
  MapPin,
  User,
  Clock,
  Filter,
  RotateCcw,
  Lock,
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
    course_id: string;
    semester_id: string;
    courses: { code: string; name: string } | null;
    profiles: { first_name: string; last_name: string } | null;
    semesters: { id: string; name: string } | null;
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

interface SemesterOption { id: string; name: string; status: string }
interface MajorOption { id: string; name: string; code: string | null }
interface LevelOption { id: string; name: string | null; level_number: number; major_id: string }
interface StudyPlanCourse { course_id: string; major_id: string; academic_level_id: string | null }

type ModalState =
  | { type: "add"; day: string; startTime: string }
  | { type: "edit"; schedule: ScheduleRow }
  | null;

const DAYS = [
  { value: "sunday", label: "الأحد", short: "أحد" },
  { value: "monday", label: "الإثنين", short: "إثن" },
  { value: "tuesday", label: "الثلاثاء", short: "ثلا" },
  { value: "wednesday", label: "الأربعاء", short: "أرب" },
  { value: "thursday", label: "الخميس", short: "خمي" },
];

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00",
];

const DAY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  sunday: { bg: "bg-action-blue/20", border: "border-action-blue/40", text: "text-action-blue" },
  monday: { bg: "bg-success/20", border: "border-success/40", text: "text-success" },
  tuesday: { bg: "bg-purple/20", border: "border-purple/40", text: "text-purple" },
  wednesday: { bg: "bg-warning/20", border: "border-warning/40", text: "text-warning" },
  thursday: { bg: "bg-teal/20", border: "border-teal/40", text: "text-teal" },
};

function timeToSlotIndex(time: string): number {
  const idx = TIME_SLOTS.indexOf(time.slice(0, 5));
  return idx >= 0 ? idx : 0;
}

function getSlotSpan(startTime: string, endTime: string): number {
  const startIdx = timeToSlotIndex(startTime);
  const endIdx = timeToSlotIndex(endTime);
  return Math.max(1, endIdx - startIdx);
}

function isConflictError(msg: string): boolean {
  return msg.includes("تعارض مكاني") || msg.includes("تعارض المحاضر") || msg.includes("تعارض طلابي");
}

export function SchedulesClient({
  initialSchedules,
  sections,
  venues,
  semesters,
  majors,
  academicLevels,
  studyPlanCourses,
}: {
  initialSchedules: ScheduleRow[];
  sections: SectionOption[];
  venues: VenueOption[];
  semesters: SemesterOption[];
  majors: MajorOption[];
  academicLevels: LevelOption[];
  studyPlanCourses: StudyPlanCourse[];
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filterSemesterId, setFilterSemesterId] = useState("");
  const [filterMajorId, setFilterMajorId] = useState("");
  const [filterLevelId, setFilterLevelId] = useState("");

  const filteredLevels = academicLevels.filter((l) => !filterMajorId || l.major_id === filterMajorId);

  const displayedSchedules = initialSchedules.filter((schedule) => {
    if (filterSemesterId && schedule.sections?.semesters?.id !== filterSemesterId) return false;
    if (filterMajorId) {
      const validCourseIds = new Set(
        studyPlanCourses
          .filter((spc) => spc.major_id === filterMajorId && (!filterLevelId || spc.academic_level_id === filterLevelId))
          .map((spc) => spc.course_id)
      );
      if (!validCourseIds.has(schedule.sections?.course_id || "")) return false;
    }
    return true;
  });

  const closeModal = () => {
    setModal(null);
    setError("");
  };

  async function run(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
      closeModal();
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  const schedulesByDayAndTime: Record<string, Record<string, ScheduleRow[]>> = {};
  DAYS.forEach((d) => {
    schedulesByDayAndTime[d.value] = {};
    TIME_SLOTS.forEach((t) => {
      schedulesByDayAndTime[d.value][t] = [];
    });
  });

  displayedSchedules.forEach((schedule) => {
    const day = schedule.day_of_week;
    const startSlot = schedule.start_time?.slice(0, 5);
    if (schedulesByDayAndTime[day] && schedulesByDayAndTime[day][startSlot]) {
      schedulesByDayAndTime[day][startSlot].push(schedule);
    }
  });

  const occupiedSlots: Set<string> = new Set();
  displayedSchedules.forEach((schedule) => {
    const day = schedule.day_of_week;
    const startIdx = timeToSlotIndex(schedule.start_time);
    const span = getSlotSpan(schedule.start_time, schedule.end_time);
    for (let i = 0; i < span; i++) {
      if (TIME_SLOTS[startIdx + i]) {
        occupiedSlots.add(`${day}-${TIME_SLOTS[startIdx + i]}`);
      }
    }
  });

  const totalLectures = displayedSchedules.length;
  const publishedLectures = displayedSchedules.filter((s) => s.status === "published").length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <Filter className="h-4 w-4" />
            <span>تصفية الجدول</span>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <select
              value={filterMajorId}
              onChange={(e) => { setFilterMajorId(e.target.value); setFilterLevelId(""); }}
              className="min-w-[160px] rounded-xl border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
            >
              <option value="">— كل التخصصات —</option>
              {majors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.code ? ` (${m.code})` : ""}
                </option>
              ))}
            </select>
            <select
              value={filterLevelId}
              onChange={(e) => setFilterLevelId(e.target.value)}
              disabled={!filterMajorId}
              className="min-w-[160px] rounded-xl border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">— كل المستويات —</option>
              {filteredLevels.map((l) => (
                <option key={l.id} value={l.id}>
                  المستوى {l.level_number}{l.name ? ` (${l.name})` : ""}
                </option>
              ))}
            </select>
            <select
              value={filterSemesterId}
              onChange={(e) => setFilterSemesterId(e.target.value)}
              className="min-w-[160px] rounded-xl border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
            >
              <option value="">— كل الفصول —</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {(filterMajorId || filterLevelId || filterSemesterId) && (
              <button
                onClick={() => { setFilterMajorId(""); setFilterLevelId(""); setFilterSemesterId(""); }}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-text-secondary transition-colors hover:border-danger/40 hover:text-danger"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className={`rounded-xl px-4 py-3 text-sm ${isConflictError(error) ? "bg-warning/10 border border-warning/30 text-warning" : "bg-danger/10 text-danger"}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-action-blue/10 px-3 py-2 text-action-blue">
            <CalendarClock className="h-4 w-4" />
            <span className="text-base font-bold">{totalLectures}</span>
            <span className="text-xs font-medium">محاضرة</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-success">
            <Send className="h-4 w-4" />
            <span className="text-base font-bold">{publishedLectures}</span>
            <span className="text-xs font-medium">منشورة</span>
          </div>
        </div>
        <button
          onClick={() => setModal({ type: "add", day: "sunday", startTime: "08:00" })}
          className="flex items-center gap-2 rounded-xl bg-action-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-action-blue/90"
        >
          <Plus className="h-4 w-4" />
          إضافة محاضرة
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card-bg shadow-sm">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-border bg-app-bg">
            <div className="p-3 text-center text-xs font-semibold text-text-secondary">الوقت</div>
            {DAYS.map((day) => (
              <div key={day.value} className="border-r border-border p-3 text-center">
                <p className="text-sm font-bold text-text-primary">{day.label}</p>
              </div>
            ))}
          </div>

          <div className="relative">
            {TIME_SLOTS.map((time, timeIdx) => (
              <div key={time} className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-border last:border-b-0">
                <div className="flex items-center justify-center border-l border-border bg-app-bg/50 p-2 text-xs font-medium text-text-secondary" dir="ltr">
                  {time}
                </div>
                {DAYS.map((day) => {
                  const cellKey = `${day.value}-${time}`;
                  const schedulesInSlot = schedulesByDayAndTime[day.value][time] || [];
                  const isOccupied = occupiedSlots.has(cellKey) && schedulesInSlot.length === 0;

                  if (isOccupied) {
                    return <div key={cellKey} className="border-r border-border" />;
                  }

                  return (
                    <div
                      key={cellKey}
                      className="relative min-h-[50px] border-r border-border transition-colors hover:bg-action-blue/5 cursor-pointer"
                      onClick={() => {
                        if (schedulesInSlot.length === 0) {
                          setModal({ type: "add", day: day.value, startTime: time });
                        }
                      }}
                    >
                      {schedulesInSlot.map((schedule) => {
                        const span = getSlotSpan(schedule.start_time, schedule.end_time);
                        const colors = DAY_COLORS[day.value] || DAY_COLORS.sunday;

                        return (
                          <div
                            key={schedule.id}
                            className={`absolute inset-x-1 top-1 z-10 overflow-hidden rounded-lg border ${colors.bg} ${colors.border} p-2 shadow-sm`}
                            style={{ height: `calc(${span * 50}px - 8px)` }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModal({ type: "edit", schedule });
                            }}
                          >
                            <div className="flex h-full flex-col">
                              <div className="flex items-start justify-between gap-1">
                                <p className={`text-xs font-bold ${colors.text}`}>
                                  {schedule.sections?.courses?.code}
                                </p>
                                <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                                  schedule.status === "published" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                                }`}>
                                  {schedule.status === "published" ? "منشور" : "مسودة"}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[10px] text-text-secondary line-clamp-1">
                                {schedule.sections?.courses?.name}
                              </p>
                              {span >= 2 && (
                                <>
                                  <div className="mt-auto space-y-0.5 text-[10px] text-text-secondary">
                                    {schedule.sections?.profiles && (
                                      <p className="flex items-center gap-1">
                                        <User className="h-2.5 w-2.5" />
                                        {schedule.sections.profiles.first_name} {schedule.sections.profiles.last_name}
                                      </p>
                                    )}
                                    {schedule.venues && (
                                      <p className="flex items-center gap-1">
                                        <MapPin className="h-2.5 w-2.5" />
                                        {schedule.venues.code || schedule.venues.name}
                                      </p>
                                    )}
                                    <p className="flex items-center gap-1" dir="ltr">
                                      <Clock className="h-2.5 w-2.5" />
                                      {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
        <span className="font-medium">دليل الألوان:</span>
        {DAYS.map((day) => {
          const colors = DAY_COLORS[day.value];
          return (
            <div key={day.value} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded ${colors.bg} ${colors.border} border`} />
              <span>{day.label}</span>
            </div>
          );
        })}
      </div>

      {modal?.type === "add" && (
        <AddLectureModal
          defaultDay={modal.day}
          defaultStartTime={modal.startTime}
          sections={sections}
          venues={venues}
          loading={loading}
          error={error}
          onClose={closeModal}
          onSubmit={(fd) => run(() => createSchedule(fd))}
        />
      )}

      {modal?.type === "edit" && (
        <EditLectureModal
          schedule={modal.schedule}
          venues={venues}
          loading={loading}
          error={error}
          onClose={closeModal}
          onUpdate={(fd) => run(() => updateSchedule(modal.schedule.id, fd))}
          onDelete={() => {
            if (confirm("حذف هذه المحاضرة من الجدول؟")) {
              run(() => deleteSchedule(modal.schedule.id));
            }
          }}
          onPublish={() => run(() => updateScheduleStatus(modal.schedule.id, "published"))}
          onUnpublish={() => run(() => updateScheduleStatus(modal.schedule.id, "draft"))}
        />
      )}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  error,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  error: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-card-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-app-bg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && (
          <div className={`mx-6 mt-4 rounded-lg px-4 py-3 text-sm ${isConflictError(error) ? "bg-warning/10 border border-warning/30 text-warning" : "bg-danger/10 text-danger"}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const DAYS_FULL = [
  { value: "sunday", label: "الأحد" },
  { value: "monday", label: "الإثنين" },
  { value: "tuesday", label: "الثلاثاء" },
  { value: "wednesday", label: "الأربعاء" },
  { value: "thursday", label: "الخميس" },
  { value: "friday", label: "الجمعة" },
  { value: "saturday", label: "السبت" },
];

function AddLectureModal({
  defaultDay,
  defaultStartTime,
  sections,
  venues,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  defaultDay: string;
  defaultStartTime: string;
  sections: SectionOption[];
  venues: VenueOption[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [startTime, setStartTime] = useState(defaultStartTime);

  const suggestedEndTime = () => {
    const idx = TIME_SLOTS.indexOf(startTime);
    if (idx >= 0 && idx + 2 < TIME_SLOTS.length) {
      return TIME_SLOTS[idx + 2];
    }
    return TIME_SLOTS[TIME_SLOTS.length - 1];
  };

  return (
    <Modal title="إضافة محاضرة للجدول" onClose={onClose} error={error}>
      <form action={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">الشعبة</label>
          <select
            name="section_id"
            required
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
          >
            <option value="">— اختر الشعبة —</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.courses?.code} ({s.section_code}) — {s.profiles ? `${s.profiles.first_name} ${s.profiles.last_name}` : "بدون محاضر"} — {s.semesters?.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">القاعة</label>
          <select
            name="venue_id"
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
          >
            <option value="">— بدون قاعة —</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.code ? `(${v.code})` : ""} — سعة {v.capacity}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">اليوم</label>
          <select
            name="day_of_week"
            required
            defaultValue={defaultDay}
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
          >
            {DAYS_FULL.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">وقت البداية</label>
            <input
              type="time"
              name="start_time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">وقت النهاية</label>
            <input
              type="time"
              name="end_time"
              required
              defaultValue={suggestedEndTime()}
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
              dir="ltr"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
        >
          {loading ? "جاري الإضافة..." : "إضافة للجدول"}
        </button>
      </form>
    </Modal>
  );
}

function EditLectureModal({
  schedule,
  venues,
  loading,
  error,
  onClose,
  onUpdate,
  onDelete,
  onPublish,
  onUnpublish,
}: {
  schedule: ScheduleRow;
  venues: VenueOption[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onUpdate: (fd: FormData) => void;
  onDelete: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  return (
    <Modal
      title={`${schedule.sections?.courses?.code} (${schedule.sections?.section_code})`}
      subtitle={schedule.sections?.courses?.name}
      onClose={onClose}
      error={error}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-app-bg p-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">المحاضر:</span>
              <span className="font-medium text-text-primary">
                {schedule.sections?.profiles
                  ? `${schedule.sections.profiles.first_name} ${schedule.sections.profiles.last_name}`
                  : "غير معيّن"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">الفصل:</span>
              <span className="font-medium text-text-primary">{schedule.sections?.semesters?.name || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">الحالة:</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                schedule.status === "published" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}>
                {schedule.status === "published" ? "منشور" : "مسودة"}
              </span>
            </div>
          </div>
        </div>

        {schedule.status === "published" && (
          <div className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
            <Lock className="h-4 w-4 shrink-0 text-warning" />
            <p className="text-xs text-warning">
              هذا الجدول منشور — لا يمكن تعديله مباشرة. حوّله إلى مسودة أولاً ثم أجرِ التعديلات.
            </p>
          </div>
        )}

        <form action={onUpdate} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">القاعة</label>
            <select
              name="venue_id"
              defaultValue={schedule.venue_id || ""}
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
            >
              <option value="">— بدون قاعة —</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.code ? `(${v.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">اليوم</label>
            <select
              name="day_of_week"
              defaultValue={schedule.day_of_week}
              className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
            >
              {DAYS_FULL.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-primary">وقت البداية</label>
              <input
                type="time"
                name="start_time"
                required
                defaultValue={schedule.start_time?.slice(0, 5)}
                className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-primary">وقت النهاية</label>
              <input
                type="time"
                name="end_time"
                required
                defaultValue={schedule.end_time?.slice(0, 5)}
                className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:bg-card-bg focus:ring-2 focus:ring-action-blue/20"
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || schedule.status === "published"}
            className="w-full rounded-xl bg-action-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "جاري التحديث..." : schedule.status === "published" ? "🔒 الجدول منشور" : "تحديث الموعد"}
          </button>
        </form>

        <div className="flex gap-2 border-t border-border pt-4">
          {schedule.status === "draft" && (
            <button
              onClick={onPublish}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-success/10 py-2.5 text-sm font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              نشر
            </button>
          )}
          {schedule.status === "published" && (
            <button
              onClick={onUnpublish}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-warning/10 py-2.5 text-sm font-medium text-warning transition-colors hover:bg-warning/20 disabled:opacity-50"
            >
              <FileEdit className="h-4 w-4" />
              تحويل لمسودة
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger/10 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            حذف
          </button>
        </div>
      </div>
    </Modal>
  );
}
