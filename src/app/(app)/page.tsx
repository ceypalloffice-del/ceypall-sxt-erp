import { createClient } from "@/lib/supabase/server";
import { getProfile, getActiveEntity, isDirector } from "@/lib/session";
import { ENTITIES } from "@/lib/entities";
import { Card, EmptyState, StatusBadge, AgeingDot, EntityTag } from "@/components/ui";
import { formatLKR, formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const entity = await getActiveEntity(profile);
  const director = isDirector(profile);

  let ageing = supabase.from("ar_ageing").select("*").order("balance", { ascending: false });
  let jobs = supabase.from("jobs").select("id, job_no, status").neq("status", "closed");
  let invoices = supabase
    .from("invoices")
    .select("id, invoice_no, issue_date, status, customers(name)")
    .order("issue_date", { ascending: false })
    .limit(5);
  let jobPnl = director
    ? supabase.from("job_pnl").select("*").order("profit", { ascending: false }).limit(5)
    : null;
  let lowStock = supabase
    .from("inventory_with_stock")
    .select("id, name, unit, qty_on_hand, min_qty, stock_status, entity_id")
    .in("stock_status", ["low", "out_of_stock"])
    .order("qty_on_hand");

  if (entity !== "ALL") {
    ageing = ageing.eq("entity_id", entity);
    jobs = jobs.eq("entity_id", entity);
    invoices = invoices.eq("entity_id", entity);
    jobPnl = jobPnl?.eq("entity_id", entity) ?? null;
    lowStock = lowStock.eq("entity_id", entity);
  }

  const [ageingRes, jobsRes, invoicesRes, jobPnlRes, lowStockRes] = await Promise.all([
    ageing,
    jobs,
    invoices,
    jobPnl ?? Promise.resolve({ data: null }),
    lowStock,
  ]);

  const ageingRows = ageingRes.data ?? [];
  const totalReceivable = ageingRows.reduce((sum, r) => sum + Number(r.balance), 0);
  const openJobsCount = jobsRes.data?.length ?? 0;
  const recentInvoices = invoicesRes.data ?? [];
  const topJobs = jobPnlRes.data ?? [];
  const lowStockRows = lowStockRes.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {ENTITIES[entity].label} dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">Overview across receivables, jobs, and sales.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Outstanding receivable</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {formatLKR(totalReceivable)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Open jobs</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {openJobsCount}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Customers overdue</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {ageingRows.filter((r) => r.bucket !== "green").length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Low / out of stock</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {lowStockRows.length}
          </p>
        </Card>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-700">AR ageing</h2>
        <Card className="mt-3 p-0">
          {ageingRows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No outstanding receivables" hint="Invoices will appear here once issued." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Days overdue</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ageingRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-800">
                      <span className="mr-2 inline-flex"><AgeingDot bucket={row.bucket} /></span>
                      {row.name}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                      {row.days_overdue ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatLKR(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700">Recent invoices</h2>
        <Card className="mt-3 p-0">
          {recentInvoices.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No invoices yet" hint="Invoices will show up here as soon as one is created." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-900">{inv.invoice_no}</td>
                    {/* @ts-expect-error -- joined relation shape */}
                    <td className="px-4 py-3 text-slate-700">{inv.customers?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700">Low stock</h2>
        <Card className="mt-3 p-0">
          {lowStockRows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="All stock above minimum" hint="Items at or below their minimum quantity appear here." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Item</th>
                  {entity === "ALL" && <th className="px-4 py-3 font-medium">Entity</th>}
                  <th className="px-4 py-3 text-right font-medium">On hand</th>
                  <th className="px-4 py-3 text-right font-medium">Min</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockRows.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-800">{s.name}</td>
                    {entity === "ALL" && (
                      <td className="px-4 py-3"><EntityTag entityId={s.entity_id} /></td>
                    )}
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {Number(s.qty_on_hand)} {s.unit ?? ""}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-400">{s.min_qty}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.stock_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {director && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700">Top jobs by profit</h2>
          <Card className="mt-3 p-0">
            {topJobs.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No job costing yet" hint="Visible to directors once jobs have revenue and cost." />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="px-4 py-3 font-medium">Job</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium">Cost</th>
                    <th className="px-4 py-3 text-right font-medium">Profit</th>
                    <th className="px-4 py-3 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {topJobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-900">{job.job_no}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                        {formatLKR(job.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                        {formatLKR(job.cost)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                        {formatLKR(job.profit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500">
                        {job.margin_pct != null ? `${job.margin_pct}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
