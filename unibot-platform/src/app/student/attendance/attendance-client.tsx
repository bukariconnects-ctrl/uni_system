"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ClipboardCheck,
  UserCheck,
  UserX,
  Clock,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  Camera,
  CheckCircle,
  XCircle,
  CameraOff,
  RefreshCw,
} from "lucide-react";
import { submitAttendanceByQr } from "./actions";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner),
  { ssr: false }
);

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  present: { label: "حاضر", color: "text-success", icon: UserCheck },
  absent: { label: "غائب", color: "text-danger", icon: UserX },
  late: { label: "متأخر", color: "text-warning", icon: Clock },
  excused: { label: "معذور", color: "text-action-blue", icon: ShieldCheck },
};

export function StudentAttendanceClient({
  enrollments,
  summaries: initialSummaries,
  records: initialRecords,
  studentId,
}: {
  enrollments: any[];
  summaries: any[];
  records: any[];
  studentId: string;
}) {
  const [tab, setTab] = useState<"scan" | "summary" | "details">("scan");
  const [filterSection, setFilterSection] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [summaries, setSummaries] = useState(initialSummaries);
  const [records, setRecords] = useState(initialRecords);

  // Real-time subscription for attendance updates
  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to attendance_records changes for this student
    const recordsChannel = supabase
      .channel('student-attendance-records')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `student_id=eq.${studentId}`,
        },
        async (payload) => {
          // Refetch records when there's a change
          const { data: newRecords } = await supabase
            .from("attendance_records")
            .select("*, attendance_sessions(session_date, start_time, sections(section_code, courses(code, name)))")
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
            .limit(100);
          
          if (newRecords) {
            setRecords(newRecords);
          }
        }
      )
      .subscribe();

    // Subscribe to attendance_summaries changes for this student
    const summariesChannel = supabase
      .channel('student-attendance-summaries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_summaries',
          filter: `student_id=eq.${studentId}`,
        },
        async (payload) => {
          // Refetch summaries when there's a change
          const sectionIds = enrollments.map((e: any) => e.section_id);
          if (sectionIds.length > 0) {
            const { data: newSummaries } = await supabase
              .from("attendance_summaries")
              .select("*, sections(section_code, courses(code, name))")
              .eq("student_id", studentId)
              .in("section_id", sectionIds);
            
            if (newSummaries) {
              setSummaries(newSummaries);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(recordsChannel);
      supabase.removeChannel(summariesChannel);
    };
  }, [studentId, enrollments]);

  const handleQrScan = useCallback(async (result: any) => {
    if (!result || loading) return;
    
    const scannedText = typeof result === "string" ? result : result[0]?.rawValue;
    if (!scannedText || scannedText === lastScannedCode) return;
    
    setLastScannedCode(scannedText);
    setLoading(true);
    setScanResult(null);
    
    try {
      const response = await submitAttendanceByQr(scannedText);
      setScanResult(response);
      if (response.success) {
        setCameraActive(false);
      }
    } catch (e: unknown) {
      setScanResult({ success: false, message: e instanceof Error ? e.message : "حدث خطأ" });
    } finally {
      setLoading(false);
      // Reset last scanned code after a delay to allow re-scanning
      setTimeout(() => setLastScannedCode(null), 3000);
    }
  }, [loading, lastScannedCode]);

  const filteredRecords = filterSection
    ? records.filter((r: any) => r.section_id === filterSection)
    : records;

  async function handleSubmitQr() {
    if (!qrInput.trim()) return;
    setLoading(true);
    setScanResult(null);
    try {
      const result = await submitAttendanceByQr(qrInput.trim());
      setScanResult(result);
      setQrInput("");
    } catch (e: unknown) {
      setScanResult({ success: false, message: e instanceof Error ? e.message : "حدث خطأ" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-app-bg p-1">
        <button
          onClick={() => setTab("scan")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${tab === "scan" ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          <QrCode className="h-4 w-4" />
          تسجيل الحضور
        </button>
        <button
          onClick={() => setTab("summary")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${tab === "summary" ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          <ClipboardCheck className="h-4 w-4" />
          الملخص
        </button>
        <button
          onClick={() => setTab("details")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${tab === "details" ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          <Clock className="h-4 w-4" />
          التفاصيل
        </button>
      </div>

      {tab === "scan" && (
        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-action-blue/10">
              <QrCode className="h-8 w-8 text-action-blue" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">تسجيل الحضور بـ QR</h2>
            <p className="mt-1 text-sm text-text-secondary">
              امسح رمز QR المعروض من المحاضر أو أدخل الرمز يدوياً
            </p>
          </div>

          {scanResult && (
            <div className={`mb-4 flex items-center gap-3 rounded-xl p-4 ${scanResult.success ? "bg-success/10" : "bg-danger/10"}`}>
              {scanResult.success ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-danger" />
              )}
              <span className={`text-sm font-medium ${scanResult.success ? "text-success" : "text-danger"}`}>
                {scanResult.message}
              </span>
            </div>
          )}

          <div className="space-y-4">
            {/* Camera Scanner */}
            <button
              onClick={() => setCameraActive(!cameraActive)}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                cameraActive 
                  ? "bg-danger/10 text-danger hover:bg-danger/20" 
                  : "bg-action-blue/10 text-action-blue hover:bg-action-blue/20"
              }`}
            >
              {cameraActive ? (
                <>
                  <CameraOff className="h-5 w-5" />
                  إيقاف الكاميرا
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  مسح QR بالكاميرا
                </>
              )}
            </button>

            {cameraActive && (
              <div className="relative overflow-hidden rounded-xl border-2 border-action-blue">
                <div className="aspect-square w-full max-w-sm mx-auto">
                  <Scanner
                    onScan={handleQrScan}
                    onError={(error) => console.error("Scanner error:", error)}
                    constraints={{ facingMode: "environment" }}
                    styles={{
                      container: { width: "100%", height: "100%" },
                      video: { width: "100%", height: "100%", objectFit: "cover" },
                    }}
                  />
                </div>
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="flex flex-col items-center gap-2">
                      <span className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                      <span className="text-sm text-white">جاري التحقق...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card-bg px-2 text-text-secondary">أو أدخل الرمز يدوياً</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">
                رمز الحضور
              </label>
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="الصق رمز QR هنا..."
                className="w-full rounded-xl border border-border bg-app-bg px-4 py-3 text-sm outline-none transition-colors focus:border-action-blue"
                dir="ltr"
              />
            </div>

            <button
              onClick={handleSubmitQr}
              disabled={loading || !qrInput.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-action-blue px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              تسجيل الحضور
            </button>
          </div>
        </div>
      )}

      {tab === "summary" && (
        <div className="space-y-3">
          {summaries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد بيانات حضور بعد</p>
            </div>
          ) : (
            summaries.map((summary: any) => {
              const total = summary.total_sessions ?? 0;
              const attended = summary.attended_sessions ?? 0;
              const attendPct = total > 0 ? Math.round((attended / total) * 100) : 100;
              const absencePct = 100 - attendPct;
              const barColor = absencePct >= 25 ? "bg-danger" : absencePct >= 15 ? "bg-warning" : "bg-success";

              return (
                <div key={summary.id} className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">
                        {summary.sections?.courses?.code} ({summary.sections?.section_code})
                      </span>
                      {summary.is_dismissed && (
                        <span className="flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                          <AlertTriangle className="h-3 w-3" />
                          محروم
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-bold ${absencePct >= 25 ? "text-danger" : absencePct >= 15 ? "text-warning" : "text-success"}`}>
                      {attendPct}% حضور
                    </span>
                  </div>

                  <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-app-bg">
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${attendPct}%` }} />
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-app-bg p-2">
                      <p className="font-bold text-text-primary">{summary.total_sessions}</p>
                      <p className="text-text-secondary">إجمالي</p>
                    </div>
                    <div className="rounded-lg bg-success/10 p-2">
                      <p className="font-bold text-success">{summary.attended_sessions}</p>
                      <p className="text-text-secondary">حضور</p>
                    </div>
                    <div className="rounded-lg bg-danger/10 p-2">
                      <p className="font-bold text-danger">{summary.unexcused_absences}</p>
                      <p className="text-text-secondary">غياب</p>
                    </div>
                    <div className="rounded-lg bg-action-blue/10 p-2">
                      <p className="font-bold text-action-blue">{summary.excused_absences}</p>
                      <p className="text-text-secondary">أعذار</p>
                    </div>
                    <div className="rounded-lg bg-warning/10 p-2">
                      <p className="font-bold text-warning">{summary.late_count}</p>
                      <p className="text-text-secondary">تأخر</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "details" && (
        <div className="space-y-3">
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
          >
            <option value="">كل المقررات</option>
            {enrollments.map((e: any) => (
              <option key={e.section_id} value={e.section_id}>
                {e.sections?.courses?.code} ({e.sections?.section_code})
              </option>
            ))}
          </select>

          {filteredRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <Clock className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد سجلات حضور</p>
            </div>
          ) : (
            filteredRecords.map((record: any) => {
              const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.absent;
              const Icon = cfg.icon;
              return (
                <div key={record.id} className="flex items-center justify-between rounded-xl border border-border bg-card-bg p-3">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                    <div>
                      <span className="text-sm font-medium text-text-primary">
                        {record.attendance_sessions?.sections?.courses?.code} ({record.attendance_sessions?.sections?.section_code})
                      </span>
                      <div className="text-xs text-text-secondary">
                        {record.attendance_sessions?.session_date && new Date(record.attendance_sessions.session_date).toLocaleDateString("ar-SA")}
                        {record.attendance_sessions?.start_time && ` — ${record.attendance_sessions.start_time}`}
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${cfg.color === "text-success" ? "bg-success/10 text-success" : cfg.color === "text-danger" ? "bg-danger/10 text-danger" : cfg.color === "text-warning" ? "bg-warning/10 text-warning" : "bg-action-blue/10 text-action-blue"}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
