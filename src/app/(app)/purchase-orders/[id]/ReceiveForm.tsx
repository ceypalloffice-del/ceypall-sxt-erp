"use client";

import { useState } from "react";
import { createGrn } from "@/app/actions/purchase-orders";
import { SubmitButton } from "@/components/SubmitButton";

type PoItem = {
  id: string;
  description: string;
  unit: string;
  qty_ordered: number;
  qty_received: number;
};

export function ReceiveForm({ poId, items }: { poId: string; items: PoItem[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const outstanding = items.filter((i) => i.qty_received < i.qty_ordered);

  const [qtys, setQtys]   = useState<Record<string, string>>({});
  const [busy, setBusy]   = useState(false);
  const [done, setDone]   = useState(false);

  if (outstanding.length === 0) return null;

  async function handleSubmit(fd: FormData) {
    const lines = outstanding
      .map((item) => ({
        po_item_id:   item.id,
        qty_received: Number(qtys[item.id] ?? 0),
      }))
      .filter((l) => l.qty_received > 0);

    if (lines.length === 0) return;
    setBusy(true);
    fd.set("po_id",  poId);
    fd.set("lines", JSON.stringify(lines));
    await createGrn(fd);
    setQtys({});
    setBusy(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-700">Receive Goods</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Enter quantities received. Stock will update automatically on save.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {outstanding.map((item) => {
          const outstanding_qty = item.qty_ordered - item.qty_received;
          return (
            <div key={item.id} className="grid grid-cols-12 items-center gap-4 px-6 py-3">
              <div className="col-span-5 text-sm text-slate-700">{item.description}</div>
              <div className="col-span-2 text-right font-mono tabular-nums text-xs text-slate-500">
                Ordered: {item.qty_ordered} {item.unit}
              </div>
              <div className="col-span-2 text-right font-mono tabular-nums text-xs text-slate-500">
                Already in: {item.qty_received} {item.unit}
              </div>
              <div className="col-span-2 text-right font-mono tabular-nums text-xs text-amber-600 font-medium">
                Outstanding: {outstanding_qty} {item.unit}
              </div>
              <div className="col-span-1">
                <input
                  type="number"
                  min="0"
                  max={outstanding_qty}
                  step="any"
                  placeholder="0"
                  value={qtys[item.id] ?? ""}
                  onChange={(e) => setQtys((q) => ({ ...q, [item.id]: e.target.value }))}
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-right text-sm font-mono tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 border-t border-slate-200 px-6 py-4">
        <div className="flex-1 grid grid-cols-2 gap-4 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Receipt Date</label>
            <input type="date" name="receipt_date" defaultValue={today}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <input type="text" name="notes" placeholder="Optional"
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" />
          </div>
        </div>
        <SubmitButton
          
          disabled={busy || Object.values(qtys).every((v) => !v || Number(v) === 0)}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Saving…" : done ? "✓ Stock Updated" : "Confirm Receipt"}
        </SubmitButton>
      </div>
    </form>
  );
}
