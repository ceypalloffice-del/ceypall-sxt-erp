"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { calculate } from "@/lib/sxt-engine/calculator";
import { mmToIn } from "@/lib/sxt-engine/units";
import { mmToInLabel } from "@/lib/sxt-engine/pricing";
import type { SxtSettings } from "@/lib/sxt-engine/types";

interface PlankRate { thickness_mm: number; service_type: string; rate_per_sqft: number }
interface BeamRate  { width_mm: number; height_mm: number; service_type: string; rate_per_sqft: number }

interface Props {
  settings: SxtSettings;
  plankRates: PlankRate[];
  beamRates: BeamRate[];
}

type Mode = "planks" | "beams";
type TxType = "kiln_drying" | "impregnation" | "both";

const fmtLKR = (n: number) =>
  n === 0 ? "—" : `LKR ${Math.round(n).toLocaleString()}`;
const fmt2 = (n: number) => n.toFixed(2);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";
const labelCls = "block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1";

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`font-mono text-sm tabular-nums font-semibold ${highlight ? "text-blue-700 text-base" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

export function CalculatorClient({ settings, plankRates, beamRates }: Props) {
  const [mode, setMode] = useState<Mode>("planks");
  const [txType, setTxType] = useState<TxType>("kiln_drying");
  const [presetKey, setPresetKey] = useState<string>("");
  const [thickness, setThickness] = useState("1");
  const [width, setWidth] = useState("6");
  const [length, setLength] = useState("10");
  const [qty, setQty] = useState("100");
  const [customRate, setCustomRate] = useState("");

  // Unique thickness values for plank preset dropdown
  const plankThicknesses = useMemo(() => {
    const seen = new Set<number>();
    return plankRates
      .filter((r) => { if (seen.has(r.thickness_mm)) return false; seen.add(r.thickness_mm); return true; })
      .sort((a, b) => a.thickness_mm - b.thickness_mm);
  }, [plankRates]);

  // Unique beam size keys
  const beamSizes = useMemo(() => {
    const seen = new Set<string>();
    return beamRates.filter((r) => {
      const k = `${r.width_mm}x${r.height_mm}`;
      if (seen.has(k)) return false; seen.add(k); return true;
    });
  }, [beamRates]);

  // When a preset is selected, fill in dimension fields and look up rate
  const presetRate = useMemo(() => {
    if (!presetKey) return null;
    if (mode === "planks") {
      const mm = Number(presetKey);
      return plankRates.find((r) => r.thickness_mm === mm && r.service_type === txType)
        ?? plankRates.find((r) => r.thickness_mm === mm);
    }
    const [wStr, hStr] = presetKey.split("x");
    return beamRates.find(
      (r) => r.width_mm === Number(wStr) && r.height_mm === Number(hStr) && r.service_type === txType
    ) ?? beamRates.find((r) => r.width_mm === Number(wStr) && r.height_mm === Number(hStr));
  }, [presetKey, mode, txType, plankRates, beamRates]);

  // Resolved thickness and width from preset or manual fields
  const { resolvedThickness, resolvedWidth } = useMemo(() => {
    if (presetKey && mode === "planks") {
      return { resolvedThickness: mmToIn(Number(presetKey)), resolvedWidth: Number(width) || 0 };
    }
    if (presetKey && mode === "beams") {
      const [wMm, hMm] = presetKey.split("x").map(Number);
      return { resolvedThickness: mmToIn(hMm), resolvedWidth: mmToIn(wMm) };
    }
    return { resolvedThickness: Number(thickness) || 0, resolvedWidth: Number(width) || 0 };
  }, [presetKey, mode, thickness, width]);

  const resolvedRate = customRate ? Number(customRate) : (presetRate?.rate_per_sqft ?? 0);

  const result = useMemo(() =>
    calculate({
      thickness_in: resolvedThickness,
      width_in: resolvedWidth,
      length_ft: Number(length) || 0,
      qty: Number(qty) || 0,
      rate_per_sqft: resolvedRate,
      kiln_capacity_m3: settings.kiln_capacity_m3,
      kiln_length_ft: settings.kiln_length_ft,
      kiln_width_ft: settings.kiln_width_ft,
      kiln_height_ft: settings.kiln_height_ft,
      sticker_thickness_in: settings.sticker_thickness_in,
      electricity_units_per_day: settings.electricity_units_per_day,
      electricity_rate: settings.electricity_rate,
      drying_days: settings.drying_days,
      labour_cost_per_batch: settings.labour_cost_per_batch,
      target_margin_pct: settings.target_margin_pct,
    }),
    [resolvedThickness, resolvedWidth, length, qty, resolvedRate, settings]
  );

  const switchMode = (m: Mode) => { setMode(m); setPresetKey(""); };

  const utilisationColor =
    result.utilisation_pct > 100 ? "bg-red-500"
    : result.utilisation_pct > 85 ? "bg-emerald-500"
    : result.utilisation_pct > 50 ? "bg-blue-500"
    : "bg-amber-400";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── Inputs ── */}
      <div className="space-y-5">
        {/* Mode tabs */}
        <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50 w-fit gap-1">
          {(["planks", "beams"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                mode === m ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Treatment type */}
        <div>
          <label className={labelCls}>Treatment</label>
          <div className="flex gap-2">
            {(["kiln_drying", "impregnation", "both"] as TxType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTxType(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                  txType === t
                    ? "bg-blue-700 text-white border-blue-700"
                    : "border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                {t === "kiln_drying" ? "Kiln Drying" : t === "impregnation" ? "CPI" : "Both"}
              </button>
            ))}
          </div>
        </div>

        {/* Preset selector */}
        <div>
          <label className={labelCls}>
            {mode === "planks" ? "Standard thickness (auto-fills rate)" : "Standard size (auto-fills rate)"}
          </label>
          {mode === "planks" ? (
            <select
              value={presetKey}
              onChange={(e) => setPresetKey(e.target.value)}
              className={inputCls}
            >
              <option value="">— Custom / manual entry —</option>
              {plankThicknesses.map((r) => (
                <option key={r.thickness_mm} value={r.thickness_mm}>
                  {mmToInLabel(r.thickness_mm)}  ({r.thickness_mm}mm)
                </option>
              ))}
            </select>
          ) : (
            <select
              value={presetKey}
              onChange={(e) => setPresetKey(e.target.value)}
              className={inputCls}
            >
              <option value="">— Custom / manual entry —</option>
              {beamSizes.map((r) => (
                <option key={`${r.width_mm}x${r.height_mm}`} value={`${r.width_mm}x${r.height_mm}`}>
                  {r.width_mm}×{r.height_mm}mm ({mmToInLabel(r.width_mm)} × {mmToInLabel(r.height_mm)})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Dimension inputs */}
        <div className="grid grid-cols-2 gap-3">
          {(!presetKey || mode === "planks") && (
            <div>
              <label className={labelCls}>Thickness (inches)</label>
              <input
                type="number" step="0.001" min="0"
                value={presetKey && mode === "planks" ? fmt2(resolvedThickness) : thickness}
                onChange={(e) => { setPresetKey(""); setThickness(e.target.value); }}
                readOnly={!!(presetKey && mode === "planks")}
                className={`${inputCls} ${presetKey && mode === "planks" ? "bg-slate-50 text-slate-500" : ""}`}
              />
            </div>
          )}
          <div>
            <label className={labelCls}>Width (inches)</label>
            <input
              type="number" step="0.001" min="0"
              value={presetKey && mode === "beams" ? fmt2(resolvedWidth) : width}
              onChange={(e) => { setPresetKey(""); setWidth(e.target.value); }}
              readOnly={!!(presetKey && mode === "beams")}
              className={`${inputCls} ${presetKey && mode === "beams" ? "bg-slate-50 text-slate-500" : ""}`}
            />
          </div>
          <div>
            <label className={labelCls}>Length (feet)</label>
            <input type="number" step="0.5" min="0" value={length} onChange={(e) => setLength(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Quantity (pieces)</label>
            <input type="number" step="1" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Rate override */}
        <div>
          <label className={labelCls}>
            Rate per sqft (LKR)
            {presetRate && !customRate && (
              <span className="ml-2 font-mono font-semibold text-blue-600 normal-case">
                ← {presetRate.rate_per_sqft} from price list
              </span>
            )}
          </label>
          <input
            type="number" step="0.50" min="0"
            placeholder={presetRate ? `${presetRate.rate_per_sqft} (from price list)` : "Enter rate"}
            value={customRate}
            onChange={(e) => setCustomRate(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Kiln settings reminder */}
        <p className="text-xs text-slate-400">
          Using: {settings.kiln_capacity_m3} m³ kiln · {settings.electricity_units_per_day} kWh/day ·
          {settings.drying_days} days · LKR {settings.electricity_rate}/kWh —{" "}
          <Link href="/treatment-suite/settings" className="underline hover:text-slate-600">
            change
          </Link>
        </p>
      </div>

      {/* ── Results ── */}
      <div className="space-y-4">
        {/* Kiln utilisation bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Kiln Utilisation</span>
            <span className={`font-mono text-lg font-bold tabular-nums ${result.utilisation_pct > 100 ? "text-red-600" : "text-slate-900"}`}>
              {fmtPct(result.utilisation_pct)}
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${utilisationColor}`}
              style={{ width: `${Math.min(result.utilisation_pct, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex gap-6 text-xs text-slate-500">
            <span>Remaining: <span className="font-mono font-semibold text-slate-700">{fmt2(result.remaining_m3)} m³</span></span>
            <span>Layers: <span className="font-mono font-semibold text-slate-700">{result.layers}</span></span>
            <span>Max pieces: <span className="font-mono font-semibold text-slate-700">{result.kiln_max_pieces.toLocaleString()}</span></span>
          </div>
        </div>

        {/* Measurements */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Measurements</h3>
          <ResultRow label="Linear feet (LFT)" value={`${result.lft.toLocaleString()} ft`} />
          <ResultRow label="Square feet" value={`${result.sqft.toLocaleString()} sqft`} />
          <ResultRow label="Cubic feet" value={`${fmt2(result.cubic_ft)} ft³`} />
          <ResultRow label="Cubic metres" value={`${result.cubic_m3} m³`} />
        </div>

        {/* Cost */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Cost (proportional share)</h3>
          <ResultRow label="Batch electricity" value={fmtLKR(result.electricity_cost)} />
          <ResultRow label="Batch labour" value={fmtLKR(result.labour_cost)} />
          <ResultRow label="Your share" value={fmtLKR(result.item_cost)} />
          <ResultRow label="Cost per sqft" value={`LKR ${fmt2(result.cost_per_sqft)}`} />
        </div>

        {/* Pricing */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Pricing</h3>
          <ResultRow label="Revenue" value={fmtLKR(result.revenue)} highlight />
          <ResultRow label="Profit" value={fmtLKR(result.profit)} />
          <ResultRow label="Gross margin" value={fmtPct(result.margin_pct)} />
          <ResultRow
            label={`Suggested rate (${settings.target_margin_pct}% margin)`}
            value={result.suggested_rate > 0 ? `LKR ${fmt2(result.suggested_rate)}/sqft` : "—"}
          />
        </div>

        <Link
          href="/treatment-suite/batches"
          className="block w-full rounded-lg border-2 border-dashed border-blue-200 py-3 text-center text-sm text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          Ready to dry? → Open KD Batches
        </Link>
      </div>
    </div>
  );
}
