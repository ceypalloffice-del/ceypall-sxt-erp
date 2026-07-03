import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatLKR, formatDate } from "@/lib/format";
import { PrintButton } from "./PrintButton";

const ENTITY_DETAILS: Record<string, { fullName: string; tin: string }> = {
  CPL: { fullName: "CEYPALL (PVT) LTD", tin: "241642461" },
  SXT: { fullName: "ST. XAVIER TIMBER (PVT) LTD", tin: "—" },
};

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: inv } = await supabase
    .from("invoices")
    .select(`
      *,
      customers(name, phone, email),
      entities(name, address, phone, email),
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

  const entityDet = ENTITY_DETAILS[inv.entity_id as string] ?? {
    fullName: (inv as Record<string, unknown> & { entities?: { name?: string } }).entities?.name ?? "",
    tin: "—",
  };

  const entity = (inv as Record<string, unknown> & {
    entities?: { address?: string; phone?: string; email?: string };
  }).entities;

  const customer = (inv as Record<string, unknown> & {
    customers?: { name?: string; phone?: string; email?: string };
  }).customers;

  const invExtra = inv as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-white">
      {/* Controls — hidden when printing */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-8 py-3 print:hidden">
        <Link href={`/invoices/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to Invoice
        </Link>
        <PrintButton />
      </div>

      {/* Invoice body */}
      <div className="mx-auto max-w-3xl px-10 py-10 text-slate-900">

        {/* Company header + invoice meta */}
        <div className="flex items-start justify-between gap-8">
          <div>
            <h1 className="text-xl font-extrabold tracking-wide">{entityDet.fullName}</h1>
            {entity?.address && (
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{entity.address}</p>
            )}
            <p className="mt-1 text-sm text-slate-600">
              TIN: <span className="font-mono">{entityDet.tin}</span>
            </p>
            {entity?.phone && <p className="text-sm text-slate-600">Tel: {entity.phone}</p>}
            {entity?.email && <p className="text-sm text-slate-600">Email: {entity.email}</p>}
          </div>

          <div className="shrink-0 text-right">
            <h2 className="text-lg font-extrabold tracking-widest text-slate-800">TAX INVOICE</h2>
            <table className="mt-3 text-sm">
              <tbody>
                <tr>
                  <td className="pr-6 text-left text-slate-500">Invoice No</td>
                  <td className="font-mono font-semibold tabular-nums">{inv.invoice_no}</td>
                </tr>
                <tr>
                  <td className="pr-6 text-left text-slate-500">Date</td>
                  <td>{formatDate(inv.issue_date)}</td>
                </tr>
                {inv.due_date && (
                  <tr>
                    <td className="pr-6 text-left text-slate-500">Due Date</td>
                    <td>{formatDate(inv.due_date)}</td>
                  </tr>
                )}
                {invExtra.delivery_no && (
                  <tr>
                    <td className="pr-6 text-left text-slate-500">Delivery Note</td>
                    <td className="font-mono tabular-nums">{String(invExtra.delivery_no)}</td>
                  </tr>
                )}
                {invExtra.po_ref && (
                  <tr>
                    <td className="pr-6 text-left text-slate-500">PO Reference</td>
                    <td className="font-mono tabular-nums">{String(invExtra.po_ref)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rule */}
        <div className="my-6 border-t-2 border-slate-800" />

        {/* Bill To */}
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bill To</p>
          <p className="mt-1 text-base font-semibold">{customer?.name ?? "—"}</p>
          {invExtra.purchaser_tin && (
            <p className="text-sm text-slate-600">
              TIN: <span className="font-mono">{String(invExtra.purchaser_tin)}</span>
            </p>
          )}
          {customer?.phone && <p className="text-sm text-slate-600">Tel: {customer.phone}</p>}
          {customer?.email && <p className="text-sm text-slate-600">Email: {customer.email}</p>}
        </div>

        {/* Line items */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">No.</th>
              <th className="py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Description</th>
              <th className="py-2 pl-4 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Qty</th>
              <th className="py-2 pl-4 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Unit Price</th>
              <th className="py-2 pl-4 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.id} className="border-b border-slate-200">
                <td className="py-2.5 pr-3 text-slate-500">{i + 1}</td>
                <td className="py-2.5">{l.description ?? l.products?.name ?? "—"}</td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-slate-700">
                  {Number(l.qty).toLocaleString()}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-slate-700">
                  {formatLKR(Number(l.unit_price))}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums">
                  {formatLKR(Number(l.line_total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-mono tabular-nums">{formatLKR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">VAT ({vatRate}%)</span>
              <span className="font-mono tabular-nums">{formatLKR(vatAmount)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-800 pt-2 font-bold">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatLKR(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {inv.notes && (
          <div className="mt-8 border-t border-slate-200 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
            <p className="mt-1 text-sm text-slate-700">{inv.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-20 grid grid-cols-2 gap-16">
          <div className="border-t border-slate-400 pt-2 text-sm text-slate-500">Authorised Signature</div>
          <div className="border-t border-slate-400 pt-2 text-sm text-slate-500">Received By</div>
        </div>
      </div>
    </div>
  );
}
