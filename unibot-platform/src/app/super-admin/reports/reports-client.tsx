"use client";

import { KpiCard, ChartCard } from "@/components/analytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Building2,
  Cpu,
  HardDrive,
} from "lucide-react";

interface Overview {
  total_tenants: number;
  active_count: number;
  suspended_count: number;
  deleted_count: number;
  total_storage_used_gb: number;
  total_max_storage_gb: number;
  total_max_users: number;
  avg_absence_limit: number;
}

interface TokenUsage {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  total_tokens: number;
  total_cost_usd: number;
  total_requests: number;
  last_usage_at: string;
}

interface MonthlyGrowth {
  year_month: string;
  new_tenants: number;
  cumulative_tenants: number;
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  max_users: number;
  storage_used_gb: number;
  max_storage_gb: number;
  created_at: string;
  absence_limit_count: number;
  subscription: any;
}

interface ReportsData {
  overview: Overview | null;
  tokenUsage: TokenUsage[];
  monthlyGrowth: MonthlyGrowth[];
  tenants: Tenant[];
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

const PIE_COLORS = [CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.royalBlue];

export function SuperAdminReportsClient({ data }: { data: ReportsData }) {
  const { overview, tokenUsage, monthlyGrowth, tenants } = data;

  // Token usage chart data (top 10)
  const tokenChartData = (tokenUsage || [])
    .filter((t) => t.tenant_status !== "deleted")
    .slice(0, 10)
    .map((t) => ({ name: t.tenant_name, tokens: t.total_tokens }));

  // Tenant status distribution
  const statusDistribution = [
    { name: "نشطة", value: overview?.active_count || 0, color: CHART_COLORS.success },
    { name: "معلقة", value: overview?.suspended_count || 0, color: CHART_COLORS.warning },
    { name: "محذوفة", value: overview?.deleted_count || 0, color: CHART_COLORS.danger },
  ].filter((d) => d.value > 0);

  // Storage summary
  const totalStorageUsed = overview?.total_storage_used_gb || 0;
  const totalMaxStorage = overview?.total_max_storage_gb || 0;
  const storagePct = totalMaxStorage > 0 ? ((totalStorageUsed / totalMaxStorage) * 100).toFixed(1) : "0";

  // Total AI cost
  const totalAiCost = (tokenUsage || []).reduce((s, t) => s + (t.total_cost_usd || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── KPIs (Platform-level only) ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="إجمالي الجامعات"
          value={overview?.total_tenants || 0}
          icon={Building2}
          iconColor="bg-academic-navy/10 text-academic-navy"
          trend={{
            value: `${overview?.active_count || 0} نشطة`,
            direction: overview && (overview.active_count / Math.max(overview.total_tenants, 1)) > 0.5 ? "up" : "neutral",
          }}
        />
        <KpiCard
          title="التخزين المستخدم"
          value={`${totalStorageUsed.toFixed(1)} MB`}
          icon={HardDrive}
          iconColor="bg-teal/10 text-teal"
          trend={{
            value: `${storagePct}%`,
            direction: parseFloat(storagePct) > 80 ? "down" : "up",
            label: "من السعة القصوى",
          }}
        />
        <KpiCard
          title="إجمالي المستخدمين المسموح"
          value={(overview?.total_max_users || 0).toLocaleString()}
          icon={Cpu}
          iconColor="bg-purple/10 text-purple"
          trend={{
            value: `${tenants.length} جامعة`,
            direction: "neutral",
          }}
        />
        <KpiCard
          title="إجمالي تكلفة AI"
          value={`$${totalAiCost.toFixed(2)}`}
          icon={Cpu}
          iconColor="bg-warning/10 text-warning"
          trend={{
            value: `${(tokenUsage || []).filter(t => t.total_tokens > 0).length} جامعات تستخدم AI`,
            direction: "neutral",
          }}
        />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="نمو الجامعات"
          subtitle="عدد الجامعات المسجلة بمرور الوقت"
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="year_month"
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
              <Line
                type="monotone"
                dataKey="cumulative_tenants"
                name="الإجمالي التراكمي"
                stroke={CHART_COLORS.royalBlue}
                strokeWidth={3}
                dot={{ r: 3, fill: CHART_COLORS.royalBlue }}
              />
              <Line
                type="monotone"
                dataKey="new_tenants"
                name="جديدة/شهر"
                stroke={CHART_COLORS.peach}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.peach }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="استهلاك AI Tokens"
          subtitle="أعلى 10 جامعات"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tokenChartData}>
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
              <Bar dataKey="tokens" fill={CHART_COLORS.royalBlue} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts Row 2: فقط حالة الجامعات ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="حالة الجامعات" subtitle="توزيع الجامعات حسب الحالة">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                stroke="var(--color-card-bg)"
                strokeWidth={2}
              >
                {statusDistribution.map((_entry, idx) => (
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

        {/* ملخص سعة التخزين — إجمالي vs مستخدم */}
        <ChartCard title="ملخص التخزين" subtitle="إجمالي التخزين المستخدم مقابل السعة القصوى" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                { name: "المستخدم", value: totalStorageUsed, fill: CHART_COLORS.royalBlue },
                { name: "السعة القصوى", value: totalMaxStorage, fill: CHART_COLORS.peach },
              ]}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} width={90} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card-bg)",
                  borderColor: "var(--color-border)",
                  borderRadius: "12px",
                  color: "var(--color-text-primary)",
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {[{ name: "المستخدم", value: totalStorageUsed, fill: CHART_COLORS.royalBlue },
                  { name: "السعة القصوى", value: totalMaxStorage, fill: CHART_COLORS.peach },
                ].map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Tenants Table ── */}
      <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-text-primary">قائمة الجامعات</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="pb-3 pl-4 font-medium">الاسم</th>
                <th className="pb-3 pl-4 font-medium">الحالة</th>
                <th className="pb-3 pl-4 font-medium">أقصى عدد مستخدمين</th>
                <th className="pb-3 pl-4 font-medium">التخزين</th>
                <th className="pb-3 pl-4 font-medium">حد الغياب</th>
                <th className="pb-3 font-medium">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-border/50 transition-colors hover:bg-app-bg/50">
                  <td className="py-3 pl-4">
                    <p className="font-medium text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-secondary">{t.subdomain}</p>
                  </td>
                  <td className="py-3 pl-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.status === "active"
                          ? "bg-success/10 text-success"
                          : t.status === "suspended"
                          ? "bg-warning/10 text-warning"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {t.status === "active" ? "نشطة" : t.status === "suspended" ? "معلقة" : "محذوفة"}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-text-primary">{t.max_users.toLocaleString()}</td>
                  <td className="py-3 pl-4 text-text-primary">
                    {t.storage_used_gb?.toFixed(1)} / {t.max_storage_gb} MB
                  </td>
                  <td className="py-3 pl-4 text-text-primary">{t.absence_limit_count ?? 5}</td>
                  <td className="py-3 text-text-secondary">
                    {new Date(t.created_at).toLocaleDateString("ar-SA")}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-secondary">
                    لا توجد جامعات مسجلة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
