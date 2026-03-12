import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import {
  Building2,
  Users,
  HardDrive,
  Cpu,
  CircleDot,
  Ban,
  Trash2,
  CreditCard,
} from "lucide-react";

export default async function SuperAdminDashboard() {
  const { profile } = await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data: tenants } = await supabase.from("tenants").select("id, status, storage_used_gb, max_storage_gb");

  const { data: tokenUsage } = await supabase
    .from("ai_token_usage")
    .select("tenant_id, total_tokens, cost_usd");

  const { data: invoices } = await supabase
    .from("invoices")
    .select("status, amount")
    .order("created_at", { ascending: false })
    .limit(100);

  const tenantList = tenants || [];
  const activeTenants = tenantList.filter((t) => t.status === "active").length;
  const suspendedTenants = tenantList.filter((t) => t.status === "suspended").length;
  const deletedTenants = tenantList.filter((t) => t.status === "deleted").length;
  const totalStorage = tenantList.reduce((sum, t) => sum + (t.storage_used_gb || 0), 0);
  const totalMaxStorage = tenantList.reduce((sum, t) => sum + (t.max_storage_gb || 0), 0);

  const tokenList = tokenUsage || [];
  const totalTokens = tokenList.reduce((sum, t) => sum + (t.total_tokens || 0), 0);
  const totalCost = tokenList.reduce((sum, t) => sum + (t.cost_usd || 0), 0);

  const invoiceList = invoices || [];
  const paidInvoices = invoiceList.filter((i) => i.status === "paid");
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const overdueInvoices = invoiceList.filter((i) => i.status === "overdue").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-text-secondary">
          مرحباً {profile.first_name}، هذه نظرة عامة على حالة المنصة
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الجامعات"
          value={tenantList.length}
          icon={<Building2 className="h-5 w-5" />}
          color="bg-action-blue/10 text-action-blue"
        />
        <StatCard
          title="الجامعات النشطة"
          value={activeTenants}
          icon={<CircleDot className="h-5 w-5" />}
          color="bg-success/10 text-success"
        />
        <StatCard
          title="الجامعات المعلّقة"
          value={suspendedTenants}
          icon={<Ban className="h-5 w-5" />}
          color="bg-warning/10 text-warning"
        />
        <StatCard
          title="الجامعات المحذوفة"
          value={deletedTenants}
          icon={<Trash2 className="h-5 w-5" />}
          color="bg-danger/10 text-danger"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple/10">
              <HardDrive className="h-5 w-5 text-purple" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">استخدام التخزين</p>
              <p className="text-xl font-bold text-text-primary">
                {totalStorage.toFixed(1)} / {totalMaxStorage} GB
              </p>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-app-bg">
            <div
              className="h-full rounded-full bg-purple transition-all"
              style={{
                width: `${totalMaxStorage > 0 ? Math.min((totalStorage / totalMaxStorage) * 100, 100) : 0}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            {totalMaxStorage > 0
              ? ((totalStorage / totalMaxStorage) * 100).toFixed(1)
              : 0}
            % مستخدم
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ai-light to-ai-lavender">
              <Cpu className="h-5 w-5 text-action-blue" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">استهلاك AI Tokens</p>
              <p className="text-xl font-bold text-text-primary">
                {totalTokens.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-action-blue">
              ${totalCost.toFixed(2)}
            </p>
            <span className="text-sm text-text-secondary">إجمالي التكلفة</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <CreditCard className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">الإيرادات المحصّلة</p>
              <p className="text-xl font-bold text-text-primary">
                ${totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
          {overdueInvoices > 0 && (
            <p className="text-sm text-warning">
              {overdueInvoices} فاتورة متأخرة
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="mt-1 text-3xl font-bold text-text-primary">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
