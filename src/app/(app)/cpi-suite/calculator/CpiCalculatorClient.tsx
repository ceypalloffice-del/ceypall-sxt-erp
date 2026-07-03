"use client";

import { useState, useMemo } from "react";
import { calcPricing, calcBoardFeet } from "@/lib/cpi-engine/pricing";
import type { CpiSettings } from "@/lib/cpi-engine/types";

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400";

type TreatmentType = "chemical" | "kiln" | "both";
type ItemType = "plank" | "beam";

const PLANK_PRESETS = [
  { label: "1\" × 2\"", t: 1, w: 2 },
  { label: "1\" × 3\"", t: 1, w: 3 },
  { label: "1\" × 4\"", t: 1, w: 4 },
  { label: "1\" × 6\"", t: 1, w: 6 },
  { label: "1\" × 8\"", t: 1, w: 8 },
  { label: "1\" × 10\"", t: 1, w: 10 },
  { label: "1\" × 12\"", t: 1, w: 12 },
  { label: "1½\" × 6\"", t: 1.5, w: 6 },
  { label: "2\" × 4\"", t: 2, w: 4 },
  { label: "2\" × 6\"", t: 2, w: 6 },
  { label: "2\" × 8\"", t: 2, w: 8 },
];

const BEAM_PRESETS = [
  { label: "2\" × 2\"", t: 2, w: 2 },
  { label: "2\" × 4\"", t: 2, w: 4 },
  { label: "3\" × 4\"", t: 3, w: 4 },
  { label: "3\" × 6\"", t: 3, w: 6 },
  { label: "4\" × 6\"", t: 4, w: 6 },
  { label: "4\" × 8\"", t: 4, w: 8 },
  { label: "4\" × 12\"", t: 4, w: 12 },
  { label: "6\" × 8\"", t: 6, w: 8 },
  { label: "6\" × 12\"", t: 6, w: 12 },
];

export function CpiCalculatorClient({
  settings,
  costPerBf,
}: {
  settings: CpiSettings;
  costPerBf: number;
}) {
  const [treatment, setTreatment] = useState<TreatmentType>("chemical");
  const [itemType, setItemType] = useState<ItemType>("plank");
  const [thickness, setThickness] = useState(1);
  const [width, setWidth] = useState(6);
  const [length, setLength] = useState(10);
  const [qty, setQty] = useState(1);

  const presets = itemType === "plank" ? PLANK_PRESETS : BEAM_PRESETS;

  const result = useMemo(
    () =>
      calcPricing(
        thickness,
        width,
        length,
        qty,
        costPerBf,
        settings.target_margin_pct
      ),
    [thickness, width, length, qty, costPerBf, settings.target_margin_pct]
  );

  const lkr = (n: number) => `LKR ${Math.round(n).toLocaleString("en-LK")}`;

  const marginColor =
    result.margin_pct >= settings.target_margin_pct
      ? "text-emerald-700"
      : result.margin_pct > 0
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ── Input panel ── */}
        <div className="space-y-5">
          {/* Treatment type */}
          <div>
            <p className="text-sm font-medium text-slate-700">Treatment</p>
            <div className="mt-2 flex gap-2">
              {(["chemical", "kiln", "both"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTreatment(t)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    treatment === t
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t === "chemical" ? "Chemical (CPI)" : t === "kiln" ? "Kiln (KD)" : "Both"}
                </button>
              ))}
            </div>
          </div>

          {/* Item type */}
          <div>
            <p className="text-sm font-medium text-slate-700">Item Type</p>
            <div className="mt-2 flex gap-2">
              {(["plank", "beam"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setItemType(t)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    itemType === t
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Quick sizes</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setThickness(p.t); setWidth(p.w); }}
                  className={`rounded border px-2 py-1 text-xs font-mono transition-colors ${
                    thickness === p.t && width === p.w
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Thickness (in)
              </label>
              <input
                type="number"
                value={thickness}
                onChange={(e) => setThickness(Number(e.target.value))}
                step="0.25"
                min="0.25"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Width (in)
              </label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                step="0.5"
                min="0.5"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Length (ft)
              </label>
              <input
                type="number"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                step="1"
                min="1"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Qty (pieces)
              </label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                step="1"
                min="1"
                className={inputCls}
              />
            </div>
          </div>

          <div className="rounded-lg bg-slate-100 px-4 py-2 text-xs text-slate-500">
            {thickness}&quot; × {width}&quot; × {length}&apos; × {qty} pcs ={" "}
            <span className="font-mono font-semibold text-slate-700">
              {calcBoardFeet(thickness, width, length, qty)} BF
            </span>
            {treatment !== "chemical" && (
              <span className="ml-2 text-amber-600">
                ⚠ Kiln rate — enter manually in Price Lists
              </span>
            )}
          </div>
        </div>

        {/* ── Result panel ── */}
        <div className="rounded-xl border border-emerald-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">
            Pricing Result
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            CPI cost/BF: LKR {costPerBf.toFixed(2)} ·{" "}
            {settings.target_margin_pct}% margin target
          </p>

          <div className="mt-5 space-y-3">
            {[
              {
                label: "Board Feet",
                value: `${result.board_feet} BF`,
                bold: false,
              },
              {
                label: "Treatment Cost",
                value: lkr(result.allocated_cost),
                bold: false,
              },
              {
                label: "Auto Rate / BF",
                value: `LKR ${result.auto_rate_per_bf.toFixed(2)}`,
                bold: false,
              },
            ].map(({ label, value, bold }) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-slate-100 pb-3"
              >
                <span className={`text-sm ${bold ? "font-semibold" : "text-slate-600"}`}>
                  {label}
                </span>
                <span className={`font-mono tabular-nums ${bold ? "text-base font-bold" : "text-sm"}`}>
                  {value}
                </span>
              </div>
            ))}

            <div className="rounded-xl bg-slate-900 p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Selling Price</span>
                <span className="font-mono text-2xl font-bold tabular-nums">
                  {lkr(result.selling_price)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-700 pt-3">
                <div>
                  <p className="text-xs text-slate-400">Profit</p>
                  <p
                    className={`font-mono text-lg font-bold tabular-nums ${
                      result.profit >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {lkr(result.profit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Margin</p>
                  <p
                    className={`font-mono text-lg font-bold tabular-nums ${
                      result.margin_pct >= settings.target_margin_pct
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {result.margin_pct.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
