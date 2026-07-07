"use client";

import { useState, useMemo, useCallback } from "react";
import { KpiCard, ChartCard } from "@/components/analytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import {
  BookOpen,
  Users,
  ClipboardCheck,
  AlertTriangle,
  GraduationCap,
  FileText,
  TrendingUp,
  UserCheck,
  Download,
} from "lucide-react";

// ── Types ──
interface MyCourse {
  faculty_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  credit_hours: number;
  major_id: string;
  major_name: string;
  academic_level_id: string;
  academic_level_number: number;
  academic_level_name: string;
  semester_id: string;
  semester_name: string;
  academic_year: string;
  enrolled_students: number;
  total_sessions: number;
  total_assignments: number;
}

interface AttendanceRoster {
  student_id: string;
  course_id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  course_code: string;
  course_name: string;
  student_major_name?: string;
  student_level_name?: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  excused_count: number;
  late_count: number;
  is_dismissed: boolean;
  unexcused_absences: number;
  absence_percentage: number;
}

interface DismissedStudent {
  student_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  first_name: string;
  last_name: string;
  student_number: string;
  student_major_name?: string;
  student_level_name?: string;
  total_sessions: number;
  unexcused_absences: number;
  excused_absences: number;
  attended_sessions: number;
  late_count: number;
  absence_percentage: number;
  dismissed_at: string;
}

interface SubmissionStats {
  course_id: string;
  assignment_id: string;
  assignment_title: string;
  faculty_id: string;
  max_grade: number;
  due_date: string;
  is_published: boolean;
  total_submissions: number;
  submitted_count: number;
  graded_count: number;
  avg_grade: number;
  max_grade_achieved: number;
  min_grade_achieved: number;
}

interface GradebookEntry {
  id: string;
  course_id: string;
  student_id: string;
  coursework_grade: number | null;
  midterm_grade: number | null;
  final_grade: number | null;
  total_grade: number | null;
  is_published: boolean;
  published_at: string | null;
  courses: { code: string; name: string } | null;
  profiles: {
    first_name: string;
    last_name: string;
    student_profiles: { student_number: string }[];
  } | null;
  enrollments: { letter_grade: string | null; final_grade: number | null } | null;
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  status: string;
  submitted_at: string | null;
  grade: number | null;
  feedback: string | null;
  is_late: boolean;
  assignments: {
    id: string;
    title: string;
    max_grade: number;
    due_date: string;
    course_id: string;
  };
  profiles: {
    first_name: string;
    last_name: string;
    student_profiles: { student_number: string }[];
  } | null;
}

interface Assignment {
  id: string;
  title: string;
  max_grade: number;
  due_date: string;
  course_id: string;
  is_published: boolean;
  enrolled_students: {
    student_id: string;
    first_name: string;
    last_name: string;
    student_number: string;
  }[];
}

interface AttendanceSummary {
  student_id: string;
  course_id: string;
  total_sessions: number;
  attended_sessions: number;
  unexcused_absences: number;
  absence_percentage: number | null;
  is_dismissed: boolean;
}

interface ReportsData {
  myCourses: MyCourse[];
  attendanceRoster: AttendanceRoster[];
  dismissedStudents: DismissedStudent[];
  submissionStats: SubmissionStats[];
  gradebookEntries: GradebookEntry[];
  submissions: Submission[];
  assignments: Assignment[];
  sessionsByCourse: Record<string, any[]>;
  attendanceMatrix: Record<string, Record<string, Record<string, string>>>;
  attendanceSummaries: AttendanceSummary[];
}

const CHART_COLORS = {
  royalBlue: "#00539C",
  peach: "#EEA47F",
  success: "#38A169",
  danger: "#E53E3E",
  purple: "#805AD5",
  teal: "#319795",
  warning: "#D69E2E",
};

const TABS = [
  { key: "overview", label: "نظرة عامة", icon: TrendingUp },
  { key: "gradebook", label: "سجل الدرجات", icon: GraduationCap },
  { key: "attendance", label: "الحضور التفصيلي", icon: ClipboardCheck },
  { key: "submissions", label: "التسليمات", icon: FileText },
];

