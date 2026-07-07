"use client";

import { useState } from "react";
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
  GraduationCap,
  Users,
  BookOpen,
  Building2,
  AlertTriangle,
  ClipboardCheck,
  HardDrive,
  UserCheck,
  MapPin,
} from "lucide-react";

interface UserStats {
  total_users: number;
  student_count: number;
  faculty_count: number;
  admin_count: number;
  academic_management_count: number;
  active_users: number;
  active_students: number;
  active_faculty: number;
}

interface CollegeStats {
  college_id: string;
  college_name: string;
  college_code: string;
  absence_limit_count: number;
  department_count: number;
  major_count: number;
  course_count: number;
  total_students: number;
  faculty_count: number;
}

interface CourseOverview {
  course_id: string;
  course_code: string;
  course_name: string;
  is_active: boolean;
  credit_hours: number;
  department_name: string;
  enrolled_students: number;
  total_sessions: number;
  total_assignments: number;
  dismissed_count: number;
}

interface AttendanceSummary {
  course_id: string;
  course_code: string;
  course_name: string;
  total_sessions: number;
  total_students: number;
  total_records: number;
  present_count: number;
  absent_count: number;
  excused_count: number;
  late_count: number;
  absence_percentage: number;
  dismissed_count: number;
}

interface Tenant {
  name: string;
  storage_used_gb: number;
  max_storage_gb: number;
  max_users: number;
  absence_limit_count: number;
  status: string;
}

interface VenueUtilization {
  id: string;
  name: string;
  code: string;
  building: string;
  floor: string;
  venue_type: string;
  capacity: number;
  has_projector: boolean;
  has_ac: boolean;
  hours_booked: number;
  utilization_pct: number;
}

