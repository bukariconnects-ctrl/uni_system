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
} from "recharts";
import {
  Building2,
  CircleDot,
  Cpu,
  HardDrive,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  status: string;
  storage_used_gb: number;
  max_storage_gb: number;
  created_at: string;
}

interface TokenUsage {
  tenant_id: string;
  total_tokens: number;
  cost_usd: number;
  tenant_name?: string;
}

interface Invoice {
  status: string;
  amount: number;
  created_at: string;
}

interface DashboardData {
  tenants: Tenant[];
  tokenUsage: TokenUsage[];
  invoices: Invoice[];
}

const CHART_COLORS = {
  royalBlue: "#00539C",
  peach: "#EEA47F",
  success: "#38A169",
  danger: "#E53E3E",
  purple: "#805AD5",
  teal: "#319795",
};

export function SuperAdminDashboardClient({ data }: { data: DashboardData }) {
  const { tenants, tokenUsage, invoices } = data;

  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const totalStorage = tenants.reduce((sum, t) => sum + (t.storage_used_gb || 0), 0);
  const totalTokens = tokenUsage.reduce((sum, t) => sum + (t.total_tokens || 0), 0);
  const totalCost = tokenUsage.reduce((sum, t) => sum + (t.cost_usd || 0), 0);

  // Token usage by tenant
  const tokenByTenant = tokenUsage
    .reduce((acc, t) => {
      const name = t.tenant_name || t.tenant_id.slice(0, 8);
      const existing = acc.find((x) => x.name === name);
      if (existing) {
        existing.tokens += t.total_tokens || 0;
      } else {
        acc.push({ name, tokens: t.total_tokens || 0 });
      }
      return acc;
    }, [] as { name: string; tokens: number }[])
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 8);

  // Tenant growth over time (group by month)
  const monthMap = new Map<string, number>();
  tenants.forEach((t) => {
    const d = new Date(t.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  });
  const tenantGrowth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => {
      const [y, m] = month.split("-");
      return {
        month: `${m}/${y.slice(2)}`,
        count,
        cumulative: 0,
      };
    });

  // Calculate cumulative
  let cum = 0;
  tenantGrowth.forEach((g) => {
    cum += g.count;
    g.cumulative = cum;
  });

  // Invoice stats
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const overdueInvoices = invoices.filter((i) => i.status === "overdue").length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="إجمالي الجامعات"
          value={tenants.length}
          icon={Building2}
          iconColor="bg-academic-navy/10 text-academic-navy"
          trend={{ value: `${activeTenants} نشطة`, direction: "up" }}
        />
        <KpiCard
          title="الجامعات النشطة"
          value={activeTenants}
          icon={CircleDot}
          iconColor="bg-success/10 text-success"
          trend={{
            value: `${((activeTenants / Math.max(tenants.length, 1)) * 100).toFixed(0)}%`,
            direction: "up",
            label: "من الإجمالي",
          }}
        />
        <KpiCard
          title="استهلاك AI Tokens"
          value={totalTokens.toLocaleString()}
          icon={Cpu}
          iconColor="bg-purple/10 text-purple"
          trend={{
            value: `$${totalCost.toFixed(2)}`,
            direction: "neutral",
            label: "إجمالي التكلفة",
          }}
        />
        <KpiCard
          title="إجمالي التخزين"
          value={`${totalStorage.toFixed(1)} GB`}
          icon={HardDrive}
          iconColor="bg-teal/10 text-teal"
          trend={{
            value: `${tenants.reduce((s, t) => s + (t.max_storage_gb || 0), 0)} GB`,
            direction: "neutral",
            label: "السعة القصوى",
          }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="استهلاك AI Tokens حسب الجامعة"
          subtitle="Top 8 جامعات من حيث استهلاك Tokens"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tokenByTenant}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
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

        <ChartCard
          title="نمو الجامعات"
          subtitle="عدد الجامعات المسجلة بمرور الوقت"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tenantGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
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
                dataKey="cumulative"
                name="إجمالي الجامعات"
                stroke={CHART_COLORS.peach}
                strokeWidth={3}
                dot={{ r: 4, fill: CHART_COLORS.peach }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="جديدة/شهر"
                stroke={CHART_COLORS.royalBlue}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.royalBlue }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Revenue & Storage Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ChartCard title="الإيرادات المحصّلة" subtitle="إجمالي الفواتير المدفوعة">
          <div className="flex h-[180px] flex-col items-center justify-center">
            <p className="text-4xl font-bold text-success">${totalRevenue.toFixed(2)}</p>
            <p className="mt-2 text-sm text-text-secondary">
              {paidInvoices.length} فاتورة مدفوعة
            </p>
            {overdueInvoices > 0 && (
              <p className="mt-1 text-xs text-danger">
                {overdueInvoices} فاتورة متأخرة
              </p>
            )}
          </div>
        </ChartCard>

        <ChartCard title="توزيع حالات الجامعات" className="lg:col-span-2">
          <div className="grid h-[180px] grid-cols-3 gap-4">
            {[
              {
                label: "نشطة",
                value: tenants.filter((t) => t.status === "active").length,
                color: "bg-success",
                text: "text-success",
              },
              {
                label: "معلّقة",
                value: tenants.filter((t) => t.status === "suspended").length,
                color: "bg-warning",
                text: "text-warning",
              },
              {
                label: "محذوفة",
                value: tenants.filter((t) => t.status === "deleted").length,
                color: "bg-danger",
                text: "text-danger",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center rounded-xl border border-border bg-app-bg/50 p-4"
              >
                <div className={`mb-2 h-3 w-3 rounded-full ${s.color}`} />
                <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                <p className={`text-xs font-medium ${s.text}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
