import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState, EntityTag, StatusBadge } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import { createInventoryItem } from "@/app/actions/inventory";

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

type StockRow = {
  id: string;
  entity_id: "SXT" | "CPL";
  sku: string | null;
  name: string;
  category: string;
  unit: string | null;
  min_qty: number;
  avg_cost: number;
  qty_on_hand: number;
  stock_status: string;
};

export default async function InventoryPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);
  const activeEntity = await getActiveEntity(profile);

  let items = supabase
    .from("inventory_with_stock")
    .select("id, entity_id, sku, name, category, unit, min_qty, avg_cost, qty_on_hand, stock_status")
    .order("name");
  let warehouses = supabase.from("warehouses").select("id, name, entity_id").order("name");
  let suppliers = supabase.from("suppliers").select("id, name, entity_id").order("name");

  if (activeEntity !== "ALL") {
    items = items.eq("entity_id", activeEntity);
    warehouses = warehouses.eq("entity_id", activeEntity);
    suppliers = suppliers.eq("entity_id", activeEntity);
  }

  const [{ data: itemRows }, { data: warehouseRows }, { data: supplierRows }] = await Promise.all([
    items,
    warehouses,
    suppliers,
  ]);

  const rows = (itemRows ?? []) as StockRow[];
  const inventoryValue = rows.reduce((sum, r) => sum + Number(r.qty_on_hand) * Number(r.avg_cost), 0);
  const lowCount = rows.filter((r) => r.stock_status === "low" || r.stock_status === "out_of_stock").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">
          Raw materials, work-in-progress, and finished goods with live stock levels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Items tracked</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">{rows.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Low / out of stock</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">{lowCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Inventory value</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {formatLKR(inventoryValue)}
          </p>
        </Card>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No inventory items yet" hint="Add a stock item below to start tracking." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">On hand</th>
                <th className="px-4 py-3 text-right font-medium">Min</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-500">{item.sku ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-900">
                    <Link href={`/inventory/${item.id}`} className="underline-offset-2 hover:underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><EntityTag entityId={item.entity_id} /></td>
                  <td className="px-4 py-3 text-slate-500">{item.category.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    {Number(item.qty_on_hand)} {item.unit ?? ""}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-400">{item.min_qty}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.stock_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {canEdit && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">Add inventory item</h2>
          {activeEntity === "ALL" ? (
            <p className="mt-3 text-sm text-slate-500">
              Switch to a single entity (top right) to add an inventory item.
            </p>
          ) : (
          <form action={createInventoryItem} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              name="name"
              placeholder="Item name"
              required
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:col-span-2"
            />
            <input
              name="sku"
              placeholder="SKU (optional)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            />
            <select
              name="category"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input
              name="unit"
              placeholder="Unit (e.g. pc, sqft, kg)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            />
            <input
              name="min_qty"
              type="number"
              step="0.01"
              placeholder="Min qty"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            />
            <select
              name="warehouse_id"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <option value="">— Warehouse —</option>
              {(warehouseRows ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <select
              name="supplier_id"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <option value="">— Default supplier —</option>
              {(supplierRows ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:col-span-3"
            >
              Add item
            </button>
          </form>
          )}
        </Card>
      )}
    </div>
  );
}
