"use client";

import { useState } from "react";
import { addChemicalPurchase, recordChemicalUsage, addStockAdjustment } from "@/app/actions/chemicals";
import { SubmitButton } from "@/components/SubmitButton";

type ChemProduct = {
  id: string;
  name: string;
  unit: string;
  pack_sizes: string[];
  stock_qty: number;
};

const PACK_QTY: Record<string, number> = {
  "25 kg bag": 25,
  "100 ml bottle": 0.1,
  "200 ml bottle": 0.2,
  "1 L bottle": 1.0,
};

const USAGE_TYPES = [
  { value: "cpi_treatment", label: "CPI Treatment" },
  { value: "pallet_use",    label: "Pallet Manufacturing" },
  { value: "tank_fill",     label: "Tank Fill" },
];

const inputCls =
  "w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400";
const labelCls = "block text-xs font-medium text-slate-600 mb-1";
const btnCls =
  "rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2";

type Tab = "purchase" | "usage" | "adjust";

export function ActionForms({ products }: { products: ChemProduct[] }) {
  const [tab, setTab] = useState<Tab>("purchase");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<Tab | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Purchase form state
  const [pProductId, setPProductId] = useState(products[0]?.id ?? "");
  const [pPackSize, setPPackSize]   = useState("");
  const [pPacks, setPPacks]         = useState("");
  const [pUnitCost, setPUnitCost]   = useState("");

  const pProduct   = products.find((p) => p.id === pProductId);
  const qtyPerPack = PACK_QTY[pPackSize] ?? 0;
  const totalQty   = qtyPerPack * (Number(pPacks) || 0);
  const totalCost  = totalQty * (Number(pUnitCost) || 0);

  // Usage form state
  const [uProductId, setUProductId] = useState(products[0]?.id ?? "");
  const [uQty, setUQty]             = useState("");

  // Adjust form state
  const [aProductId, setAProductId] = useState(products[0]?.id ?? "");
  const [aDirection, setADirection] = useState<"add" | "remove">("add");

  async function handlePurchase(fd: FormData) {
    fd.set("total_qty", String(totalQty));
    setBusy(true);
    await addChemicalPurchase(fd);
    setPPacks(""); setPUnitCost(""); setPPackSize("");
    setBusy(false); setOk("purchase"); setTimeout(() => setOk(null), 3000);
  }

  async function handleUsage(fd: FormData) {
    setBusy(true);
    await recordChemicalUsage(fd);
    setUQty("");
    setBusy(false); setOk("usage"); setTimeout(() => setOk(null), 3000);
  }

  async function handleAdjust(fd: FormData) {
    setBusy(true);
    await addStockAdjustment(fd);
    setBusy(false); setOk("adjust"); setTimeout(() => setOk(null), 3000);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "purchase", label: "Receive Stock" },
    { key: "usage",    label: "Record Usage" },
    { key: "adjust",   label: "Adjust / Opening" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Tab bar */}
      <div className="flex border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              tab === t.key
                ? "border-b-2 border-emerald-600 text-emerald-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ── Receive Stock ── */}
        {tab === "purchase" && (
          <form action={handlePurchase} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Chemical */}
            <div>
              <label className={labelCls}>Chemical</label>
              <select
                name="product_id"
                value={pProductId}
                onChange={(e) => { setPProductId(e.target.value); setPPackSize(""); }}
                className={inputCls}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Pack size */}
            <div>
              <label className={labelCls}>Pack Size</label>
              <select
                name="pack_size"
                value={pPackSize}
                onChange={(e) => setPPackSize(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">— select —</option>
                {(pProduct?.pack_sizes ?? []).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Number of packs */}
            <div>
              <label className={labelCls}>No. of Packs</label>
              <input
                type="number"
                name="packs_count"
                min="1"
                step="1"
                value={pPacks}
                onChange={(e) => setPPacks(e.target.value)}
                placeholder="e.g. 4"
                className={inputCls}
                required
              />
              {totalQty > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  = {totalQty.toFixed(pProduct?.unit === "L" ? 1 : 0)} {pProduct?.unit}
                </p>
              )}
            </div>

            {/* Cost per unit */}
            <div>
              <label className={labelCls}>
                Cost per {pProduct?.unit === "L" ? "litre" : "kg"} (LKR)
              </label>
              <input
                type="number"
                name="unit_cost"
                min="0"
                step="0.01"
                value={pUnitCost}
                onChange={(e) => setPUnitCost(e.target.value)}
                placeholder="0.00"
                className={inputCls + " font-mono tabular-nums"}
              />
              {totalCost > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  Total ≈ LKR {Math.round(totalCost).toLocaleString()}
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" name="movement_date" defaultValue={today} className={inputCls} required />
            </div>

            {/* Reference */}
            <div>
              <label className={labelCls}>Invoice / Reference</label>
              <input type="text" name="reference_no" placeholder="GRN or invoice no." className={inputCls} />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className={labelCls}>Notes</label>
              <input type="text" name="notes" placeholder="Optional" className={inputCls} />
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <SubmitButton
                
                disabled={busy || !pPackSize || !pPacks}
                className={btnCls + " w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"}>
                {busy ? "Saving…" : ok === "purchase" ? "✓ Saved" : "Add to Stock"}
              </SubmitButton>
            </div>
          </form>
        )}

        {/* ── Record Usage ── */}
        {tab === "usage" && (
          <form action={handleUsage} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Chemical */}
            <div>
              <label className={labelCls}>Chemical</label>
              <select
                name="product_id"
                value={uProductId}
                onChange={(e) => setUProductId(e.target.value)}
                className={inputCls}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {(() => {
                const p = products.find((x) => x.id === uProductId);
                return p ? (
                  <p className="mt-1 text-xs text-slate-400">
                    In stock: {p.stock_qty.toFixed(p.unit === "L" ? 2 : 0)} {p.unit}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Usage type */}
            <div>
              <label className={labelCls}>Usage Type</label>
              <select name="movement_type" className={inputCls} required>
                {USAGE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className={labelCls}>
                Quantity ({products.find((p) => p.id === uProductId)?.unit ?? "unit"})
              </label>
              <input
                type="number"
                name="quantity"
                min="0.001"
                step="any"
                value={uQty}
                onChange={(e) => setUQty(e.target.value)}
                placeholder="0.00"
                className={inputCls + " font-mono tabular-nums"}
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" name="movement_date" defaultValue={today} className={inputCls} required />
            </div>

            {/* Reference */}
            <div>
              <label className={labelCls}>Reference (e.g. CPI log no.)</label>
              <input type="text" name="reference_no" placeholder="Optional" className={inputCls} />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <input type="text" name="notes" placeholder="Optional" className={inputCls} />
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <SubmitButton
                
                disabled={busy || !uQty}
                className={btnCls + " w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"}>
                {busy ? "Saving…" : ok === "usage" ? "✓ Saved" : "Record Usage"}
              </SubmitButton>
            </div>
          </form>
        )}

        {/* ── Adjust / Opening Balance ── */}
        {tab === "adjust" && (
          <form action={handleAdjust} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Type */}
            <div>
              <label className={labelCls}>Type</label>
              <select name="adjustment_type" className={inputCls}>
                <option value="adjustment">Stock Adjustment (damage / count)</option>
                <option value="opening">Opening Balance</option>
              </select>
            </div>

            {/* Chemical */}
            <div>
              <label className={labelCls}>Chemical</label>
              <select
                name="product_id"
                value={aProductId}
                onChange={(e) => setAProductId(e.target.value)}
                className={inputCls}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Direction */}
            <div>
              <label className={labelCls}>Direction</label>
              <div className="flex gap-2">
                {(["add", "remove"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setADirection(d)}
                    className={`flex-1 rounded border py-2 text-sm font-medium transition-colors ${
                      aDirection === d
                        ? d === "add"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-red-400 bg-red-50 text-red-700"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {d === "add" ? "+ Add" : "− Remove"}
                  </button>
                ))}
                <input type="hidden" name="direction" value={aDirection} />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className={labelCls}>
                Quantity ({products.find((p) => p.id === aProductId)?.unit ?? "unit"})
              </label>
              <input
                type="number"
                name="quantity"
                min="0.001"
                step="any"
                placeholder="0.00"
                className={inputCls + " font-mono tabular-nums"}
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" name="movement_date" defaultValue={today} className={inputCls} required />
            </div>

            {/* Notes / reason */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Reason / Notes</label>
              <input type="text" name="notes" placeholder="e.g. spillage, physical count correction" className={inputCls} />
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <SubmitButton
                
                disabled={busy}
                className={btnCls + " w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50"}>
                {busy ? "Saving…" : ok === "adjust" ? "✓ Saved" : "Save Adjustment"}
              </SubmitButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