function getLetterGrade(total: number | null): string {
  if (total == null) return "—";
  if (total >= 90) return "A+";
  if (total >= 85) return "A";
  if (total >= 80) return "B+";
  if (total >= 75) return "B";
  if (total >= 70) return "C+";
  if (total >= 65) return "C";
  if (total >= 60) return "D+";
  if (total >= 55) return "D";
  return "F";
}

export function FacultyReportsClient({ data }: { data: ReportsData }) {
  const {
    myCourses,
    attendanceRoster,
    dismissedStudents,
    submissionStats,
    gradebookEntries,
    submissions,
    assignments,
    sessionsByCourse,
    attendanceMatrix,
    attendanceSummaries,
  } = data;

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

  // Get unique course IDs
  const uniqueCourseIds = useMemo(
    () => [...new Set(myCourses.map((c) => c.course_id))],
    [myCourses]
  );

  // Courses with their code+name
  const courseOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const c of myCourses) {
      if (!map.has(c.course_id)) {
        map.set(c.course_id, { code: c.course_code, name: c.course_name });
      }
    }
    return map;
  }, [myCourses]);

  // Filter options for a selected course
  const filterOptions = useMemo(() => {
    const courseGroups = myCourses.filter((c) => c.course_id === selectedCourseId);
    const uniqueMajors = [
      ...new Map(
        courseGroups.map((c) => [c.major_id, { id: c.major_id, name: c.major_name }])
      ).values(),
    ];
    const uniqueLevels = [
      ...new Map(
        courseGroups.map((c) => [
          c.academic_level_id,
          { id: c.academic_level_id, name: c.academic_level_name, number: c.academic_level_number },
        ])
      ).values(),
    ].sort((a, b) => a.number - b.number);
    return { majors: uniqueMajors, levels: uniqueLevels };
  }, [myCourses, selectedCourseId]);

  // Helper: get enrolled students for a course (from gradebook entries or attendance roster)
  const enrolledStudentsForCourse = useCallback(
    (courseId: string) => {
      // Try from attendanceRoster (has student_id with name)
      const rosterStudents = attendanceRoster.filter((r) => r.course_id === courseId);
      if (rosterStudents.length > 0) {
        return rosterStudents.map((r) => ({
          student_id: r.student_id,
          first_name: r.first_name,
          last_name: r.last_name,
          student_number: r.student_number,
          major_name: r.student_major_name,
          level_name: r.student_level_name,
        }));
      }
      // Fallback to gradebook entries
      return gradebookEntries
        .filter((g) => g.course_id === courseId)
        .map((g) => ({
          student_id: g.student_id,
          first_name: g.profiles?.first_name || "",
          last_name: g.profiles?.last_name || "",
          student_number: g.profiles?.student_profiles?.[0]?.student_number || "",
        }));
    },
    [attendanceRoster, gradebookEntries]
  );

  // ════════════════════════════════════════════
  //  KPI CALCULATIONS (for Overview tab)
  // ════════════════════════════════════════════
  const totalCourses = myCourses.length;
  const totalStudents = [...new Set(attendanceRoster.map((r) => r.student_id))].length;
  const totalSessions = myCourses.reduce((s, c) => s + (c.total_sessions || 0), 0);
  const totalDismissed = dismissedStudents.length;
  const totalAssignments = myCourses.reduce((s, c) => s + (c.total_assignments || 0), 0);
  const totalSubmissions = submissionStats.reduce((s, sub) => s + (sub.total_submissions || 0), 0);
  const gradedCount = submissionStats.reduce((s, sub) => s + (sub.graded_count || 0), 0);

  // Attendance status distribution
  const presentCount = attendanceRoster.reduce((s, r) => s + (r.present_count || 0), 0);
  const absentCount = attendanceRoster.reduce((s, r) => s + (r.absent_count || 0), 0);
  const excusedCount = attendanceRoster.reduce((s, r) => s + (r.excused_count || 0), 0);
  const lateCount = attendanceRoster.reduce((s, r) => s + (r.late_count || 0), 0);

  const statusDistribution = [
    { name: "حاضر", value: presentCount, color: CHART_COLORS.success },
    { name: "غائب", value: absentCount, color: CHART_COLORS.danger },
    { name: "معذر", value: excusedCount, color: CHART_COLORS.warning },
    { name: "متأخر", value: lateCount, color: CHART_COLORS.purple },
  ].filter((d) => d.value > 0);

  const courseAttendanceData = myCourses
    .filter((c) => c.enrolled_students > 0)
    .map((c) => {
      const courseRecords = attendanceRoster.filter((r) => r.course_id === c.course_id);
      const present = courseRecords.reduce((s, r) => s + (r.present_count || 0), 0);
      const absent = courseRecords.reduce((s, r) => s + (r.absent_count || 0), 0);
      return { name: c.course_name, حاضر: present, غائب: absent };
    })
    .sort((a, b) => b.غائب - a.غائب);

  const submissionData = submissionStats
    .filter((s) => s.total_submissions > 0)
    .map((s) => ({
      name: s.assignment_title.length > 20 ? s.assignment_title.slice(0, 20) + "..." : s.assignment_title,
      submitted: s.submitted_count,
      graded: s.graded_count,
      avgGrade: s.avg_grade,
    }))
    .slice(0, 10);

  // ════════════════════════════════════════════
  //  GRADEBOOK TAB DATA
  // ════════════════════════════════════════════
  const gradebookForCourse = useMemo(() => {
    if (!selectedCourseId) return [];
    return gradebookEntries.filter((g) => g.course_id === selectedCourseId);
  }, [gradebookEntries, selectedCourseId]);

  // ════════════════════════════════════════════
  //  ATTENDANCE MATRIX DATA
  // ════════════════════════════════════════════
  const sessionsForSelectedCourse = useMemo(() => {
    if (!selectedCourseId) return [];
    return sessionsByCourse[selectedCourseId] || [];
  }, [sessionsByCourse, selectedCourseId]);

  const studentsForAttendanceMatrix = useMemo(() => {
    if (!selectedCourseId) return [];
    const all = enrolledStudentsForCourse(selectedCourseId);

    // Filter by major and level if selected
    let filtered = all;
    if (selectedMajorId) {
      filtered = filtered.filter(
        (s: any) => s.major_name === filterOptions.majors.find((m) => m.id === selectedMajorId)?.name
      );
    }
    if (selectedLevelId) {
      filtered = filtered.filter(
        (s: any) => s.level_name === filterOptions.levels.find((l) => l.id === selectedLevelId)?.name
      );
    }
    return filtered;
  }, [selectedCourseId, selectedMajorId, selectedLevelId, enrolledStudentsForCourse, filterOptions]);

  const matrix = useMemo(() => {
    return attendanceMatrix[selectedCourseId] || {};
  }, [attendanceMatrix, selectedCourseId]);

  // ════════════════════════════════════════════
  //  SUBMISSIONS TAB DATA
  // ════════════════════════════════════════════
  const assignmentsForCourse = useMemo(() => {
    if (!selectedCourseId) return [];
    return assignments.filter((a) => a.course_id === selectedCourseId);
  }, [assignments, selectedCourseId]);

  const selectedAssignment = useMemo(() => {
    if (!selectedAssignmentId) return null;
    return assignmentsForCourse.find((a) => a.id === selectedAssignmentId) || null;
  }, [assignmentsForCourse, selectedAssignmentId]);

  const submissionsForAssignment = useMemo(() => {
    if (!selectedAssignmentId) return [];
    return submissions.filter((s) => s.assignment_id === selectedAssignmentId);
  }, [submissions, selectedAssignmentId]);

  // Auto-select first assignment when course changes
  useMemo(() => {
    if (assignmentsForCourse.length > 0 && !selectedAssignmentId) {
      setSelectedAssignmentId(assignmentsForCourse[0].id);
    }
  }, [assignmentsForCourse, selectedAssignmentId]);

  // Build full submission list including non-submitters
  const fullSubmissionList = useMemo(() => {
    if (!selectedAssignment) return [];
    const subByStudent = new Map(submissionsForAssignment.map((s) => [s.student_id, s]));
    return selectedAssignment.enrolled_students.map((student) => {
      const sub = subByStudent.get(student.student_id);
      return {
        ...student,
        submitted: !!sub,
        status: sub?.status || "لم يسلم",
        grade: sub?.grade ?? null,
        submitted_at: sub?.submitted_at || null,
        is_late: sub?.is_late || false,
        feedback: sub?.feedback || null,
      };
    });
  }, [selectedAssignment, submissionsForAssignment]);

  return (
    <div className="space-y-6">
      {/* ── Course Selector (for tabs other than overview) ── */}
      {activeTab !== "overview" && (
        <div className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">المقرر</label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedMajorId("");
                  setSelectedLevelId("");
                  setSelectedAssignmentId("");
                }}
                className="w-full rounded-xl border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
              >
                <option value="">اختر المقرر</option>
                {uniqueCourseIds.map((cid) => {
                  const course = courseOptions.get(cid);
                  return (
                    <option key={cid} value={cid}>
                      {course?.name || cid}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Major filter for attendance matrix */}
            {activeTab === "attendance" && selectedCourseId && filterOptions.majors.length > 1 && (
              <div className="min-w-[160px]">
                <label className="mb-1 block text-xs font-medium text-text-secondary">التخصص</label>
                <select
                  value={selectedMajorId}
                  onChange={(e) => setSelectedMajorId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                >
                  <option value="">الكل</option>
                  {filterOptions.majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Level filter for attendance matrix */}
            {activeTab === "attendance" && selectedCourseId && filterOptions.levels.length > 1 && (
              <div className="min-w-[160px]">
                <label className="mb-1 block text-xs font-medium text-text-secondary">المستوى</label>
                <select
                  value={selectedLevelId}
                  onChange={(e) => setSelectedLevelId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                >
                  <option value="">الكل</option>
                  {filterOptions.levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Assignment selector for submissions tab */}
            {activeTab === "submissions" && selectedCourseId && assignmentsForCourse.length > 0 && (
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-xs font-medium text-text-secondary">التكليف</label>
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-app-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-action-blue"
                >
                  {assignmentsForCourse.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card-bg p-1.5 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-action-blue text-white shadow-sm"
                : "text-text-secondary hover:bg-app-bg hover:text-text-primary"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════  TAB: OVERVIEW  ════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="المقررات" value={totalCourses} icon={BookOpen} iconColor="bg-academic-navy/10 text-academic-navy" trend={{ value: `${totalSessions} جلسة`, direction: totalSessions > 0 ? "up" : "neutral" }} />
            <KpiCard title="الطلاب المسجلين" value={totalStudents} icon={Users} iconColor="bg-peach/10 text-action-blue" />
            <KpiCard title="جلسات الحضور" value={totalSessions} icon={ClipboardCheck} iconColor="bg-success/10 text-success" />
            <KpiCard
              title={totalDismissed > 0 ? "المحرومون" : "التكاليف"}
              value={totalDismissed > 0 ? totalDismissed : totalAssignments}
              icon={totalDismissed > 0 ? AlertTriangle : FileText}
              iconColor={totalDismissed > 0 ? "bg-danger/10 text-danger" : "bg-purple/10 text-purple"}
              trend={totalDismissed > 0 ? { value: `${(totalDismissed / Math.max(totalStudents, 1) * 100).toFixed(0)}%`, direction: "down", label: "من الطلاب" } : { value: `${totalSubmissions} تسليم`, direction: "neutral", label: `${gradedCount} مصحح` }}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="توزيع حالات الحضور" subtitle="إجمالي جميع المقررات">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="var(--color-card-bg)" strokeWidth={2}>
                    {statusDistribution.map((_e, idx) => (
                      <Cell key={idx} fill={[CHART_COLORS.success, CHART_COLORS.danger, CHART_COLORS.warning, CHART_COLORS.purple][idx]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "var(--color-card-bg)", borderColor: "var(--color-border)", borderRadius: "12px", color: "var(--color-text-primary)" }} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: "var(--color-text-secondary)", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="الحضور حسب المقرر" subtitle="عدد مرات الحضور والغياب لكل مقرر">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={courseAttendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--color-card-bg)", borderColor: "var(--color-border)", borderRadius: "12px", color: "var(--color-text-primary)" }} />
                  <Legend />
                  <Bar dataKey="حاضر" fill={CHART_COLORS.success} stackId="a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="غائب" fill={CHART_COLORS.danger} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="حالة التكاليف" subtitle="عدد التسليمات والتصحيحات">
              {submissionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={submissionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fill: "var(--color-text-secondary)", fontSize: 9 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                    <YAxis yAxisId="left" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-card-bg)", borderColor: "var(--color-border)", borderRadius: "12px", color: "var(--color-text-primary)" }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="submitted" name="تم التسليم" fill={CHART_COLORS.royalBlue} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="graded" name="تم التصحيح" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="avgGrade" name="المتوسط" stroke={CHART_COLORS.peach} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center"><p className="text-text-secondary">لا توجد تكاليف بعد</p></div>
              )}
            </ChartCard>
            <ChartCard title="المقررات التي تدرسها" subtitle="نظرة سريعة">
              <div className="space-y-3">
                {myCourses.slice(0, 6).map((c) => (
                  <div key={`${c.course_id}-${c.major_id}`} className="flex items-center justify-between rounded-lg border border-border bg-app-bg/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{c.course_name}</p>
                      <p className="text-xs text-text-secondary">{c.major_name || ""} {c.academic_level_name ? `- ${c.academic_level_name}` : ""}</p>
                    </div>
                    <div className="text-left text-xs text-text-secondary">
                      <p>{c.enrolled_students} طالب</p>
                      <p>{c.total_sessions} جلسة</p>
                    </div>
                  </div>
                ))}
                {myCourses.length === 0 && <div className="flex h-[200px] items-center justify-center"><p className="text-text-secondary">لا توجد مقررات مسندة</p></div>}
                {myCourses.length > 6 && <p className="text-center text-xs text-text-secondary">...و {myCourses.length - 6} مقررات أخرى</p>}
              </div>
            </ChartCard>
          </div>

          {/* Dismissed Students */}
          {dismissedStudents.length > 0 && (
            <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">الطلاب المحرومون</h2>
                <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">{dismissedStudents.length} طالب</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-secondary">
                      <th className="pb-3 pl-4 font-medium">الطالب</th><th className="pb-3 pl-4 font-medium">الرقم</th><th className="pb-3 pl-4 font-medium">التخصص</th><th className="pb-3 pl-4 font-medium">المستوى</th><th className="pb-3 pl-4 font-medium">المقرر</th><th className="pb-3 pl-4 font-medium">الجلسات</th><th className="pb-3 pl-4 font-medium">الغياب</th><th className="pb-3 pl-4 font-medium">نسبة الغياب</th><th className="pb-3 font-medium">تاريخ الحرمان</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dismissedStudents.map((s) => (
                      <tr key={`${s.student_id}-${s.course_id}`} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                        <td className="py-3 pl-4 font-medium text-text-primary">{s.first_name} {s.last_name}</td>
                        <td className="py-3 pl-4 text-text-secondary">{s.student_number || "—"}</td>
                        <td className="py-3 pl-4 text-text-primary">{s.student_major_name || "—"}</td>
                        <td className="py-3 pl-4 text-text-primary">{s.student_level_name || "—"}</td>
                        <td className="py-3 pl-4 text-text-primary">{s.course_name}</td>
                        <td className="py-3 pl-4 text-text-primary">{s.total_sessions}</td>
                        <td className="py-3 pl-4"><span className="text-danger font-medium">{s.unexcused_absences}</span><span className="text-text-secondary text-xs mr-1">/ {s.excused_absences} معذر</span></td>
                        <td className="py-3 pl-4 text-text-primary">{s.absence_percentage}%</td>
                        <td className="py-3 text-text-secondary">{s.dismissed_at ? new Date(s.dismissed_at).toLocaleDateString("ar-SA") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attendance Roster */}
          <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-text-primary">سجل الحضور والغياب</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="pb-3 pl-4 font-medium">الطالب</th><th className="pb-3 pl-4 font-medium">الرقم</th><th className="pb-3 pl-4 font-medium">التخصص</th><th className="pb-3 pl-4 font-medium">المستوى</th><th className="pb-3 pl-4 font-medium">المقرر</th><th className="pb-3 pl-4 font-medium">حاضر</th><th className="pb-3 pl-4 font-medium">غائب</th><th className="pb-3 pl-4 font-medium">معذر</th><th className="pb-3 pl-4 font-medium">متأخر</th><th className="pb-3 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRoster.slice(0, 50).map((r) => (
                    <tr key={`${r.student_id}-${r.course_id}`} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                      <td className="py-3 pl-4 font-medium text-text-primary">{r.first_name} {r.last_name}</td>
                      <td className="py-3 pl-4 text-text-secondary">{r.student_number || "—"}</td>
                      <td className="py-3 pl-4 text-text-primary">{r.student_major_name || "—"}</td>
                      <td className="py-3 pl-4 text-text-primary">{r.student_level_name || "—"}</td>
                      <td className="py-3 pl-4 text-text-secondary">{r.course_name || "—"}</td>
                      <td className="py-3 pl-4 text-success">{r.present_count}</td>
                      <td className="py-3 pl-4"><span className={r.absent_count > 0 ? "text-danger" : ""}>{r.absent_count}</span></td>
                      <td className="py-3 pl-4 text-warning">{r.excused_count}</td>
                      <td className="py-3 pl-4 text-purple">{r.late_count}</td>
                      <td className="py-3">{r.is_dismissed ? <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">محروم</span> : <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">نشط</span>}</td>
                    </tr>
                  ))}
                  {attendanceRoster.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-text-secondary">لا توجد سجلات حضور</td></tr>}
                </tbody>
              </table>
            </div>
            {attendanceRoster.length > 50 && <p className="mt-3 text-center text-xs text-text-secondary">يتم عرض أول 50 طالباً فقط</p>}
          </div>
        </div>
      )}

      {/* ════════════════════════════════  TAB: GRADEBOOK  ════════════════════════════════ */}
      {activeTab === "gradebook" && (
        <div className="space-y-6">
          {!selectedCourseId ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <GraduationCap className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">الرجاء اختيار مقرر من القائمة أعلاه</p>
            </div>
          ) : gradebookForCourse.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <GraduationCap className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد درجات مسجلة لهذا المقرر</p>
            </div>
          ) : (
            <>
              {/* Print Button */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-text-secondary">
                  المقرر: <span className="font-medium text-text-primary">
                    {courseOptions.get(selectedCourseId)?.name}
                  </span>
                  {" | "}عدد الطلاب: <span className="font-medium text-text-primary">{gradebookForCourse.length}</span>
                </div>
                <button
                  onClick={() => window.print()}
                  className="no-print flex items-center gap-2 rounded-xl bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
                >
                  <Download className="h-4 w-4" />
                  طباعة الكشف
                </button>
              </div>

              {/* Grade Table */}
              <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm print-area">
                <div className="mb-4 text-center">
                  <h2 className="text-lg font-bold text-text-primary">كشف درجات المقرر</h2>
                  <p className="text-sm text-text-secondary">{courseOptions.get(selectedCourseId)?.name}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="border-b border-border text-text-secondary">
                        <th className="pb-3 pl-4 font-medium">#</th>
                        <th className="pb-3 pl-4 font-medium">الطالب</th>
                        <th className="pb-3 pl-4 font-medium">الرقم</th>
                        <th className="pb-3 pl-4 font-medium">أعمال السنة (30%)</th>
                        <th className="pb-3 pl-4 font-medium">منتصف الفصل (30%)</th>
                        <th className="pb-3 pl-4 font-medium">النهائي (40%)</th>
                        <th className="pb-3 pl-4 font-medium">المجموع</th>
                        <th className="pb-3 font-medium">التقدير</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradebookForCourse.map((g, idx) => {
                        const letterGrade = g.enrollments?.letter_grade || getLetterGrade(g.total_grade);
                        const gradeColor = letterGrade === "A" || letterGrade === "A+" ? "text-success" : letterGrade === "F" ? "text-danger" : "text-text-primary";
                        return (
                          <tr key={g.id} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                            <td className="py-3 pl-4 text-text-secondary">{idx + 1}</td>
                            <td className="py-3 pl-4 font-medium text-text-primary">{g.profiles?.first_name} {g.profiles?.last_name}</td>
                            <td className="py-3 pl-4 text-text-secondary">{g.profiles?.student_profiles?.[0]?.student_number || "—"}</td>
                            <td className="py-3 pl-4 text-text-primary">{g.coursework_grade ?? "—"}</td>
                            <td className="py-3 pl-4 text-text-primary">{g.midterm_grade ?? "—"}</td>
                            <td className="py-3 pl-4 text-text-primary">{g.final_grade ?? "—"}</td>
                            <td className="py-3 pl-4 font-bold text-action-blue">{g.total_grade ?? "—"}</td>
                            <td className="py-3"><span className={`text-lg font-bold ${gradeColor}`}>{letterGrade}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════  TAB: ATTENDANCE MATRIX  ════════════════════════════════ */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {!selectedCourseId ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">الرجاء اختيار مقرر من القائمة أعلاه</p>
            </div>
          ) : sessionsForSelectedCourse.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد جلسات حضور لهذا المقرر</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-text-primary">
                  مصفوفة الحضور
                  <span className="mr-2 text-sm font-normal text-text-secondary">
                    — {courseOptions.get(selectedCourseId)?.name} ({sessionsForSelectedCourse.length} جلسة)
                  </span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-secondary">
                        <th className="sticky right-0 z-10 bg-card-bg pb-3 pl-4 font-medium">الطالب</th>
                        {sessionsForSelectedCourse.map((s: any) => (
                          <th key={s.id} className="min-w-[70px] pb-3 pl-2 text-center font-medium">
                            <div>{new Date(s.session_date).toLocaleDateString("ar-SA", { day: "2-digit", month: "2-digit" })}</div>
                            <div className="text-[10px] text-text-secondary">{s.start_time?.slice(0, 5) || ""}</div>
                          </th>
                        ))}
                        <th className="min-w-[60px] pb-3 pl-2 text-center font-medium">الغياب %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsForAttendanceMatrix.map((student: any) => {
                        const studentSessions = matrix[student.student_id] || {};
                        const summary = attendanceSummaries.find(
                          (s) => s.student_id === student.student_id && s.course_id === selectedCourseId
                        );
                        const absPct = summary?.absence_percentage ?? 0;

                        return (
                          <tr key={student.student_id} className="border-b border-border/30 transition-colors hover:bg-app-bg/30">
                            <td className="sticky right-0 z-10 bg-card-bg py-2 pl-4 font-medium text-text-primary">
                              <div className="whitespace-nowrap">{student.first_name} {student.last_name}</div>
                              <div className="text-[10px] text-text-secondary">{student.student_number}</div>
                            </td>
                            {sessionsForSelectedCourse.map((s: any) => {
                              const status = studentSessions[s.id];
                              let cellClass = "text-text-secondary"; // no record
                              let label = "—";
                              if (status === "present") { cellClass = "text-success"; label = "✓"; }
                              else if (status === "absent") { cellClass = "text-danger font-bold"; label = "✗"; }
                              else if (status === "late") { cellClass = "text-warning"; label = "L"; }
                              else if (status === "excused") { cellClass = "text-purple"; label = "ع"; }
                              return (
                                <td key={s.id} className={`py-2 pl-2 text-center text-sm ${cellClass}`}>
                                  {label}
                                </td>
                              );
                            })}
                            <td className={`py-2 pl-2 text-center text-sm font-bold ${
                              absPct >= 25 ? "text-danger" : absPct > 0 ? "text-warning" : "text-success"
                            }`}>
                              {absPct != null ? `${absPct}%` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 rounded-2xl border border-border bg-card-bg px-5 py-3 shadow-sm">
                <span className="flex items-center gap-1 text-xs text-text-secondary"><span className="text-success font-bold">✓</span> حاضر</span>
                <span className="flex items-center gap-1 text-xs text-text-secondary"><span className="text-danger font-bold">✗</span> غائب</span>
                <span className="flex items-center gap-1 text-xs text-text-secondary"><span className="text-warning">L</span> متأخر</span>
                <span className="flex items-center gap-1 text-xs text-text-secondary"><span className="text-purple">ع</span> معذر</span>
                <span className="flex items-center gap-1 text-xs text-text-secondary"><span className="text-text-secondary">—</span> لم يسجل</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════  TAB: SUBMISSIONS  ════════════════════════════════ */}
      {activeTab === "submissions" && (
        <div className="space-y-6">
          {!selectedCourseId ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">الرجاء اختيار مقرر ثم تكليف من القائمة أعلاه</p>
            </div>
          ) : assignmentsForCourse.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">لا توجد تكاليف لهذا المقرر</p>
            </div>
          ) : !selectedAssignment ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-bg p-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">الرجاء اختيار تكليف</p>
            </div>
          ) : (
            <>
              {/* Assignment Info */}
              <div className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">{selectedAssignment.title}</h2>
                    <p className="text-sm text-text-secondary">
                      الدرجة القصوى: {selectedAssignment.max_grade} |
                      التسليم: {new Date(selectedAssignment.due_date).toLocaleDateString("ar-SA")} |
                      الطلاب المسجلين: {selectedAssignment.enrolled_students.length} |
                      المستلمين: {submissionsForAssignment.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card-bg p-4 text-center shadow-sm">
                  <p className="text-xs text-text-secondary">سلم</p>
                  <p className="text-2xl font-bold text-success">{submissionsForAssignment.filter((s) => s.status !== "graded" && s.status === "submitted" || s.status === "graded").length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg p-4 text-center shadow-sm">
                  <p className="text-xs text-text-secondary">لم يسلم</p>
                  <p className="text-2xl font-bold text-danger">
                    {fullSubmissionList.filter((s) => !s.submitted).length}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg p-4 text-center shadow-sm">
                  <p className="text-xs text-text-secondary">متأخر</p>
                  <p className="text-2xl font-bold text-warning">
                    {submissionsForAssignment.filter((s) => s.is_late).length}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg p-4 text-center shadow-sm">
                  <p className="text-xs text-text-secondary">متوسط الدرجة</p>
                  <p className="text-2xl font-bold text-action-blue">
                    {submissionsForAssignment.length > 0
                      ? (submissionsForAssignment.reduce((s, sub) => s + (sub.grade || 0), 0) / submissionsForAssignment.filter((s) => s.grade != null).length || 0).toFixed(1)
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-text-primary">تفاصيل تسليم التكليف</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="border-b border-border text-text-secondary">
                        <th className="pb-3 pl-4 font-medium">الطالب</th>
                        <th className="pb-3 pl-4 font-medium">الرقم</th>
                        <th className="pb-3 pl-4 font-medium">الحالة</th>
                        <th className="pb-3 pl-4 font-medium">تاريخ التسليم</th>
                        <th className="pb-3 pl-4 font-medium">الدرجة</th>
                        <th className="pb-3 font-medium">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullSubmissionList.map((s) => {
                        let statusBadge = <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">لم يسلم</span>;
                        if (s.submitted) {
                          statusBadge = s.is_late
                            ? <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">متأخر</span>
                            : s.status === "graded"
                              ? <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">تم التصحيح</span>
                              : <span className="rounded-full bg-academic-navy/10 px-2 py-0.5 text-xs font-medium text-academic-navy">تم التسليم</span>;
                        }

                        return (
                          <tr key={s.student_id} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                            <td className="py-3 pl-4 font-medium text-text-primary">{s.first_name} {s.last_name}</td>
                            <td className="py-3 pl-4 text-text-secondary">{s.student_number || "—"}</td>
                            <td className="py-3 pl-4">{statusBadge}</td>
                            <td className="py-3 pl-4 text-text-primary">
                              {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString("ar-SA") : "—"}
                            </td>
                            <td className="py-3 pl-4">
                              {s.grade != null ? (
                                <span className={`font-bold ${s.grade >= (selectedAssignment.max_grade * 0.7) ? "text-success" : "text-danger"}`}>
                                  {s.grade} / {selectedAssignment.max_grade}
                                </span>
                              ) : (
                                <span className="text-text-secondary">—</span>
                              )}
                            </td>
                            <td className="py-3 text-text-secondary text-xs max-w-[200px] truncate">
                              {s.feedback || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
