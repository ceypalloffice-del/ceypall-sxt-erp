import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";
import { Card, EmptyState, EntityTag, StatusBadge } from "@/components/ui";
import { formatLKR, formatDate } from "@/lib/format";
import { recordMovement, updateInventoryItem } from "@/app/actions/inventory";

const CATEGORIES = [
  "raw_timber",
  "plank",
  "block",
  "plywood",
  "crate",
  "nail",
  "chemical",
  "packaging",
  "finished_goods",
  "other",
];

const MOVEMENT_TYPES = [
  { value: "purchase", label: "Purchase (in)" },
  { value: "goods_receipt", label: "Goods receipt (in)" },
  { value: "production_output", label: "Production output (in)" },
  { value: "return", label: "Return (in)" },
  { value: "consumption", label: "Consumption (out)" },
  { value: "transfer", label: "Transfer (out)" },
  { value: "adjustment", label: "Adjustment" },
];

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

export default async function InventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);

  const { data: item } = await supabase
    .from("inventory_with_stock")
    .select("*")
    .eq("id", id)
    .single();
  if (!item) notFound();

  const [{ data: movements }, { data: warehouses }, { data: suppliers }] = await Promise.all([
    supabase
      .from("inventory_movements")
      .select("id, movement_type, qty, unit_cost, reference, notes, created_at")
      .eq("item_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("warehouses").select("id, name").eq("entity_id", item.entity_id).order("name"),
    supabase.from("suppliers").select("id, name").eq("entity_id", item.entity_id).order("name"),
  ]);

  const moves = movements ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{item.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <EntityTag entityId={item.entity_id} />
            <span className="font-mono tabular-nums">{item.sku ?? "no SKU"}</span>
            <span className="capitalize">· {String(item.category).replace(/_/g, " ")}</span>
          </p>
        </div>
        <StatusBadge status={item.stock_status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">On hand</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {Number(item.qty_on_hand)} {item.unit ?? ""}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Min / Max</p>
          <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-slate-700">
            {item.min_qty} / {item.max_qty ?? "—"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Avg cost</p>
          <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-slate-900">
            {formatLKR(Number(item.avg_cost))}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Last purchase</p>
          <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-slate-900">
            {item.last_purchase_price != null ? formatLKR(Number(item.last_purchase_price)) : "—"}
          </p>
        </Card>
      </div>

      {canEdit && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">Record movement</h2>
          <form action={recordMovement} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input type="hidden" name="item_id" value={id} />
            <label className="block text-sm text-slate-600">
              Type
              <select name="movement_type" className={inputCls}>
                {MOVEMENT_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-600">
              Quantity
              <input name="qty" type="number" step="0.01" min="0" required className={inputCls} />
            </label>
            <label className="block text-sm text-slate-600">
              Adjustment direction
              <select name="direction" className={inputCls}>
                <option value="in">Increase (+)</option>
                <option value="out">Decrease (−)</option>
              </select>
            </label>
            <label className="block text-sm text-slate-600">
              Unit cost (optional)
              <input name="unit_cost" type="number" step="0.01" className={inputCls} />
            </label>
            <label className="block text-sm text-slate-600">
              Reference (PO/job no.)
              <input name="reference" className={inputCls} />
            </label>
            <label className="block text-sm text-slate-600">
              Notes
              <input name="notes" className={inputCls} />
            </label>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:col-span-3"
            >
              Record movement
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            Direction only applies to Adjustment; all other types are fixed in/out automatically.
          </p>
        </Card>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-700">Movement history</h2>
        <Card className="mt-3 p-0">
          {moves.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No movements yet" hint="Stock changes will appear here as an audit trail." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Unit cost</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-500">{formatDate(m.created_at)}</td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {String(m.movement_type).replace(/_/g, " ")}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular-nums ${
                        Number(m.qty) >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {Number(m.qty) >= 0 ? "+" : ""}
                      {Number(m.qty)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500">
                      {m.unit_cost != null ? formatLKR(Number(m.unit_cost)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.reference ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{m.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {canEdit && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700">Item details</h2>
          <Card className="mt-3">
            <form action={updateInventoryItem} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={id} />
              <label className="block text-sm font-medium text-slate-700">
                Name
                <input name="name" defaultValue={item.name} className={inputCls} required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                SKU
                <input name="sku" defaultValue={item.sku ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Category
                <select name="category" defaultValue={item.category} className={inputCls}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Unit
                <input name="unit" defaultValue={item.unit ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Min qty
                <input name="min_qty" type="number" step="0.01" defaultValue={item.min_qty} className={inputCls} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Max qty
                <input name="max_qty" type="number" step="0.01" defaultValue={item.max_qty ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Warehouse
                <select name="warehouse_id" defaultValue={item.warehouse_id ?? ""} className={inputCls}>
                  <option value="">— None —</option>
                  {(warehouses ?? []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Default supplier
                <select name="supplier_id" defaultValue={item.supplier_id ?? ""} className={inputCls}>
                  <option value="">— None —</option>
                  {(suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                Description
                <textarea name="description" defaultValue={item.description ?? ""} rows={2} className={inputCls} />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Save item
                </button>
              </div>
            </form>
          </Card>
        </section>
      )}
    </div>
  );
}
