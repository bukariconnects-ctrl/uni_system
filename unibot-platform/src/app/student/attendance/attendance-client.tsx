"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  UserCheck,
  UserX,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  present: { label: "حاضر", color: "text-success", icon: UserCheck },
  absent: { label: "غائب", color: "text-danger", icon: UserX },
  late: { label: "متأخر", color: "text-warning", icon: Clock },
  excused: { label: "معذور", color: "text-action-blue", icon: ShieldCheck },
};

export function StudentAttendanceClient({
  enrollments,
  summaries,
  records,
}: {
  enrollments: any[];
  summaries: any[];
  records: any[];
}) {
  const [tab, setTab] = useState<"summary" | "details">("summary");
  const [filterSection, setFilterSection] = useState("");

  const filteredRecords = filterSection
    ? records.filter((r: any) => r.section_id === filterSection)
    : records;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-app-bg p-1">
        <button
          onClick={() => setTab("summary")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${tab === "summary" ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          <ClipboardCheck className="h-4 w-4" />
          ملخص الحضور
        </button>
        <button
          onClick={() => setTab("details")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${tab === "details" ? "bg-card-bg text-action-blue shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          <Clock className="h-4 w-4" />
          التفاصيل
        </button>
      </div>

      {tab === "summary" && (
        <div className="space-y-3">
          {summaries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد بيانات حضور بعد</p>
            </div>
          ) : (
            summaries.map((summary: any) => {
              const pct = summary.absence_percentage ?? 0;
              const attendPct = 100 - pct;
              const barColor = pct >= 25 ? "bg-danger" : pct >= 15 ? "bg-warning" : "bg-success";

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
                    <span className={`text-sm font-bold ${pct >= 25 ? "text-danger" : pct >= 15 ? "text-warning" : "text-success"}`}>
                      {attendPct.toFixed(0)}% حضور
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
