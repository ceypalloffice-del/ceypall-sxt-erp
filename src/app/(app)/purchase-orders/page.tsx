import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatLKR } from "@/lib/format";

const STATUS_STYLE: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-600",
  approved:  "bg-blue-50 text-blue-700",
  sent:      "bg-violet-50 text-violet-700",
  partial:   "bg-amber-50 text-amber-700",
  received:  "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-500",
};

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterStatus } = await searchParams;
  const supabase = await createClient();

  const query = supabase
    .from("purchase_order_summary")
    .select("*")
    .order("created_at", { ascending: false });

  if (filterStatus) query.eq("status", filterStatus);

  const { data: orders } = await query;
  const pos = orders ?? [];

  const statuses = ["draft", "approved", "sent", "partial", "received", "cancelled"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Raise POs to suppliers — receiving goods auto-updates inventory and chemical stock.
          </p>
        </div>
        <Link
          href="/purchase-orders/new"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + New PO
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/purchase-orders"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !filterStatus ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </a>
        {statuses.map((s) => (
          <a
            key={s}
            href={`?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              filterStatus === s ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {pos.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-600">No purchase orders yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Create your first PO to start tracking supplier orders.
            </p>
            <Link
              href="/purchase-orders/new"
              className="mt-4 inline-block rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
            >
              + New Purchase Order
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">PO No.</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Lines</th>
                <th className="px-4 py-3 text-right font-medium">Total Value</th>
                <th className="px-4 py-3 font-medium">Expected</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((po) => (
                <tr key={po.id as string} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/purchase-orders/${po.id}`}
                      className="font-mono tabular-nums font-semibold text-slate-800 hover:text-blue-700 hover:underline"
                    >
                      {po.po_no as string}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-600">
                    {new Date(po.order_date as string).toLocaleDateString("en-LK")}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {(po.supplier_name as string) || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[po.status as string] ?? ""}`}>
                      {po.status as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                    {po.line_count as number}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                    {po.total_value ? formatLKR(Number(po.total_value)) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                    {po.expected_date
                      ? new Date(po.expected_date as string).toLocaleDateString("en-LK")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
