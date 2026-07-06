import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatLKR } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";

const ENTITY_DETAILS: Record<string, { fullName: string }> = {
  CPL: { fullName: "CEYPALL (PVT) LTD" },
  SXT: { fullName: "ST. XAVIER TIMBER (PVT) LTD" },
};

export default async function PurchaseOrderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [poRes, itemsRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("*, suppliers(name, company_name, address, phone, email), entities(name, address, phone, email)")
      .eq("id", id)
      .single(),
    supabase.from("purchase_order_items").select("*").eq("po_id", id).order("sort_order"),
  ]);

  if (!poRes.data) notFound();
  const po = poRes.data;
  const items = itemsRes.data ?? [];
  const total = items.reduce((s, i) => s + Number(i.qty_ordered) * Number(i.unit_cost ?? 0), 0);

  const entity = po.entities as { name?: string; address?: string; phone?: string; email?: string } | null;
  const supplier = po.suppliers as {
    name?: string;
    company_name?: string;
    address?: string;
    phone?: string;
    email?: string;
  } | null;
  const entityDet = ENTITY_DETAILS[po.entity_id as string] ?? { fullName: entity?.name ?? "" };

  return (
    <div className="min-h-screen bg-white">
      {/* Controls — hidden when printing */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-8 py-3 print:hidden">
        <Link href={`/purchase-orders/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to Purchase Order
        </Link>
        <PrintButton />
      </div>

      {/* PO body */}
      <div className="mx-auto max-w-3xl px-10 py-10 text-slate-900">
        {/* Company header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{entityDet.fullName}</h1>
            {entity?.address && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{entity.address}</p>}
            <p className="text-sm text-slate-600">
              {[entity?.phone, entity?.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Purchase Order</p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums">{po.po_no as string}</p>
          </div>
        </div>

        <div className="my-6 border-t-2 border-slate-800" />

        {/* Supplier + dates */}
        <div className="mb-8 flex items-start justify-between gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supplier</p>
            <p className="mt-1 text-base font-semibold">{supplier?.name ?? "—"}</p>
            {supplier?.company_name && <p className="text-sm text-slate-600">{supplier.company_name}</p>}
            {supplier?.address && <p className="whitespace-pre-line text-sm text-slate-600">{supplier.address}</p>}
            {supplier?.phone && <p className="text-sm text-slate-600">Tel: {supplier.phone}</p>}
            {supplier?.email && <p className="text-sm text-slate-600">Email: {supplier.email}</p>}
          </div>
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="pr-6 text-left text-slate-500">Order Date</td>
                <td className="font-mono tabular-nums">
                  {new Date(po.order_date as string).toLocaleDateString("en-LK")}
                </td>
              </tr>
              {po.expected_date && (
                <tr>
                  <td className="pr-6 text-left text-slate-500">Expected Delivery</td>
                  <td className="font-mono tabular-nums">
                    {new Date(po.expected_date as string).toLocaleDateString("en-LK")}
                  </td>
                </tr>
              )}
              <tr>
                <td className="pr-6 text-left text-slate-500">Status</td>
                <td className="capitalize">{po.status as string}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Line items */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">No.</th>
              <th className="py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Description</th>
              <th className="py-2 pl-4 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Qty</th>
              <th className="py-2 pl-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Unit</th>
              <th className="py-2 pl-4 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Unit Price</th>
              <th className="py-2 pl-4 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id as string} className="border-b border-slate-200">
                <td className="py-2.5 pr-3 text-slate-500">{idx + 1}</td>
                <td className="py-2.5">{item.description as string}</td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums">
                  {Number(item.qty_ordered).toLocaleString("en-LK")}
                </td>
                <td className="py-2.5 pl-4">{item.unit as string}</td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums">
                  {item.unit_cost != null ? formatLKR(Number(item.unit_cost)) : "—"}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums">
                  {item.unit_cost != null
                    ? formatLKR(Number(item.qty_ordered) * Number(item.unit_cost))
                    : "—"}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} className="py-3 pl-4 text-right text-sm font-bold">Total</td>
              <td className="py-3 pl-4 text-right font-mono text-base font-bold tabular-nums">
                {total > 0 ? formatLKR(total) : "—"}
              </td>
            </tr>
          </tbody>
        </table>

        {po.notes && (
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{po.notes as string}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-16 grid grid-cols-2 gap-16 text-sm">
          <div>
            <div className="border-t border-slate-400 pt-2 text-slate-600">Prepared by</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-2 text-slate-600">Authorised by</div>
          </div>
        </div>
      </div>
    </div>
  );
}