interface ReportsData {
  userStats: UserStats | null;
  collegeStats: CollegeStats[];
  courseOverview: CourseOverview[];
  attendanceSummary: AttendanceSummary[];
  tenant: Tenant | null;
  venueUtilization: VenueUtilization[];
  activeSemester: { name: string; academic_year: string } | null;
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

const PIE_COLORS = [CHART_COLORS.royalBlue, CHART_COLORS.peach, CHART_COLORS.success, CHART_COLORS.purple];

const TABS = [
  { key: "main", label: "الرئيسية", icon: GraduationCap },
  { key: "venues", label: "القاعات", icon: MapPin },
];

export function TenantAdminReportsClient({ data }: { data: ReportsData }) {
  const { userStats, collegeStats, courseOverview, attendanceSummary, tenant, venueUtilization, activeSemester } = data;
  const [activeTab, setActiveTab] = useState("main");

  // Totals
  const totalStudents = userStats?.student_count || 0;
  const totalFaculty = userStats?.faculty_count || 0;
  const totalUsers = userStats?.total_users || 0;
  const totalCourses = courseOverview.length;
  const totalDismissed = attendanceSummary.reduce((s, c) => s + (c.dismissed_count || 0), 0);
  const avgAbsence = attendanceSummary.length > 0
    ? (attendanceSummary.reduce((s, c) => s + (c.absence_percentage || 0), 0) / attendanceSummary.length).toFixed(1)
    : "0";

  const activeCourseCount = courseOverview.filter((c) => c.is_active).length;

  // Storage
  const storagePct = tenant && tenant.max_storage_gb > 0
    ? Math.min((tenant.storage_used_gb / tenant.max_storage_gb) * 100, 100)
    : 0;

  // User distribution pie
  const userDistribution = [
    { name: "طلاب", value: userStats?.active_students || totalStudents, color: CHART_COLORS.royalBlue },
    { name: "هيئة تدريس", value: userStats?.active_faculty || totalFaculty, color: CHART_COLORS.peach },
    { name: "إداريون", value: (userStats?.admin_count || 0) + (userStats?.academic_management_count || 0), color: CHART_COLORS.success },
  ].filter((d) => d.value > 0);

  // College distribution for students
  const collegeChartData = collegeStats
    .filter((c) => c.total_students > 0)
    .map((c) => ({ name: c.college_name, students: c.total_students, faculty: c.faculty_count }));

  // Attendance by course
  const attendanceCourseData = attendanceSummary
    .filter((c) => c.total_students > 0)
    .sort((a, b) => b.absent_count - a.absent_count)
    .slice(0, 10)
    .map((c) => ({
      name: c.course_name,
      حاضر: c.present_count,
      غائب: c.absent_count,
      متأخر: c.late_count,
    }));

  // Dismissed students by course
  const dismissedData = courseOverview
    .filter((c) => c.dismissed_count > 0)
    .sort((a, b) => b.dismissed_count - a.dismissed_count)
    .slice(0, 10)
    .map((c) => ({ name: c.course_name, محرومون: c.dismissed_count }));

  // Venue chart data
  const venueChartData = [...venueUtilization]
    .sort((a, b) => b.utilization_pct - a.utilization_pct)
    .slice(0, 15)
    .map((v) => ({
      name: v.name,
      utilization: v.utilization_pct,
      hours: v.hours_booked,
    }));

  return (
    <div className="space-y-6">
      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-2xl border border-border bg-card-bg p-1.5 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
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

      {/* ══════════════════════════  TAB: MAIN  ══════════════════════════ */}
      {activeTab === "main" && (
        <div className="space-y-6">
          {/* ── KPIs ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="إجمالي الطلاب"
              value={totalStudents}
              icon={GraduationCap}
              iconColor="bg-academic-navy/10 text-academic-navy"
              trend={{
                value: `${activeCourseCount} مادة نشطة`,
                direction: "neutral",
                label: `${totalStudents} طالب`,
              }}
            />
            <KpiCard
              title="أعضاء هيئة التدريس"
              value={totalFaculty}
              icon={Users}
              iconColor="bg-peach/10 text-action-blue"
              trend={{
                value: `${collegeStats.length} كلية`,
                direction: "neutral",
              }}
            />
            <KpiCard
              title="المقررات"
              value={totalCourses}
              icon={BookOpen}
              iconColor="bg-success/10 text-success"
              trend={{
                value: `${activeCourseCount} نشط`,
                direction: activeCourseCount > 0 ? "up" : "neutral",
              }}
            />
            <KpiCard
              title="المحرومون"
              value={totalDismissed}
              icon={AlertTriangle}
              iconColor="bg-danger/10 text-danger"
              trend={{
                value: `${avgAbsence}%`,
                direction: parseInt(avgAbsence) > 20 ? "down" : "up",
                label: "متوسط الغياب",
              }}
            />
          </div>

          {/* ── Charts Row 1 ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="توزيع المستخدمين" subtitle="حسب الدور">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={userDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="var(--color-card-bg)"
                    strokeWidth={2}
                  >
                    {userDistribution.map((_entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card-bg)",
                      borderColor: "var(--color-border)",
                      borderRadius: "12px",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ color: "var(--color-text-secondary)", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="الطلاب حسب الكلية" subtitle="توزيع الطلاب على الكليات">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={collegeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    type="number"
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card-bg)",
                      borderColor: "var(--color-border)",
                      borderRadius: "12px",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  <Bar dataKey="students" name="الطلاب" fill={CHART_COLORS.royalBlue} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Charts Row 2 ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="حالة الحضور حسب المقرر" subtitle="أعلى 10 مقررات من حيث الغياب">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={attendanceCourseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card-bg)",
                      borderColor: "var(--color-border)",
                      borderRadius: "12px",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="حاضر" fill={CHART_COLORS.success} stackId="a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="غائب" fill={CHART_COLORS.danger} stackId="a" />
                  <Bar dataKey="متأخر" fill={CHART_COLORS.warning} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="الطلاب المحرومون" subtitle="حسب المقرر">
              {dismissedData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dismissedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-border)" }}
                    />
                    <YAxis
                      tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-border)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card-bg)",
                        borderColor: "var(--color-border)",
                        borderRadius: "12px",
                        color: "var(--color-text-primary)",
                      }}
                    />
                    <Bar dataKey="محرومون" fill={CHART_COLORS.danger} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center">
                  <p className="text-text-secondary">لا يوجد طلاب محرومون</p>
                </div>
              )}
            </ChartCard>
          </div>

          {/* ── College Stats Table ── */}
          <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-text-primary">إحصائيات الكليات</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="pb-3 pl-4 font-medium">الكلية</th>
                    <th className="pb-3 pl-4 font-medium">الأقسام</th>
                    <th className="pb-3 pl-4 font-medium">التخصصات</th>
                    <th className="pb-3 pl-4 font-medium">المقررات</th>
                    <th className="pb-3 pl-4 font-medium">الطلاب</th>
                    <th className="pb-3 pl-4 font-medium">أعضاء التدريس</th>
                    <th className="pb-3 font-medium">حد الغياب</th>
                  </tr>
                </thead>
                <tbody>
                  {collegeStats.map((c) => (
                    <tr key={c.college_id} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                      <td className="py-3 pl-4 font-medium text-text-primary">{c.college_name}</td>
                      <td className="py-3 pl-4 text-text-primary">{c.department_count}</td>
                      <td className="py-3 pl-4 text-text-primary">{c.major_count}</td>
                      <td className="py-3 pl-4 text-text-primary">{c.course_count}</td>
                      <td className="py-3 pl-4 text-text-primary">{c.total_students}</td>
                      <td className="py-3 pl-4 text-text-primary">{c.faculty_count}</td>
                      <td className="py-3 text-text-primary">{c.absence_limit_count ?? "—"}</td>
                    </tr>
                  ))}
                  {collegeStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-secondary">
                        لا توجد كليات مسجلة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Quick Stats ── */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              title="إجمالي المستخدمين"
              value={totalUsers}
              icon={Users}
              iconColor="bg-academic-navy/10 text-academic-navy"
              trend={{
                value: `${tenant?.max_users || 0}`,
                direction: totalUsers < (tenant?.max_users || 0) ? "up" : "down",
                label: "السعة القصوى",
              }}
            />
            <KpiCard
              title="التخزين المستخدم"
              value={`${tenant?.storage_used_gb?.toFixed(1) || 0} MB`}
              icon={HardDrive}
              iconColor="bg-teal/10 text-teal"
              trend={{
                value: `${storagePct.toFixed(1)}%`,
                direction: storagePct > 80 ? "down" : "up",
                label: "من السعة",
              }}
            />
            <KpiCard
              title="حد الغياب"
              value={tenant?.absence_limit_count || 5}
              icon={UserCheck}
              iconColor="bg-success/10 text-success"
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════  TAB: VENUES  ══════════════════════════ */}
      {activeTab === "venues" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="إجمالي القاعات"
              value={venueUtilization.length}
              icon={MapPin}
              iconColor="bg-academic-navy/10 text-academic-navy"
              trend={{
                value: `${venueUtilization.filter((v) => v.utilization_pct > 0).length} قاعة نشطة`,
                direction: "neutral",
              }}
            />
            <KpiCard
              title="القاعات المستخدمة"
              value={venueUtilization.filter((v) => v.hours_booked > 0).length}
              icon={Building2}
              iconColor="bg-success/10 text-success"
            />
            <KpiCard
              title="متوسط الاستخدام"
              value={
                venueUtilization.length > 0
                  ? `${(venueUtilization.reduce((s, v) => s + v.utilization_pct, 0) / venueUtilization.length).toFixed(1)}%`
                  : "0%"
              }
              icon={ClipboardCheck}
              iconColor="bg-purple/10 text-purple"
            />
            <KpiCard
              title="إجمالي الساعات المحجوزة"
              value={`${venueUtilization.reduce((s, v) => s + v.hours_booked, 0).toFixed(0)} ساعة`}
              icon={BookOpen}
              iconColor="bg-peach/10 text-action-blue"
            />
          </div>

          {/* Semester info */}
          {activeSemester && (
            <div className="rounded-2xl border border-border bg-card-bg p-4 text-center shadow-sm">
              <p className="text-sm text-text-secondary">
                الفصل الحالي: <span className="font-medium text-text-primary">{activeSemester.name} ({activeSemester.academic_year})</span>
                {" — "}الطاقة الاستيعابية الأسبوعية: <span className="font-medium text-text-primary">60 ساعة</span> (5 أيام × 12 ساعة)
              </p>
            </div>
          )}

          {/* Utilization Chart */}
          {venueChartData.length > 0 && (
            <ChartCard title="نسبة استغلال القاعات" subtitle="أعلى 15 قاعة">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={venueChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, "نسبة الاستخدام"]}
                    contentStyle={{
                      backgroundColor: "var(--color-card-bg)",
                      borderColor: "var(--color-border)",
                      borderRadius: "12px",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  <Bar
                    dataKey="utilization"
                    name="نسبة الاستخدام"
                    radius={[0, 6, 6, 0]}
                  >
                    {venueChartData.map((entry, idx) => {
                      let fill = CHART_COLORS.success;
                      if (entry.utilization > 75) fill = CHART_COLORS.danger;
                      else if (entry.utilization > 50) fill = CHART_COLORS.warning;
                      return <Cell key={`cell-${idx}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Venues Table */}
          <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-text-primary">تفاصيل القاعات</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="pb-3 pl-4 font-medium">القاعة</th>
                    <th className="pb-3 pl-4 font-medium">الكود</th>
                    <th className="pb-3 pl-4 font-medium">المبنى</th>
                    <th className="pb-3 pl-4 font-medium">الطابق</th>
                    <th className="pb-3 pl-4 font-medium">النوع</th>
                    <th className="pb-3 pl-4 font-medium">السعة</th>
                    <th className="pb-3 pl-4 font-medium">ساعات/أسبوع</th>
                    <th className="pb-3 font-medium">الاستخدام %</th>
                  </tr>
                </thead>
                <tbody>
                  {venueUtilization.map((v) => {
                    const pctColor =
                      v.utilization_pct > 75
                        ? "text-danger"
                        : v.utilization_pct > 50
                          ? "text-warning"
                          : "text-success";

                    return (
                      <tr key={v.id} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                        <td className="py-3 pl-4 font-medium text-text-primary">{v.name}</td>
                        <td className="py-3 pl-4 text-text-secondary">{v.code}</td>
                        <td className="py-3 pl-4 text-text-primary">{v.building}</td>
                        <td className="py-3 pl-4 text-text-primary">{v.floor}</td>
                        <td className="py-3 pl-4">
                          <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs text-text-secondary">
                            {v.venue_type === "lecture_hall" ? "قاعة محاضرات"
                              : v.venue_type === "lab" ? "مختبر"
                                : v.venue_type === "auditorium" ? "مدرج"
                                  : "أخرى"}
                          </span>
                        </td>
                        <td className="py-3 pl-4 text-text-primary">{v.capacity}</td>
                        <td className="py-3 pl-4 text-text-primary">{v.hours_booked}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-border">
                              <div
                                className={`h-full rounded-full ${
                                  v.utilization_pct > 75
                                    ? "bg-danger"
                                    : v.utilization_pct > 50
                                      ? "bg-warning"
                                      : "bg-success"
                                }`}
                                style={{ width: `${Math.min(v.utilization_pct, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${pctColor}`}>
                              {v.utilization_pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {venueUtilization.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-text-secondary">
                        لا توجد قاعات مسجلة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
