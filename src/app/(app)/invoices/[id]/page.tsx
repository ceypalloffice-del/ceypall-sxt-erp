import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, StatusBadge, EntityTag } from "@/components/ui";
import { formatLKR, formatDate } from "@/lib/format";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: inv } = await supabase
    .from("invoices")
    .select(`
      *,
      customers(name, phone, email),
      invoice_lines(id, description, qty, unit_price, line_total, products(name))
    `)
    .eq("id", id)
    .single();

  if (!inv) notFound();

  const lines = (inv.invoice_lines ?? []) as Array<{
    id: string;
    description: string | null;
    qty: number;
    unit_price: number;
    line_total: number;
    products: { name: string } | null;
  }>;

  const subtotal = lines.reduce((s, l) => s + Number(l.line_total), 0);
  const vatRate = Number((inv as Record<string, unknown>).vat_rate ?? 18);
  const vatAmount = Math.round(subtotal * vatRate / 100);
  const total = subtotal + vatAmount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/invoices" className="text-sm text-slate-400 hover:text-slate-600">← Invoices</Link>
          </div>
          <h1 className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">{inv.invoice_no}</h1>
        </div>
        <Link
          href={`/invoices/${id}/print`}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Print / PDF
        </Link>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">Entity</p>
          <div className="mt-1">
            {/* @ts-expect-error -- entityId type */}
            <EntityTag entityId={inv.entity_id} />
          </div>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Status</p>
          <div className="mt-1"><StatusBadge status={inv.status} /></div>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Issue Date</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(inv.issue_date)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Due Date</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(inv.due_date)}</p>
        </Card>
      </div>

      {/* Customer + refs */}
      <Card>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Customer</p>
            {/* @ts-expect-error -- joined relation */}
            <p className="mt-0.5 font-medium text-slate-900">{inv.customers?.name ?? "—"}</p>
          </div>
          {(inv as Record<string, unknown>).delivery_no && (
            <div>
              <p className="text-xs text-slate-500">Delivery Note</p>
              <p className="mt-0.5 font-mono tabular-nums text-slate-900">{String((inv as Record<string, unknown>).delivery_no)}</p>
            </div>
          )}
          {(inv as Record<string, unknown>).po_ref && (
            <div>
              <p className="text-xs text-slate-500">PO Reference</p>
              <p className="mt-0.5 font-mono tabular-nums text-slate-900">{String((inv as Record<string, unknown>).po_ref)}</p>
            </div>
          )}
          {(inv as Record<string, unknown>).purchaser_tin && (
            <div>
              <p className="text-xs text-slate-500">Purchaser TIN</p>
              <p className="mt-0.5 font-mono tabular-nums text-slate-900">{String((inv as Record<string, unknown>).purchaser_tin)}</p>
            </div>
          )}
          {(inv as Record<string, unknown>).vat_rate && (
            <div>
              <p className="text-xs text-slate-500">VAT Rate</p>
              <p className="mt-0.5 font-medium text-slate-900">{String((inv as Record<string, unknown>).vat_rate)}%</p>
            </div>
          )}
        </div>
      </Card>

      {/* Line items */}
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Unit Price</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">No line items</td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-700">{l.description ?? l.products?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">{Number(l.qty).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">{formatLKR(Number(l.unit_price))}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">{formatLKR(Number(l.line_total))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-slate-200 px-4 py-4">
          <div className="ml-auto w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-mono tabular-nums text-slate-900">{formatLKR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">VAT ({vatRate}%)</span>
              <span className="font-mono tabular-nums text-slate-900">{formatLKR(vatAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
              <span className="text-slate-900">Total</span>
              <span className="font-mono tabular-nums text-slate-900">{formatLKR(total)}</span>
            </div>
          </div>
        </div>
      </Card>

      {inv.notes && (
        <Card>
          <p className="text-xs text-slate-500">Notes</p>
          <p className="mt-1 text-sm text-slate-700">{inv.notes}</p>
        </Card>
      )}
    </div>
  );
}
