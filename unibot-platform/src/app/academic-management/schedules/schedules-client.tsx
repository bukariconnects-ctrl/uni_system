"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  getStudyPlanCoursesForScheduling,
  createCourseSchedule,
  updateCourseSchedule,
  deleteCourseSchedule,
  toggleScheduleStatus,
} from "./actions";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  FlaskConical,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────
interface Major { id: string; name: string; code: string | null; department_id: string | null; }
interface Semester { id: string; name: string; status: string; semester_type: string | null; }
interface Venue { id: string; name: string; code: string | null; venue_type: string | null; capacity: number | null; }
interface Faculty { id: string; first_name: string; last_name: string; }
interface AcademicLevel { id: string; name: string; level_number: number; major_id: string; }

interface StudyPlanCourse {
  id: string;
  course_id: string;
  plan_course_type: string;
  courses: {
    id: string; code: string; name: string; credit_hours: number;
    course_type: string; department_id: string | null;
  };
  academic_levels: { id: string; name: string; level_number: number; major_id: string };
}

interface ScheduleEntry {
  id: string;
  study_plan_course_id: string;
  component_type: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  venue_id: string | null;
  instructor_id: string | null;
  status: string;
  venues: { name: string; code: string | null; capacity: number | null } | null;
  instructors: { first_name: string; last_name: string } | null;
}

// ── Constants ──────────────────────────────────────────
const TIME_SLOTS = [
  { id: "8-10", label: "8AM-10AM", start: "08:00", end: "10:00" },
  { id: "10-12", label: "10AM-12PM", start: "10:00", end: "12:00" },
  { id: "12-2", label: "12PM-2PM", start: "12:00", end: "14:00" },
  { id: "2-4", label: "2PM-4PM", start: "14:00", end: "16:00" },
];

const DAYS: { id: string; label: string }[] = [
  { id: "sunday", label: "الأحد" },
  { id: "monday", label: "الإثنين" },
  { id: "tuesday", label: "الثلاثاء" },
  { id: "wednesday", label: "الأربعاء" },
  { id: "thursday", label: "الخميس" },
];

const ROW_TYPES = ["subject", "instructor", "venue"] as const;

interface CellSchedule {
  scheduleId: string;
  spcId: string;
  componentType: string;
  courseCode: string;
  courseName: string;
  courseId: string;
  instructorId: string | null;
  instructorName: string | null;
  venueId: string | null;
  venueName: string | null;
  status: string;
  creditHours: number;
  planCourseType: string;
}

interface EditState {
  day: string;
  slotId: string;
  rowType: typeof ROW_TYPES[number];
}

