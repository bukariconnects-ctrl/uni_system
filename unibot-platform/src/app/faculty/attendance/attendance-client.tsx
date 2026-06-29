"use client";

import { useState, useEffect } from "react";
import {
  createAttendanceSession,
  generateQrCode,
  closeSession,
  reopenSession,
  getSessionRecords,
  updateAttendanceRecord,
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
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  present: { label: "حاضر", color: "bg-success/10 text-success", icon: UserCheck },
  absent: { label: "غائب", color: "bg-danger/10 text-danger", icon: UserX },
  late: { label: "متأخر", color: "bg-warning/10 text-warning", icon: Clock },
  excused: { label: "معذور", color: "bg-action-blue/20 text-action-blue", icon: ShieldCheck },
};

export function AttendanceClient({
  courses,
  sessions,
}: {
  courses: any[];
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

  async function handleAction(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
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
      setError(e instanceof Error ? e.message : "حدث خطأ");
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
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeQrSessionId) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleGenerateQr(activeQrSessionId);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQrSessionId, qrData?.token]);

  async function handleStatusChange(recordId: string, status: "present" | "absent" | "late" | "excused") {
    setLoading(true);
    setError("");
    try {
      await updateAttendanceRecord(recordId, status);
      if (expandedId) {
        const data = await getSessionRecords(expandedId);
        setRecords(data);
      }
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
          جلسة حضور جديدة
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">إنشاء جلسة حضور</h3>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-app-bg"><X className="h-5 w-5" /></button>
          </div>
          <form action={(fd) => handleAction(async () => { await createAttendanceSession(fd); setShowForm(false); })} className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">المقرر</label>
              <select name="course_id" required className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue">
                <option value="">-- اختر --</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
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
                      {session.courses?.code}
                    </span>
                    {session.is_open ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">مفتوحة</span>
                    ) : (
                      <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">مغلقة</span>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary">
                    {new Date(session.session_date).toLocaleDateString("ar-SA")} — {session.start_time}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!session.is_open && (
                  <button onClick={() => handleAction(() => reopenSession(session.id))} className="rounded-lg p-1.5 text-success hover:bg-success/10" title="إعادة فتح الجلسة">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                {!session.is_open && (
                  <button onClick={() => handleGenerateQr(session.id)} className="rounded-lg p-1.5 text-action-blue hover:bg-action-blue/20" title="توليد QR">
                    <QrCode className="h-4 w-4" />
                  </button>
                )}
                {session.is_open && (
                  <button onClick={() => handleAction(() => closeSession(session.id))} className="rounded-lg p-1.5 text-danger hover:bg-danger/10" title="إغلاق الجلسة">
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
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
                      // Load records if not already loaded
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
