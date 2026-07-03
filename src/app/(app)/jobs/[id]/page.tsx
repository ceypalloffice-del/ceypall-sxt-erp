import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isDirector } from "@/lib/session";
import { Card, EmptyState, EntityTag, StatusBadge } from "@/components/ui";
import { formatLKR, formatDate } from "@/lib/format";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile();
  const director = isDirector(profile);

  const { data: job } = await supabase
    .from("jobs")
    .select("id, entity_id, job_no, description, status, created_at, customers(name)")
    .eq("id", id)
    .single();

  if (!job) notFound();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_no, issue_date, status")
    .eq("job_id", id)
    .order("issue_date", { ascending: false });

  const { data: costs } = director
    ? await supabase
        .from("job_costs")
        .select("id, cost_type, description, amount, logged_at")
        .eq("job_id", id)
        .order("logged_at", { ascending: false })
    : { data: null };

  const totalCost = (costs ?? []).reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-mono text-xl font-semibold tabular-nums text-slate-900">
            {job.job_no}
          </h1>
          {/* @ts-expect-error -- joined relation shape */}
          <p className="mt-1 text-sm text-slate-500">{job.customers?.name ?? "No customer linked"}</p>
        </div>
        <div className="flex items-center gap-2">
          <EntityTag entityId={job.entity_id} />
          <StatusBadge status={job.status} />
        </div>
      </div>

      {job.description && <Card>{job.description}</Card>}

      <section>
        <h2 className="text-sm font-semibold text-slate-700">Invoices</h2>
        <Card className="mt-3 p-0">
          {(invoices ?? []).length === 0 ? (
            <div className="p-6">
              <EmptyState title="No invoices linked to this job yet" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices!.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-900">{inv.invoice_no}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {director && (
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Job costs</h2>
            <span className="font-mono text-sm tabular-nums text-slate-500">
              Total {formatLKR(totalCost)}
            </span>
          </div>
          <Card className="mt-3 p-0">
            {(costs ?? []).length === 0 ? (
              <div className="p-6">
                <EmptyState title="No costs logged yet" hint="Visible to directors only." />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {costs!.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 capitalize text-slate-800">{c.cost_type}</td>
                      <td className="px-4 py-3 text-slate-500">{c.description ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(c.logged_at)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                        {formatLKR(c.amount)}
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
