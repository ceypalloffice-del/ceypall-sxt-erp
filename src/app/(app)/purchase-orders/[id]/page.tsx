import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatLKR } from "@/lib/format";
import { updatePoStatus } from "@/app/actions/purchase-orders";
import { ReceiveForm } from "./ReceiveForm";
import { SubmitButton } from "@/components/SubmitButton";

const STATUS_STYLE: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-600",
  approved:  "bg-blue-50 text-blue-700",
  sent:      "bg-violet-50 text-violet-700",
  partial:   "bg-amber-50 text-amber-700",
  received:  "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-500",
};

const STATUS_ACTIONS: Record<string, { label: string; next: string; cls: string }[]> = {
  draft:    [{ label: "Approve",   next: "approved", cls: "bg-blue-600 text-white hover:bg-blue-700" },
             { label: "Cancel",    next: "cancelled", cls: "bg-red-50 text-red-600 hover:bg-red-100" }],
  approved: [{ label: "Mark Sent", next: "sent",      cls: "bg-violet-600 text-white hover:bg-violet-700" },
             { label: "Cancel",    next: "cancelled",  cls: "bg-red-50 text-red-600 hover:bg-red-100" }],
  sent:     [{ label: "Cancel",    next: "cancelled",  cls: "bg-red-50 text-red-600 hover:bg-red-100" }],
  partial:  [],
  received: [],
  cancelled:[],
};

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [poRes, itemsRes, grnsRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("*, suppliers(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("purchase_order_items")
      .select("*")
      .eq("po_id", id)
      .order("sort_order"),
    supabase
      .from("purchase_grns")
      .select("*, purchase_grn_items(*, purchase_order_items(description, unit))")
      .eq("po_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!poRes.data) notFound();

  const po    = poRes.data;
  const items = itemsRes.data ?? [];
  const grns  = grnsRes.data  ?? [];

  const totalValue    = items.reduce((s, i) => s + (i.qty_ordered * (i.unit_cost ?? 0)), 0);
  const supplier      = po.suppliers as { name: string } | null;
  const actions       = STATUS_ACTIONS[po.status as string] ?? [];
  const canReceive    = ["approved", "sent", "partial"].includes(po.status as string);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tabular-nums text-slate-900">
              {po.po_no as string}
            </h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[po.status as string] ?? ""}`}>
              {po.status as string}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {supplier?.name ?? "No supplier"} · Ordered {new Date(po.order_date as string).toLocaleDateString("en-LK")}
            {po.expected_date && ` · Expected ${new Date(po.expected_date as string).toLocaleDateString("en-LK")}`}
          </p>
        </div>

        {/* Status action buttons */}
        <div className="flex gap-2">
          <Link
            href={`/purchase-orders/${id}/print`}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Download PDF
          </Link>
          {actions.map((action) => (
            <form key={action.next} action={updatePoStatus}>
              <input type="hidden" name="po_id"   value={id} />
              <input type="hidden" name="status"  value={action.next} />
              <SubmitButton  className={`rounded-lg px-4 py-2 text-sm font-semibold ${action.cls}`}>
                {action.label}
              </SubmitButton>
            </form>
          ))}
        </div>
      </div>

      {/* PO Notes */}
      {po.notes && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {po.notes as string}
        </p>
      )}

      {/* Line Items */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Ordered</th>
              <th className="px-4 py-3 text-right font-medium">Received</th>
              <th className="px-4 py-3 text-right font-medium">Outstanding</th>
              <th className="px-4 py-3 text-right font-medium">Unit Cost</th>
              <th className="px-4 py-3 text-right font-medium">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const outstanding = Number(item.qty_ordered) - Number(item.qty_received);
              const lineTotal   = Number(item.qty_ordered) * Number(item.unit_cost ?? 0);
              return (
                <tr key={item.id as string} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 text-xs text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{item.description as string}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {Number(item.qty_ordered).toFixed(2)} {item.unit as string}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-emerald-700">
                    {Number(item.qty_received).toFixed(2)} {item.unit as string}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono tabular-nums font-medium ${outstanding > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    {outstanding > 0 ? `${outstanding.toFixed(2)} ${item.unit as string}` : "✓ Complete"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-500">
                    {item.unit_cost != null ? formatLKR(Number(item.unit_cost)) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold">
                    {item.unit_cost != null ? formatLKR(lineTotal) : "—"}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Total</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-base font-bold text-slate-900">
                {totalValue > 0 ? formatLKR(totalValue) : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Receive Goods form */}
      {canReceive && (
        <ReceiveForm
          poId={id}
          items={items.map((i) => ({
            id:           i.id as string,
            description:  i.description as string,
            unit:         i.unit as string,
            qty_ordered:  Number(i.qty_ordered),
            qty_received: Number(i.qty_received),
          }))}
        />
      )}

      {/* GRN History */}
      {grns.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Goods Received Notes</h2>
          <div className="space-y-3">
            {grns.map((grn) => (
              <div key={grn.id as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold tabular-nums text-slate-800">
                    {grn.grn_no as string}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(grn.receipt_date as string).toLocaleDateString("en-LK")}
                  </span>
                </div>
                {grn.notes && <p className="mt-1 text-xs text-slate-500">{grn.notes as string}</p>}
                <table className="mt-3 w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {((grn.purchase_grn_items as { qty_received: number; purchase_order_items: { description: string; unit: string } | null }[]) ?? []).map((item, i) => (
                      <tr key={i}>
                        <td className="py-1 text-slate-600">{item.purchase_order_items?.description ?? "—"}</td>
                        <td className="py-1 text-right font-mono tabular-nums text-emerald-700">
                          +{Number(item.qty_received).toFixed(2)} {item.purchase_order_items?.unit ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
