"use client";

import { useMemo, useState } from "react";
import { updateTreatmentQuote } from "@/app/actions/treatment-quotes";
import { SubmitButton } from "@/components/SubmitButton";

type PlankRate = { id: string; service: string; thickness: string; rate_per_sqft: number };
type BeamRate = { id: string; service: string; height: string; width: string; rate_per_lft: number };
type Customer = { id: string; name: string };

type Quote = {
  id: string;
  name: string;
  customer_id: string | null;
  service: string;
  item_kind: string;
  thickness: string | null;
  height: string | null;
  width: string | null;
  qty: number;
  rate_used: number;
  margin_pct: number;
  notes: string | null;
};

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

export function TreatmentQuoteForm({
  quote,
  plankRates,
  beamRates,
  customers,
}: {
  quote: Quote;
  plankRates: PlankRate[];
  beamRates: BeamRate[];
  customers: Customer[];
}) {
  const [service, setService] = useState(quote.service);
  const [itemKind, setItemKind] = useState(quote.item_kind);
  const [rate, setRate] = useState(String(quote.rate_used));

  const availablePlanks = useMemo(
    () => plankRates.filter((r) => r.service === service),
    [plankRates, service]
  );
  const availableBeams = useMemo(
    () => beamRates.filter((r) => r.service === service),
    [beamRates, service]
  );

  return (
    <form action={updateTreatmentQuote} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={quote.id} />

      <label className="block text-sm font-medium text-slate-700">
        Quote name
        <input name="name" defaultValue={quote.name} className={inputCls} required />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Customer
        <select name="customer_id" defaultValue={quote.customer_id ?? ""} className={inputCls}>
          <option value="">— None —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Service
        <select
          name="service"
          value={service}
          onChange={(e) => setService(e.target.value)}
          className={inputCls}
        >
          <option value="kiln_drying">Kiln Drying</option>
          <option value="impregnation">Chemical Impregnation</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Item type
        <select
          name="item_kind"
          value={itemKind}
          onChange={(e) => setItemKind(e.target.value)}
          className={inputCls}
        >
          <option value="plank">Plank (per sqft)</option>
          <option value="beam">Beam (per LFT)</option>
        </select>
      </label>

      {itemKind === "plank" ? (
        <>
          <label className="block text-sm font-medium text-slate-700">
            Thickness
            <select
              name="thickness"
              defaultValue={quote.thickness ?? ""}
              onChange={(e) => {
                const match = availablePlanks.find((r) => r.thickness === e.target.value);
                if (match) setRate(String(match.rate_per_sqft));
              }}
              className={inputCls}
            >
              <option value="">— Select —</option>
              {availablePlanks.map((r) => (
                <option key={r.id} value={r.thickness}>
                  {r.thickness}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Qty (sqft)
            <input name="qty" type="number" step="0.01" defaultValue={quote.qty} className={inputCls} />
          </label>
        </>
      ) : (
        <>
          <label className="block text-sm font-medium text-slate-700">
            Height x width
            <select
              name="height"
              defaultValue={quote.height ?? ""}
              onChange={(e) => {
                const match = availableBeams.find((r) => r.height === e.target.value);
                if (match) {
                  setRate(String(match.rate_per_lft));
                  const widthInput = document.querySelector<HTMLInputElement>('input[name="width"]');
                  if (widthInput) widthInput.value = match.width;
                }
              }}
              className={inputCls}
            >
              <option value="">— Select height —</option>
              {availableBeams.map((r) => (
                <option key={r.id} value={r.height}>
                  {r.height} x {r.width}
                </option>
              ))}
            </select>
            <input type="hidden" name="width" defaultValue={quote.width ?? ""} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Qty (LFT)
            <input name="qty" type="number" step="0.01" defaultValue={quote.qty} className={inputCls} />
          </label>
        </>
      )}

      <label className="block text-sm font-medium text-slate-700">
        Rate used ({itemKind === "plank" ? "per sqft" : "per LFT"})
        <input
          name="rate_used"
          type="number"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Margin %
        <input name="margin_pct" type="number" step="0.1" defaultValue={Number(quote.margin_pct) * 100} className={inputCls} />
      </label>

      <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
        Notes
        <textarea name="notes" defaultValue={quote.notes ?? ""} rows={2} className={inputCls} />
      </label>

      <div className="sm:col-span-2">
        <SubmitButton
          
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
          Save quote
        </SubmitButton>
      </div>
    </form>
  );
}
