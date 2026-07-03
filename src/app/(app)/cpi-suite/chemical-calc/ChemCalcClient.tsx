"use client";

import { useState, useMemo } from "react";
import { calcTreatmentChemistry } from "@/lib/cpi-engine/chemistry";
import { calcTreatmentCost } from "@/lib/cpi-engine/costing";
import type { CpiSettings } from "@/lib/cpi-engine/types";

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400";

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-right">
        <span className="font-mono text-sm font-bold tabular-nums text-slate-900">{value}</span>
        {sub && <span className="ml-2 text-xs text-slate-400">{sub}</span>}
      </span>
    </div>
  );
}

export function ChemCalcClient({ settings }: { settings: CpiSettings }) {
  const [drop, setDrop] = useState(settings.default_tank_drop_in);

  const chem = useMemo(
    () =>
      calcTreatmentChemistry(
        settings.tank_diameter_in,
        drop,
        settings.borax_per_100l,
        settings.boric_per_100l,
        settings.anti_borer_ml_per_100l
      ),
    [settings, drop]
  );

  const cost = useMemo(
    () =>
      calcTreatmentCost(
        chem,
        settings.borax_price_per_kg,
        settings.boric_price_per_kg,
        settings.anti_borer_price_per_l,
        settings.labour_cost,
        settings.electricity_cost,
        settings.bf_capacity
      ),
    [chem, settings]
  );

  const lkr = (n: number) => `LKR ${Math.round(n).toLocaleString("en-LK")}`;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Chemical Calculator
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter a tank drop reading to get instant chemical quantities and costs.
        </p>
      </div>

      {/* Input */}
      <div className="rounded-xl border border-slate-200 p-5">
        <label className="block text-sm font-medium text-slate-700">
          Tank drop (chemical level used)
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="number"
            value={drop}
            onChange={(e) => setDrop(Number(e.target.value))}
            step="0.5"
            min="0.5"
            max="24"
            className={`${inputCls} text-2xl font-bold`}
          />
          <span className="text-lg font-semibold text-slate-400">inches</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Tank diameter: {settings.tank_diameter_in}&quot; — adjust drop reading from the tank gauge
        </p>
      </div>

      {/* Chemistry output */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
        <h2 className="mb-3 text-sm font-semibold text-emerald-800">
          Solution
        </h2>
        <div className="space-y-2">
          <Row label="Litres Used" value={`${chem.litres} L`} />
          <Row
            label={`Borax (${settings.borax_per_100l} kg / 100 L)`}
            value={`${chem.borax_kg} kg`}
            sub={`→ ${lkr(cost.borax_cost)}`}
          />
          <Row
            label={`Boric Acid (${settings.boric_per_100l} kg / 100 L)`}
            value={`${chem.boric_kg} kg`}
            sub={`→ ${lkr(cost.boric_cost)}`}
          />
          <Row
            label={`Anti Borer (${settings.anti_borer_ml_per_100l} ml / 100 L)`}
            value={`${chem.anti_borer_ml} ml`}
            sub={`→ ${lkr(cost.anti_borer_cost)}`}
          />
        </div>
      </div>

      {/* Cost summary */}
      <div className="rounded-xl border border-slate-200 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Treatment Cost
        </h2>
        <div className="space-y-2">
          <Row
            label="Chemical Cost"
            value={lkr(cost.chemical_cost)}
          />
          <Row label="Labour" value={lkr(cost.labour_cost)} />
          <Row label="Electricity" value={lkr(cost.electricity_cost)} />
          <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-white">
            <span className="text-sm font-semibold">Total Treatment Cost</span>
            <span className="font-mono text-lg font-bold tabular-nums">
              {lkr(cost.total_cost)}
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          {[
            ["Per BF", `LKR ${cost.cost_per_bf.toFixed(2)}`],
            ["Per cu.ft", `LKR ${cost.cost_per_cuft.toFixed(2)}`],
            ["Per m³", `LKR ${cost.cost_per_m3.toFixed(2)}`],
          ].map(([label, val]) => (
            <div key={label} className="rounded-md bg-slate-100 p-2">
              <p className="text-slate-500">{label}</p>
              <p className="mt-0.5 font-mono font-bold tabular-nums">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
