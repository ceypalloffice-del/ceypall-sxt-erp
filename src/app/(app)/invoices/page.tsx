import { createClient } from "@/lib/supabase/server";
import { getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState, EntityTag, StatusBadge } from "@/components/ui";
import { formatLKR, formatDate } from "@/lib/format";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const entity = await getActiveEntity(profile);

  let invoices = supabase
    .from("invoices")
    .select("id, entity_id, invoice_no, issue_date, due_date, status, customers(name), invoice_lines(line_total)")
    .order("issue_date", { ascending: false });

  if (entity !== "ALL") invoices = invoices.eq("entity_id", entity);

  const { data } = await invoices;
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">Sales invoices and their payment status.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No invoices yet" hint="Invoices will appear here once created." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => {
                const total = (inv.invoice_lines ?? []).reduce(
                  (sum: number, l: { line_total: number }) => sum + Number(l.line_total),
                  0
                );
                return (
                  <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-900">{inv.invoice_no}</td>
                    <td className="px-4 py-3"><EntityTag entityId={inv.entity_id} /></td>
                    {/* @ts-expect-error -- joined relation shape */}
                    <td className="px-4 py-3 text-slate-700">{inv.customers?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatLKR(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
