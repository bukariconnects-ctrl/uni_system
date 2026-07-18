"use client";

import { KpiCard, ChartCard } from "@/components/analytics";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  GraduationCap,
  Users,
  BookOpen,
  HardDrive,
} from "lucide-react";

interface Profile {
  id: string;
  role: string;
  tenant_id: string | null;
}

interface Course {
  id: string;
  code: string;
  name: string;
  department_id: string | null;
  is_active: boolean;
}

interface Department {
  id: string;
  name: string;
  code: string | null;
}

interface Tenant {
  name: string;
  storage_used_gb: number;
  max_storage_gb: number;
  max_users: number;
  status: string;
}

interface DashboardData {
  profiles: Profile[];
  courses: Course[];
  departments: Department[];
  tenant: Tenant | null;
  activeSemester: { name: string; start_date: string; end_date: string } | null;
}

const CHART_COLORS = {
  royalBlue: "#00539C",
  peach: "#EEA47F",
  success: "#38A169",
  purple: "#805AD5",
  teal: "#319795",
  warning: "#EEA47F",
};

export function TenantAdminDashboardClient({ data }: { data: DashboardData }) {
  const { profiles, courses, departments, tenant, activeSemester } = data;

  const studentsCount = profiles.filter((p) => p.role === "student").length;
  const facultyCount = profiles.filter((p) => p.role === "faculty").length;
  const adminCount = profiles.filter(
    (p) => p.role === "tenant_admin" || p.role === "academic_management" || p.role === "super_admin"
  ).length;
  const activeCourseCount = courses.filter((c) => c.is_active).length;

  // User distribution pie
  const userDistribution = [
    { name: "طلاب", value: studentsCount, color: CHART_COLORS.royalBlue },
    { name: "هيئة تدريس", value: facultyCount, color: CHART_COLORS.peach },
    { name: "إداريون", value: adminCount, color: CHART_COLORS.success },
  ].filter((d) => d.value > 0);

  // Courses per department
  const deptCourseCounts: Record<string, number> = {};
  courses.forEach((c) => {
    const deptId = c.department_id;
    if (deptId) {
      deptCourseCounts[deptId] = (deptCourseCounts[deptId] || 0) + 1;
    }
  });

  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
  const coursesPerDept = Object.entries(deptCourseCounts)
    .map(([deptId, count]) => ({
      name: deptMap.get(deptId) || deptId.slice(0, 8),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const storagePct =
    tenant && tenant.max_storage_gb > 0
      ? Math.min((tenant.storage_used_gb / tenant.max_storage_gb) * 100, 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="إجمالي الطلاب"
          value={studentsCount}
          icon={GraduationCap}
          iconColor="bg-academic-navy/10 text-academic-navy"
          trend={{
            value: `${tenant ? ((studentsCount / Math.max(tenant.max_users, 1)) * 100).toFixed(0) : 0}%`,
            direction: "up",
            label: "من السعة",
          }}
        />
        <KpiCard
          title="أعضاء هيئة التدريس"
          value={facultyCount}
          icon={Users}
          iconColor="bg-peach/10 text-action-blue"
          trend={{
            value: `${profiles.length}`,
            direction: "neutral",
            label: "إجمالي المستخدمين",
          }}
        />
        <KpiCard
          title="المواد النشطة"
          value={activeCourseCount}
          icon={BookOpen}
          iconColor="bg-success/10 text-success"
          trend={{
            value: `${courses.length}`,
            direction: "neutral",
            label: "إجمالي المواد",
          }}
        />
        <KpiCard
          title="التخزين المستخدم"
          value={`${tenant?.storage_used_gb.toFixed(1) || 0} GB`}
          icon={HardDrive}
          iconColor="bg-purple/10 text-purple"
          trend={{
            value: `${storagePct.toFixed(1)}%`,
            direction: storagePct > 80 ? "down" : "up",
            label: "من السعة",
          }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="توزيع المستخدمين" subtitle="طلاب، هيئة تدريس، وإداريون">
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
                {userDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
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

        <ChartCard title="المواد حسب القسم" subtitle="Top 10 أقسام">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={coursesPerDept} layout="vertical">
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
                width={100}
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
              <Bar dataKey="count" fill={CHART_COLORS.peach} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tenant Info */}
      {tenant && (
        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-text-primary">معلومات الجامعة</h2>
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-text-secondary">النطاق</p>
              <p className="font-medium text-text-primary" dir="ltr">
                {tenant.name}
              </p>
            </div>
            <div>
              <p className="text-text-secondary">التخزين</p>
              <p className="font-medium text-text-primary">
                {tenant.storage_used_gb} / {tenant.max_storage_gb} GB ({storagePct.toFixed(1)}%)
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-app-bg">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-academic-navy to-action-blue transition-all"
                  style={{ width: `${storagePct}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-text-secondary">المستخدمين</p>
              <p className="font-medium text-text-primary">
                {profiles.length} / {tenant.max_users}
              </p>
            </div>
            <div>
              <p className="text-text-secondary">الحالة</p>
              <span className="inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                {tenant.status === "active" ? "نشطة" : tenant.status}
              </span>
            </div>
            <div>
              <p className="text-text-secondary">الفصل الحالي</p>
              <p className="font-medium text-text-primary">
                {activeSemester?.name || "لا يوجد فصل نشط"}
              </p>
            </div>
            <div>
              <p className="text-text-secondary">المواد النشطة</p>
              <p className="font-medium text-text-primary">{activeCourseCount}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
