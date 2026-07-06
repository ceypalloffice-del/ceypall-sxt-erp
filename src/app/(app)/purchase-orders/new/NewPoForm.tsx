"use client";

import { useState } from "react";
import { createPurchaseOrder, type PoItemInput } from "@/app/actions/purchase-orders";
import { SubmitButton } from "@/components/SubmitButton";

type InventoryItem = { id: string; name: string; unit: string | null; last_purchase_price: number | null; category: string };
type ChemProduct   = { id: string; name: string; unit: string };
type Supplier      = { id: string; name: string };

const inputCls = "w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";
const labelCls = "block text-xs font-medium text-slate-600 mb-1";

type LineItem = PoItemInput & { _key: number };

export function NewPoForm({
  suppliers,
  inventoryItems,
  chemicals,
}: {
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  chemicals: ChemProduct[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [lines, setLines] = useState<LineItem[]>([{ _key: 0, description: "", inventory_item_id: null, chemical_product_id: null, unit: "pcs", qty_ordered: 1, unit_cost: null }]);
  const [busy, setBusy] = useState(false);
  const [keySeq, setKeySeq] = useState(1);

  function addLine() {
    setLines((l) => [...l, { _key: keySeq, description: "", inventory_item_id: null, chemical_product_id: null, unit: "pcs", qty_ordered: 1, unit_cost: null }]);
    setKeySeq((k) => k + 1);
  }

  function removeLine(key: number) {
    setLines((l) => l.filter((x) => x._key !== key));
  }

  function updateLine(key: number, patch: Partial<PoItemInput>) {
    setLines((l) => l.map((x) => (x._key === key ? { ...x, ...patch } : x)));
  }

  function handleItemSelect(key: number, value: string) {
    if (!value) {
      updateLine(key, { inventory_item_id: null, chemical_product_id: null, description: "", unit: "pcs", unit_cost: null });
      return;
    }
    if (value.startsWith("inv:")) {
      const id   = value.slice(4);
      const item = inventoryItems.find((i) => i.id === id);
      if (item) updateLine(key, { inventory_item_id: id, chemical_product_id: null, description: item.name, unit: item.unit ?? "pcs", unit_cost: item.last_purchase_price });
    } else if (value.startsWith("chem:")) {
      const id   = value.slice(5);
      const chem = chemicals.find((c) => c.id === id);
      if (chem) updateLine(key, { chemical_product_id: id, inventory_item_id: null, description: chem.name, unit: chem.unit, unit_cost: null });
    } else {
      updateLine(key, { inventory_item_id: null, chemical_product_id: null });
    }
  }

  const total = lines.reduce((s, l) => s + (l.qty_ordered || 0) * (l.unit_cost || 0), 0);

  async function handleSubmit(fd: FormData) {
    setBusy(true);
    fd.set("items", JSON.stringify(lines.map(({ _key, ...rest }) => rest)));
    await createPurchaseOrder(fd);
    // redirect happens inside the action
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      {/* ── PO Header ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Order Details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelCls}>Supplier</label>
            <select name="supplier_id" className={inputCls}>
              <option value="">— no supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Order Date</label>
            <input type="date" name="order_date" defaultValue={today} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Expected Delivery</label>
            <input type="date" name="expected_date" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <input type="text" name="notes" placeholder="Optional" className={inputCls} />
          </div>
        </div>
      </div>

      {/* ── Line Items ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700">Line Items</h2>
          <button type="button" onClick={addLine} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            + Add Line
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {lines.map((line, idx) => (
            <div key={line._key} className="grid gap-3 p-4 sm:grid-cols-12">
              {/* # */}
              <div className="flex items-center sm:col-span-1">
                <span className="text-xs font-mono text-slate-400">{idx + 1}</span>
              </div>
              {/* Item picker */}
              <div className="sm:col-span-3">
                <label className={labelCls}>Item</label>
                <select
                  className={inputCls}
                  onChange={(e) => handleItemSelect(line._key, e.target.value)}
                  defaultValue=""
                >
                  <option value="">— other / free text —</option>
                  {inventoryItems.length > 0 && (
                    <optgroup label="Inventory Items">
                      {inventoryItems.map((i) => (
                        <option key={i.id} value={`inv:${i.id}`}>{i.name}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Chemicals">
                    {chemicals.map((c) => (
                      <option key={c.id} value={`chem:${c.id}`}>{c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              {/* Description */}
              <div className="sm:col-span-3">
                <label className={labelCls}>Description</label>
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => updateLine(line._key, { description: e.target.value })}
                  placeholder="Item description"
                  className={inputCls}
                  required
                />
              </div>
              {/* Unit */}
              <div className="sm:col-span-1">
                <label className={labelCls}>Unit</label>
                <input
                  type="text"
                  value={line.unit}
                  onChange={(e) => updateLine(line._key, { unit: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
              {/* Qty */}
              <div className="sm:col-span-1">
                <label className={labelCls}>Qty</label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={line.qty_ordered}
                  onChange={(e) => updateLine(line._key, { qty_ordered: Number(e.target.value) })}
                  className={inputCls + " font-mono tabular-nums"}
                  required
                />
              </div>
              {/* Unit cost */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Unit Cost (LKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unit_cost ?? ""}
                  onChange={(e) => updateLine(line._key, { unit_cost: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0.00"
                  className={inputCls + " font-mono tabular-nums"}
                />
              </div>
              {/* Line total */}
              <div className="flex items-end sm:col-span-1">
                <p className="w-full text-right text-xs font-mono tabular-nums text-slate-500">
                  {line.unit_cost ? `LKR ${((line.qty_ordered || 0) * line.unit_cost).toLocaleString("en-LK", { maximumFractionDigits: 0 })}` : "—"}
                </p>
              </div>
              {/* Remove */}
              <div className="flex items-end justify-end sm:col-span-1">
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(line._key)} className="text-xs text-red-400 hover:text-red-600">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={addLine} className="text-xs text-slate-500 hover:text-slate-800">
            + Add another line
          </button>
          <div className="text-right">
            <p className="text-xs text-slate-500">Estimated Total</p>
            <p className="font-mono text-lg font-bold tabular-nums text-slate-900">
              {total > 0 ? `LKR ${Math.round(total).toLocaleString("en-LK")}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <SubmitButton
          
          disabled={busy || lines.every((l) => !l.description)}
          className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create Purchase Order"}
        </SubmitButton>
        <a href="/purchase-orders" className="text-sm text-slate-500 hover:text-slate-800">
          Cancel
        </a>
      </div>
    </form>
  );
}
