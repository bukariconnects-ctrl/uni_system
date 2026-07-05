"use client";

import { useState, useEffect } from "react";
import {
  createAttendanceSession,
  generateQrCode,
  closeSession,
  reopenSession,
  deleteAttendanceSession,
  getSessionRecords,
  updateAttendanceRecord,
  getAttendanceReportData,
} from "./actions";
import {
  Plus,
  X,
  QrCode,
  XCircle,
  ChevronDown,
  ChevronLeft,
  UserCheck,
  UserX,
  Clock,
  ShieldCheck,
  RotateCcw,
  FileText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAttendanceReport } from "./attendance-report-template";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  present: { label: "حاضر", color: "bg-success/10 text-success", icon: UserCheck },
  absent: { label: "غائب", color: "bg-danger/10 text-danger", icon: UserX },
  late: { label: "متأخر", color: "bg-warning/10 text-warning", icon: Clock },
  excused: { label: "معذور", color: "bg-action-blue/20 text-action-blue", icon: ShieldCheck },
};

export function AttendanceClient({
  courses,
  courseGroups,
  sessions,
}: {
  courses: any[];
  courseGroups: any[];
  sessions: any[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attendanceMode, setAttendanceMode] = useState<"qr" | "manual">("manual");
  const [records, setRecords] = useState<any[]>([]);
  const [qrData, setQrData] = useState<{ token: string; expiresAt: string } | null>(null);
  const [activeQrSessionId, setActiveQrSessionId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [reportGroupId, setReportGroupId] = useState("");
  const { generatePdf } = useAttendanceReport();

  const availableGroups = selectedCourseId
    ? courseGroups.filter((g: any) => g.course_id === selectedCourseId)
    : [];

  async function handleAction(action: () => Promise<void>, successMsg?: string) {
    setLoading(true);
    setError("");
    const loadingToast = toast.loading("جاري تنفيذ العملية...");
    try {
      await action();
      toast.dismiss(loadingToast);
      toast.success(successMsg || "تمت العملية بنجاح");
      window.location.reload();
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecords(sessionId: string) {
    if (expandedId === sessionId) {
      setExpandedId(null);
      setRecords([]);
      return;
    }
    setLoading(true);
    setExpandedId(sessionId);
    try {
      const data = await getSessionRecords(sessionId);
      setRecords(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateQr(sessionId: string) {
    setLoading(true);
    setError("");
    try {
      const data = await generateQrCode(sessionId);
      setQrData(data);
      setActiveQrSessionId(sessionId);
      setCountdown(10);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeQrSessionId) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQrSessionId, qrData?.token]);

  useEffect(() => {
    if (!activeQrSessionId || countdown > 0) return;
    handleGenerateQr(activeQrSessionId);
  }, [countdown]);

  async function handleStatusChange(recordId: string, status: "present" | "absent" | "late" | "excused") {
    setLoading(true);
    try {
      await updateAttendanceRecord(recordId, status);
      toast.success("تم تحديث حالة الحضور");
      if (expandedId) {
        const data = await getSessionRecords(expandedId);
        setRecords(data);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={selectedCourseId}
            onChange={(e) => { setSelectedCourseId(e.target.value); setReportGroupId(""); }}
            className="rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
          >
            <option value="">— اختر مادة للتقرير —</option>
            {courses.map((c: any) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </select>
          {selectedCourseId && (
            <select
              value={reportGroupId}
              onChange={(e) => setReportGroupId(e.target.value)}
              className="rounded-lg border border-border bg-card-bg px-3 py-2.5 text-sm outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
            >
              <option value="">— جميع التخصصات —</option>
              {courseGroups.filter((g: any) => g.course_id === selectedCourseId).map((g: any) => (
                <option key={g.study_plan_course_id} value={g.study_plan_course_id}>
                  {g.major_name || "تخصص"} — مستوى {g.level_number ?? ""}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={async () => {
              if (!selectedCourseId) { toast.error("اختر مادة أولاً"); return; }
              try {
                const group = courseGroups.find((g: any) => g.study_plan_course_id === reportGroupId);
                const filter = reportGroupId && group
                  ? { major_id: group.major_id, academic_level_id: group.academic_level_id }
                  : undefined;
                const data = await getAttendanceReportData(selectedCourseId, filter);
                await generatePdf(data);
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : "فشل تحميل التقرير");
              }
            }}
            disabled={!selectedCourseId}
            className="flex items-center gap-2 rounded-lg border border-action-blue/30 bg-action-blue/5 px-4 py-2.5 text-sm font-medium text-action-blue transition-colors hover:bg-action-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="h-4 w-4" />
            تصدير تقرير PDF
          </button>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90">
          <Plus className="h-4 w-4" />
          جلسة حضور جديدة
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">إنشاء جلسة حضور</h3>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><X className="h-5 w-5" /></button>
          </div>
          <form action={(fd) => {
            handleAction(async () => {
              await createAttendanceSession(fd);
              setShowForm(false);
              setSelectedCourseId("");
              setSelectedGroupId("");
            }, "تم إنشاء جلسة الحضور");
          }} className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-text-primary">عنوان الجلسة</label>
              <input type="text" name="title" required placeholder="مثال: المحاضرة الأولى" className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">المقرر</label>
              <select
                name="course_id"
                required
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedGroupId("");
                }}
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
              >
                <option value="">-- اختر --</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {availableGroups.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-text-primary">التخصص / المستوى</label>
                <select
                  name="group_id"
                  required
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
                >
                  <option value="">-- اختر --</option>
                  {availableGroups.map((g: any) => (
                    <option key={g.study_plan_course_id} value={g.study_plan_course_id}>
                      {g.major_name || "تخصص"} — {g.academic_level_name || `مستوى ${g.level_number || ''}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">التاريخ</label>
              <input type="date" name="session_date" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">وقت البدء</label>
              <input type="time" name="start_time" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue" dir="ltr" />
            </div>
            <div className="sm:col-span-3">
              <button type="submit" disabled={loading} className="rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50">
                {loading ? "جاري الإنشاء..." : "إنشاء الجلسة"}
              </button>
            </div>
          </form>
        </div>
      )}

      {sessions.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
          <QrCode className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">لا توجد جلسات حضور بعد</p>
        </div>
      )}

      {sessions.map((session: any) => {
        const isExpanded = expandedId === session.id;
        return (
          <div key={session.id} className="rounded-2xl border border-border bg-card-bg shadow-sm">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${session.is_open ? "bg-success/10" : "bg-app-bg"}`}>
                  <QrCode className={`h-5 w-5 ${session.is_open ? "text-success" : "text-text-secondary"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary">
                      {session.title
                        ? `${session.title} - ${session.courses?.name || ''}`
                        : session.courses?.name || session.courses?.code}
                    </span>
                    {session.is_open ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">مفتوحة</span>
                    ) : (
                      <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">مغلقة</span>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary">
                    {new Date(session.session_date).toLocaleDateString("ar-SA")} — {session.start_time}
                    {session.major_name && session.academic_level_name && (
                      <span className="mr-2">— {session.major_name} / {session.academic_level_name}</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!session.is_open && (
                  <button onClick={() => handleAction(() => reopenSession(session.id), "تم إعادة فتح الجلسة")} className="rounded-lg p-1.5 text-success hover:bg-success/10" title="إعادة فتح الجلسة">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                {!session.is_open && (
                  <button onClick={() => handleGenerateQr(session.id)} className="rounded-lg p-1.5 text-action-blue hover:bg-action-blue/20" title="توليد QR">
                    <QrCode className="h-4 w-4" />
                  </button>
                )}
                {session.is_open && (
                  <button onClick={() => handleAction(() => closeSession(session.id), "تم إغلاق الجلسة")} className="rounded-lg p-1.5 text-danger hover:bg-danger/10" title="إغلاق الجلسة">
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => { if (confirm("هل أنت متأكد من حذف جلسة الحضور؟ سيتم حذف جميع سجلات الحضور المرتبطة بها.")) handleAction(() => deleteAttendanceSession(session.id), "تم حذف الجلسة"); }} className="rounded-lg p-1.5 text-danger hover:bg-danger/10" title="حذف الجلسة">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={() => loadRecords(session.id)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border p-4">
                {/* Mode Tabs */}
                <div className="mb-4 flex gap-1 rounded-lg bg-app-bg p-1">
                  <button
                    onClick={() => { setAttendanceMode("qr"); handleGenerateQr(session.id); }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${attendanceMode === "qr" ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
                  >
                    <QrCode className="h-4 w-4" />
                    تحضير بـ QR
                  </button>
                  <button
                    onClick={async () => {
                      setAttendanceMode("manual");
                      setQrData(null);
                      setActiveQrSessionId(null);
                      if (records.length === 0) {
                        setLoading(true);
                        try {
                          const data = await getSessionRecords(session.id);
                          setRecords(data);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "حدث خطأ");
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${attendanceMode === "manual" ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
                  >
                    <UserCheck className="h-4 w-4" />
                    تحضير يدوي
                  </button>
                </div>

                {/* QR Mode */}
                {attendanceMode === "qr" && qrData && activeQrSessionId === session.id && (
                  <div className="mb-4 flex flex-col items-center gap-4 rounded-xl border border-action-blue/20 bg-action-blue/5 p-6">
                    <div className="rounded-2xl border-4 border-gray-100 bg-white p-4 shadow-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrData.token)}&size=200x200&color=1a202c&bgcolor=ffffff&qzone=2`}
                        alt="رمز QR للحضور"
                        className="h-48 w-48"
                        key={qrData.token}
                      />
                    </div>
                    <div className="w-full max-w-xs">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-text-secondary">تجديد تلقائي</span>
                        <span className={`text-sm font-bold tabular-nums ${countdown <= 3 ? "text-danger" : countdown <= 6 ? "text-warning" : "text-action-blue"}`}>{countdown}ث</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div className={`h-full rounded-full transition-all duration-1000 ${countdown <= 3 ? "bg-danger" : countdown <= 6 ? "bg-warning" : "bg-action-blue"}`} style={{ width: `${(countdown / 10) * 100}%` }} />
                      </div>
                    </div>
                    <p className="text-center text-xs text-text-secondary">اعرض هذا الرمز للطلاب لتسجيل حضورهم تلقائياً</p>
                  </div>
                )}

                {attendanceMode === "qr" && (!qrData || activeQrSessionId !== session.id) && (
                  <div className="mb-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8">
                    <QrCode className="h-12 w-12 text-text-secondary" />
                    <p className="text-sm text-text-secondary">اضغط لتوليد رمز QR</p>
                    <button
                      onClick={() => handleGenerateQr(session.id)}
                      disabled={loading}
                      className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50"
                    >
                      {loading ? "جاري التوليد..." : "توليد رمز QR"}
                    </button>
                  </div>
                )}

                {/* Manual Mode - Student List */}
                {attendanceMode === "manual" && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-text-primary">قائمة الطلاب ({records.length})</h4>
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span className="flex items-center gap-1"><UserCheck className="h-3 w-3 text-success" /> حاضر</span>
                        <span className="flex items-center gap-1"><UserX className="h-3 w-3 text-danger" /> غائب</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-warning" /> متأخر</span>
                        <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-action-blue" /> معذور</span>
                      </div>
                    </div>
                    {records.length === 0 ? (
                      <p className="text-sm text-text-secondary">لا توجد سجلات</p>
                    ) : (
                      <div className="space-y-2">
                        {records.map((record: any) => {
                          const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.absent;
                          return (
                            <div key={record.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-academic-navy text-xs font-bold text-white">
                                  {record.profiles?.first_name?.[0]}{record.profiles?.last_name?.[0]}
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-text-primary">{record.profiles?.first_name} {record.profiles?.last_name}</span>
                                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                                    {record.profiles?.student_profiles?.student_number && (
                                      <span>{record.profiles.student_profiles.student_number}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {(["present", "absent", "late", "excused"] as const).map((st) => {
                                  const stCfg = STATUS_CONFIG[st];
                                  const StIcon = stCfg.icon;
                                  const isActive = record.status === st;
                                  return (
                                    <button
                                      key={st}
                                      onClick={() => handleStatusChange(record.id, st)}
                                      disabled={loading}
                                      className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${isActive ? stCfg.color : "text-text-secondary hover:bg-app-bg"}`}
                                      title={stCfg.label}
                                    >
                                      <StIcon className="h-4 w-4" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