// ── Main Component ─────────────────────────────────────
export function SchedulesClient({
  majors,
  semesters: initialSemesters,
  venues,
  faculty,
  academicLevels,
}: {
  majors: Major[];
  semesters: Semester[];
  venues: Venue[];
  faculty: Faculty[];
  academicLevels: AcademicLevel[];
}) {
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSemesterObj, setSelectedSemesterObj] = useState<Semester | null>(null);
  const [loading, setLoading] = useState(false);
  const [spcList, setSpcList] = useState<StudyPlanCourse[]>([]);
  // Grid: grid[day][slotId] = CellSchedule | null
  const [grid, setGrid] = useState<Record<string, Record<string, CellSchedule | null>>>({});
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editState, setEditState] = useState<EditState | null>(null);
  const [publishMode, setPublishMode] = useState(false);
  const selectedRef = useRef<HTMLDivElement>(null);

  const filteredLevels = academicLevels.filter((l) => !selectedMajor || l.major_id === selectedMajor);

  // Compute used spcIds to prevent double-booking across time slots
  const usedSpcIds = useMemo(() => {
    const ids = new Set<string>();
    for (const d of DAYS) for (const s of TIME_SLOTS) {
      const c = grid[d.id]?.[s.id];
      if (c) ids.add(c.spcId);
    }
    return ids;
  }, [grid]);

  const loadSchedule = useCallback(async () => {
    if (!selectedLevel || !selectedSemester) return;
    setLoading(true);
    setEditState(null);
    try {
      const semesterType = (selectedSemesterObj?.semester_type || "first") as "first" | "second" | "summer";
      const result = await getStudyPlanCoursesForScheduling(selectedMajor, selectedLevel, semesterType);
      setSpcList(result.studyPlanCourses as unknown as StudyPlanCourse[]);

      const newGrid: Record<string, Record<string, CellSchedule | null>> = {};
      for (const day of DAYS) {
        newGrid[day.id] = {};
        for (const slot of TIME_SLOTS) {
          newGrid[day.id][slot.id] = null;
        }
      }

      for (const s of result.existingSchedules) {
        const day = s.day_of_week as string;
        if (!newGrid[day]) continue;

        const startTime = s.start_time?.slice(0, 5) || "";
        let slotId = "";
        for (const slot of TIME_SLOTS) {
          if (startTime >= slot.start && startTime < slot.end) {
            slotId = slot.id;
            break;
          }
        }
        if (!slotId) {
          const sorted = [...TIME_SLOTS].sort((a, b) => {
            const diffA = Math.abs(timeToMinutes(startTime) - timeToMinutes(a.start));
            const diffB = Math.abs(timeToMinutes(startTime) - timeToMinutes(b.start));
            return diffA - diffB;
          });
          slotId = sorted[0].id;
        }

        const studyPlanCourse = result.studyPlanCourses.find(
          (spc: any) => spc.id === s.study_plan_course_id
        ) as any;
        const rawCourse = studyPlanCourse?.courses;
        const course = Array.isArray(rawCourse) ? rawCourse[0] : rawCourse;

        if (!newGrid[day][slotId]) {
          newGrid[day][slotId] = {
            scheduleId: s.id,
            spcId: s.study_plan_course_id,
            componentType: s.component_type,
            courseCode: course?.code || "",
            courseName: course?.name || "",
            courseId: course?.id || "",
            instructorId: s.instructor_id,
            instructorName: s.instructors
              ? `${s.instructors.first_name} ${s.instructors.last_name}`
              : null,
            venueId: s.venue_id,
            venueName: s.venues
              ? `${s.venues.name}${s.venues.code ? ` (${s.venues.code})` : ""}`
              : null,
            status: s.status,
            creditHours: course?.credit_hours || 0,
            planCourseType: studyPlanCourse?.plan_course_type || "",
          };
        }
      }

      setGrid(newGrid);
      setHasLoaded(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedMajor, selectedLevel, selectedSemester, selectedSemesterObj]);

  // Auto-load when all three filters are selected
  useEffect(() => {
    if (selectedLevel && selectedSemester && selectedMajor) {
      loadSchedule();
    }
  }, [selectedMajor, selectedLevel, selectedSemester]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cell editing helpers ─────────────────────────────
  function startEdit(day: string, slotId: string, rowType: typeof ROW_TYPES[number]) {
    setEditState({ day, slotId, rowType });
    setError("");
  }

  function cancelEdit() {
    setEditState(null);
  }

  async function handleSubjectSelect(day: string, slotId: string, spcId: string) {
    const spc = spcList.find((s) => s.id === spcId);
    if (!spc) return;
    const course = spc.courses;
    if (!course) return;

    setSaving((prev) => ({ ...prev, [`${day}-${slotId}`]: true }));
    const loadingToast = toast.loading("جاري إضافة المادة...");

    try {
      const slot = TIME_SLOTS.find((s) => s.id === slotId)!;
      const isHybrid = course.course_type === "hybrid";
      const componentType = isHybrid ? "theoretical" : course.course_type;
      const semesterId = selectedSemester;

      const fd = new FormData();
      fd.set("study_plan_course_id", spcId);
      fd.set("semester_id", semesterId);
      fd.set("component_type", componentType);
      fd.set("day_of_week", day);
      fd.set("start_time", slot.start);
      fd.set("end_time", slot.end);
      fd.set("venue_id", "");
      fd.set("instructor_id", "");

      await createCourseSchedule(fd);
      await loadSchedule();
      toast.dismiss(loadingToast);
      toast.success(`تمت إضافة ${course.name}`);
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ في الحفظ";
      toast.error(msg);
      setError(msg);
    } finally {
      setSaving((prev) => ({ ...prev, [`${day}-${slotId}`]: false }));
      cancelEdit();
    }
  }

  async function handleInstructorSelect(day: string, slotId: string, instructorId: string) {
    const cell = grid[day]?.[slotId];
    if (!cell?.scheduleId) return;

    setSaving((prev) => ({ ...prev, [`${day}-${slotId}`]: true }));
    const loadingToast = toast.loading("جاري تحديث المحاضر...");

    try {
      const fd = new FormData();
      fd.set("day_of_week", day);
      const slot = TIME_SLOTS.find((s) => s.id === slotId)!;
      fd.set("start_time", slot.start);
      fd.set("end_time", slot.end);
      fd.set("venue_id", cell.venueId || "");
      fd.set("instructor_id", instructorId);
      fd.set("status", cell.status);

      await updateCourseSchedule(cell.scheduleId, fd);
      await loadSchedule();
      toast.dismiss(loadingToast);
      toast.success("تم تحديث المحاضر");
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setSaving((prev) => ({ ...prev, [`${day}-${slotId}`]: false }));
      cancelEdit();
    }
  }

  async function handleVenueSelect(day: string, slotId: string, venueId: string) {
    const cell = grid[day]?.[slotId];
    if (!cell?.scheduleId) return;

    setSaving((prev) => ({ ...prev, [`${day}-${slotId}`]: true }));
    const loadingToast = toast.loading("جاري تحديث القاعة...");

    try {
      const fd = new FormData();
      fd.set("day_of_week", day);
      const slot = TIME_SLOTS.find((s) => s.id === slotId)!;
      fd.set("start_time", slot.start);
      fd.set("end_time", slot.end);
      fd.set("venue_id", venueId);
      fd.set("instructor_id", cell.instructorId || "");
      fd.set("status", cell.status);

      await updateCourseSchedule(cell.scheduleId, fd);
      await loadSchedule();
      toast.dismiss(loadingToast);
      toast.success("تم تحديث القاعة");
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setSaving((prev) => ({ ...prev, [`${day}-${slotId}`]: false }));
      cancelEdit();
    }
  }

  async function handleDeleteCell(day: string, slotId: string) {
    const cell = grid[day]?.[slotId];
    if (!cell?.scheduleId) return;
    if (!confirm("هل أنت متأكد من حذف هذا الموعد؟")) return;

    setSaving((prev) => ({ ...prev, [`${day}-${slotId}`]: true }));
    const loadingToast = toast.loading("جاري حذف الموعد...");

    try {
      await deleteCourseSchedule(cell.scheduleId);
      await loadSchedule();
      toast.dismiss(loadingToast);
      toast.success("تم حذف الموعد");
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setSaving((prev) => ({ ...prev, [`${day}-${slotId}`]: false }));
      cancelEdit();
    }
  }

  async function handleToggleCell(day: string, slotId: string) {
    const cell = grid[day]?.[slotId];
    if (!cell?.scheduleId) return;

    const newStatus = cell.status === "published" ? "draft" : "published";
    setSaving((prev) => ({ ...prev, [`${day}-${slotId}`]: true }));
    const loadingToast = toast.loading("جاري تغيير الحالة...");

    try {
      await toggleScheduleStatus(cell.scheduleId, newStatus as "draft" | "published");
      await loadSchedule();
      toast.dismiss(loadingToast);
      toast.success(newStatus === "published" ? "تم النشر" : "تم الإرجاع للمسودة");
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setSaving((prev) => ({ ...prev, [`${day}-${slotId}`]: false }));
    }
  }

  return (
    <div className="space-y-5" dir="ltr">
      {/* ── Filter Bar ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">Major</label>
          <select
            value={selectedMajor}
            onChange={(e) => { setSelectedMajor(e.target.value); setSelectedLevel(""); setHasLoaded(false); }}
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue"
          >
            <option value="">— Select Major —</option>
            {majors.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">Academic Level</label>
          <select
            value={selectedLevel}
            onChange={(e) => { setSelectedLevel(e.target.value); setHasLoaded(false); }}
            disabled={!selectedMajor}
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue disabled:opacity-50"
          >
            <option value="">— Select Level —</option>
            {filteredLevels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">Semester</label>
          <select
            value={selectedSemester}
            onChange={(e) => {
              setSelectedSemester(e.target.value);
              setSelectedSemesterObj(initialSemesters.find((s) => s.id === e.target.value) || null);
              setHasLoaded(false);
            }}
            className="w-full rounded-xl border border-border bg-app-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-action-blue"
          >
            <option value="">— Select Semester —</option>
            {initialSemesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.semester_type === "first" ? "First" : s.semester_type === "second" ? "Second" : "Summer"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Loading / Empty States ────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-action-blue" />
        </div>
      )}

      {!hasLoaded && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-base font-semibold text-text-primary">Select Major, Level, and Semester</p>
          <p className="mt-1 text-sm text-text-secondary">The schedule grid will appear automatically</p>
        </div>
      )}

      {hasLoaded && !loading && spcList.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg py-16 text-center">
          <AlertTriangle className="mb-3 h-10 w-10 text-warning" />
          <p className="text-base font-semibold text-text-primary">No courses in study plan</p>
          <p className="mt-1 text-sm text-text-secondary">For this major, level, and semester type</p>
        </div>
      )}

      {/* ── Schedule Grid ──────────────────────────────── */}
      {hasLoaded && !loading && spcList.length > 0 && (
        <div ref={selectedRef}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>🟩 Drag or click to assign courses to time slots</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">
                {spcList.length} course{spcList.length !== 1 ? "s" : ""} available
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border-2 border-border shadow-sm" dir="ltr">
            <table className="w-full border-collapse" style={{ minWidth: 900 }}>
              {/* ── Header Row ───────────────────────────── */}
              <thead>
                <tr>
                  <th
                    className="border border-border bg-app-bg px-3 py-2.5 text-sm font-bold text-text-primary"
                  >
                    Day
                  </th>
                  <th
                    className="border border-border bg-app-bg px-3 py-2.5 text-sm font-bold text-text-primary"
                  >
                    Details
                  </th>
                  {TIME_SLOTS.map((slot) => (
                    <th
                      key={slot.id}
                      className="border border-border bg-app-bg px-2 py-2.5 text-center text-sm font-bold text-text-primary"
                    >
                      <div>{slot.label}</div>
                      <div className="text-[10px] font-normal text-text-secondary">
                        {slot.start} – {slot.end}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => {
                  const cellSlots = TIME_SLOTS.map((s) => grid[day.id]?.[s.id]);

                  return (<React.Fragment key={day.id}>
                    <tr key={day.id}>
                      {/* ── Day cell (rowspan=3) ──────────── */}
                      <td
                        className="border border-border bg-app-bg px-3 py-2 text-center align-middle text-sm font-bold text-text-primary"
                        rowSpan={3}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span>{day.label}</span>
                          {cellSlots.some((c) => c !== null) && (
                            <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] text-success">
                              {cellSlots.filter(Boolean).length} slot{cellSlots.filter(Boolean).length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ── Subject Row ────────────────────── */}
                      <td
                        className="border border-border bg-app-bg px-2 py-1.5 text-center text-[11px] font-semibold text-text-primary"
                      >
                        Subject
                      </td>
                      {TIME_SLOTS.map((slot) => (
                        <Cell
                          key={`${day.id}-${slot.id}-subject`}
                          cell={grid[day.id]?.[slot.id] ?? null}
                          day={day.id}
                          slotId={slot.id}
                          rowType="subject"
                          spcList={spcList}
                          editState={editState}
                          saving={saving}
                          onStartEdit={startEdit}
                          onCancelEdit={cancelEdit}
                          onSubjectSelect={handleSubjectSelect}
                          onInstructorSelect={handleInstructorSelect}
                          onVenueSelect={handleVenueSelect}
                          onDelete={handleDeleteCell}
                          onToggleStatus={handleToggleCell}
                          usedSpcIds={usedSpcIds}
                        />
                      ))}
                    </tr>
                    <tr key={`${day.id}-instructor`}>
                      {/* ── Dr. Row ───────────────────────── */}
                      <td
                        className="border border-border bg-app-bg px-2 py-1.5 text-center text-[11px] font-semibold text-text-primary"
                      >
                        Dr.
                      </td>
                      {TIME_SLOTS.map((slot) => (
                        <Cell
                          key={`${day.id}-${slot.id}-instructor`}
                          cell={grid[day.id]?.[slot.id] ?? null}
                          day={day.id}
                          slotId={slot.id}
                          rowType="instructor"
                          spcList={spcList}
                          faculty={faculty}
                          editState={editState}
                          saving={saving}
                          onStartEdit={startEdit}
                          onCancelEdit={cancelEdit}
                          onSubjectSelect={handleSubjectSelect}
                          onInstructorSelect={handleInstructorSelect}
                          onVenueSelect={handleVenueSelect}
                          onDelete={handleDeleteCell}
                          onToggleStatus={handleToggleCell}
                          usedSpcIds={usedSpcIds}
                        />
                      ))}
                    </tr>
                    <tr key={`${day.id}-hall`}>
                      {/* ── Hall Row ──────────────────────── */}
                      <td
                        className="border border-border bg-app-bg px-2 py-1.5 text-center text-[11px] font-semibold text-text-primary"
                      >
                        Hall
                      </td>
                      {TIME_SLOTS.map((slot) => (
                        <Cell
                          key={`${day.id}-${slot.id}-venue`}
                          cell={grid[day.id]?.[slot.id] ?? null}
                          day={day.id}
                          slotId={slot.id}
                          rowType="venue"
                          spcList={spcList}
                          venues={venues}
                          editState={editState}
                          saving={saving}
                          onStartEdit={startEdit}
                          onCancelEdit={cancelEdit}
                          onSubjectSelect={handleSubjectSelect}
                          onInstructorSelect={handleInstructorSelect}
                          onVenueSelect={handleVenueSelect}
                          onDelete={handleDeleteCell}
                          onToggleStatus={handleToggleCell}
                          usedSpcIds={usedSpcIds}
                        />
                      ))}
                    </tr>
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Legend ──────────────────────────────────── */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-success/10 border border-success/30"></span>
              Published
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-warning/10 border border-warning/30"></span>
              Draft
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded border border-dashed border-border"></span>
              Empty — click to add
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cell Component ──────────────────────────────────────
function Cell({
  cell,
  day,
  slotId,
  rowType,
  spcList,
  faculty,
  venues,
  editState,
  saving,
  usedSpcIds,
  onStartEdit,
  onCancelEdit,
  onSubjectSelect,
  onInstructorSelect,
  onVenueSelect,
  onDelete,
  onToggleStatus,
}: {
  cell: CellSchedule | null;
  day: string;
  slotId: string;
  rowType: typeof ROW_TYPES[number];
  spcList: StudyPlanCourse[];
  faculty?: Faculty[];
  venues?: Venue[];
  editState: EditState | null;
  saving: Record<string, boolean>;
  usedSpcIds?: Set<string>;
  onStartEdit: (day: string, slotId: string, rowType: typeof ROW_TYPES[number]) => void;
  onCancelEdit: () => void;
  onSubjectSelect: (day: string, slotId: string, spcId: string) => void;
  onInstructorSelect: (day: string, slotId: string, instructorId: string) => void;
  onVenueSelect: (day: string, slotId: string, venueId: string) => void;
  onDelete: (day: string, slotId: string) => void;
  onToggleStatus: (day: string, slotId: string) => void;
}) {
  const isEditing =
    editState?.day === day && editState?.slotId === slotId && editState?.rowType === rowType;
  const isSaving = saving[`${day}-${slotId}`];
  // Filter out courses already placed in other slots (allow current cell's own course)
  const availableSpcList = usedSpcIds
    ? spcList.filter((spc) => !usedSpcIds.has(spc.id) || (cell && cell.spcId === spc.id))
    : spcList;

  // ── Subject cell (empty / add mode) ──────────────────
  if (rowType === "subject" && !cell) {
    if (isEditing) {
      return (
        <td className="border border-border bg-card-bg p-1 align-top">
          <div className="flex flex-col gap-1">
            <select
              autoFocus
              className="w-full rounded border border-border px-1.5 py-1 text-[11px] outline-none focus:border-action-blue"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) onSubjectSelect(day, slotId, e.target.value);
              }}
            >
              <option value="">— Select course —</option>
              {availableSpcList.map((spc) => {
                  const course = spc.courses;
                  const typeLabel =
                    course?.course_type === "hybrid"
                      ? " (T)"
                      : course?.course_type === "practical"
                        ? " (P)"
                        : "";
                  return (
                    <option key={spc.id} value={spc.id}>
                      {course?.code} — {course?.name}{typeLabel}
                    </option>
                  );
                })}
            </select>
            <div className="flex gap-1">
              <button
                onClick={onCancelEdit}
                className="flex-1 rounded border border-border px-1 py-0.5 text-[10px] text-text-secondary hover:bg-app-bg"
              >
                Cancel
              </button>
              {cell && (
                <button
                  onClick={() => onDelete(day, slotId)}
                  className="rounded border border-danger/30 px-1 py-0.5 text-[10px] text-danger hover:bg-danger/10"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </td>
      );
    }

    return (
      <td
        className="border border-border bg-card-bg p-0"
        onClick={() => onStartEdit(day, slotId, "subject")}
      >
        <div className="flex min-h-[44px] cursor-pointer items-center justify-center hover:bg-action-blue/5">
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-action-blue" />
          ) : (
            <Plus className="h-4 w-4 text-text-secondary" />
          )}
        </div>
      </td>
    );
  }

  // ── Subject cell (occupied) ──────────────────────────
  if (rowType === "subject" && cell) {
    if (isEditing) {
      return (
        <td className="border border-border bg-card-bg p-1 align-top">
          <div className="flex flex-col gap-1">
            <select
              autoFocus
              className="w-full rounded border border-border px-1.5 py-1 text-[11px] outline-none focus:border-action-blue"
              defaultValue={cell.spcId}
              onChange={(e) => {
                if (e.target.value) onSubjectSelect(day, slotId, e.target.value);
              }}
            >
              <option value="">— Select course —</option>
              {availableSpcList.map((spc) => {
                const course = spc.courses;
                const typeLabel =
                  course?.course_type === "hybrid"
                    ? " (T)"
                    : course?.course_type === "practical"
                      ? " (P)"
                      : "";
                return (
                  <option key={spc.id} value={spc.id}>
                    {course?.code} — {course?.name}{typeLabel}
                  </option>
                );
              })}
            </select>
            <div className="flex gap-1">
              <button
                onClick={onCancelEdit}
                className="flex-1 rounded border border-border px-1 py-0.5 text-[10px] text-text-secondary hover:bg-app-bg"
              >
                Done
              </button>
              <button
                onClick={() => onToggleStatus(day, slotId)}
                className={`flex-1 rounded border px-1 py-0.5 text-[10px] ${
                  cell.status === "published"
                    ? "border-warning/30 text-warning hover:bg-warning/10"
                    : "border-success/30 text-success hover:bg-success/10"
                }`}
              >
                {cell.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button
                onClick={() => onDelete(day, slotId)}
                className="rounded border border-danger/30 px-1 py-0.5 text-[10px] text-danger hover:bg-danger/10"
              >
                Remove
              </button>
            </div>
          </div>
        </td>
      );
    }

    const isPublished = cell.status === "published";
    const isPractical = cell.componentType === "practical";

    return (
      <td
        className={`border border-black p-1.5 ${isPublished ? "bg-success/10" : "bg-warning/10"} cursor-pointer`}
        onClick={() => onStartEdit(day, slotId, "subject")}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            {isPractical ? (
              <FlaskConical className="h-3 w-3 flex-shrink-0 text-purple" />
            ) : (
              <BookOpen className="h-3 w-3 flex-shrink-0 text-action-blue" />
            )}
            <span className="text-[11px] font-bold leading-tight text-text-primary">
              {cell.courseCode}
            </span>
            {cell.creditHours > 0 && (
              <span className="text-[9px] text-text-secondary">({cell.creditHours}h)</span>
            )}
          </div>
          <span className="mt-0.5 text-[10px] leading-tight text-text-secondary line-clamp-2">
            {cell.courseName}
          </span>
          <div className="mt-1 flex items-center gap-1">
            {isPublished ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-success">
                <CheckCircle className="h-2.5 w-2.5" /> Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-warning">
                <Clock className="h-2.5 w-2.5" /> Draft
              </span>
            )}
            {isPractical && (
              <span className="rounded bg-purple/10 px-1 text-[8px] text-purple">Lab</span>
            )}
          </div>
        </div>
      </td>
    );
  }

  // ── Dr. / Instructor cell ────────────────────────────
  if (rowType === "instructor") {
    if (!cell) {
      return (
        <td className="border border-border bg-card-bg p-0">
          <div className="flex min-h-[36px] items-center justify-center">
            <span className="text-[10px] text-text-secondary/50">—</span>
          </div>
        </td>
      );
    }

    if (isEditing) {
      return (
        <td className="border border-border bg-card-bg p-1 align-top">
          <select
            autoFocus
            className="w-full rounded border border-border px-1.5 py-1 text-[11px] outline-none focus:border-action-blue"
            defaultValue={cell.instructorId || ""}
            onChange={(e) => {
              if (e.target.value) onInstructorSelect(day, slotId, e.target.value);
              else onCancelEdit();
            }}
          >
            <option value="">— None —</option>
            {(faculty || []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.first_name} {f.last_name}
              </option>
            ))}
          </select>
          <button
            onClick={onCancelEdit}
            className="mt-1 w-full rounded border border-border px-1 py-0.5 text-[10px] text-text-secondary hover:bg-app-bg"
          >
            Done
          </button>
        </td>
      );
    }

    return (
      <td
        className="border border-border bg-card-bg p-1.5 cursor-pointer hover:bg-action-blue/5"
        onClick={() => onStartEdit(day, slotId, "instructor")}
      >
        {isSaving ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-3 w-3 animate-spin text-action-blue" />
          </div>
        ) : cell.instructorName ? (
          <span className="text-[11px] text-text-primary">{cell.instructorName}</span>
        ) : (
          <span className="text-[10px] text-text-secondary italic">—</span>
        )}
      </td>
    );
  }

  // ── Hall / Venue cell ────────────────────────────────
  if (rowType === "venue") {
    if (!cell) {
      return (
        <td className="border border-border bg-card-bg p-0">
          <div className="flex min-h-[36px] items-center justify-center">
            <span className="text-[10px] text-text-secondary/50">—</span>
          </div>
        </td>
      );
    }

    if (isEditing) {
      return (
        <td className="border border-border bg-card-bg p-1 align-top">
          <select
            autoFocus
            className="w-full rounded border border-border px-1.5 py-1 text-[11px] outline-none focus:border-action-blue"
            defaultValue={cell.venueId || ""}
            onChange={(e) => {
              if (e.target.value) onVenueSelect(day, slotId, e.target.value);
              else onCancelEdit();
            }}
          >
            <option value="">— None —</option>
            {(venues || []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.code ? `(${v.code})` : ""} — {v.capacity ?? "?"} seats
              </option>
            ))}
          </select>
          <button
            onClick={onCancelEdit}
            className="mt-1 w-full rounded border border-border px-1 py-0.5 text-[10px] text-text-secondary hover:bg-app-bg"
          >
            Done
          </button>
        </td>
      );
    }

    return (
      <td
        className="border border-border bg-card-bg p-1.5 cursor-pointer hover:bg-action-blue/5"
        onClick={() => onStartEdit(day, slotId, "venue")}
      >
        {isSaving ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-3 w-3 animate-spin text-action-blue" />
          </div>
        ) : cell.venueName ? (
          <span className="text-[11px] text-text-primary">{cell.venueName}</span>
        ) : (
          <span className="text-[10px] text-text-secondary italic">—</span>
        )}
      </td>
    );
  }

  return null;
}

// ── Helpers ─────────────────────────────────────────────
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
