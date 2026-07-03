"use client";

import { useState, useMemo } from "react";
import { calcTreatmentChemistry } from "@/lib/cpi-engine/chemistry";
import { calcTreatmentCost } from "@/lib/cpi-engine/costing";
import type { CpiSettings } from "@/lib/cpi-engine/types";
import { createCpiLog } from "@/app/actions/cpi-logs";

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400";

const numCls = "font-mono tabular-nums font-bold text-slate-900";

function lkr(n: number) {
  return `LKR ${Math.round(n).toLocaleString("en-LK")}`;
}

export function CostingClient({ settings }: { settings: CpiSettings }) {
  const [drop, setDrop] = useState(settings.default_tank_drop_in);
  const [boraxPrice, setBoraxPrice] = useState(settings.borax_price_per_kg);
  const [bricPrice, setBricPrice] = useState(settings.boric_price_per_kg);
  const [antiPrice, setAntiPrice] = useState(settings.anti_borer_price_per_l);
  const [labour, setLabour] = useState(settings.labour_cost);
  const [electricity, setElectricity] = useState(settings.electricity_cost);
  const [saved, setSaved] = useState(false);

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
        boraxPrice,
        bricPrice,
        antiPrice,
        labour,
        electricity,
        settings.bf_capacity
      ),
    [chem, boraxPrice, bricPrice, antiPrice, labour, electricity, settings.bf_capacity]
  );

  async function handleSave(formData: FormData) {
    // Inject calculated values that aren't form fields
    formData.set("litres_used", String(chem.litres));
    formData.set("borax_kg", String(chem.borax_kg));
    formData.set("boric_kg", String(chem.boric_kg));
    formData.set("anti_borer_ml", String(chem.anti_borer_ml));
    formData.set("borax_cost", String(cost.borax_cost));
    formData.set("boric_cost", String(cost.boric_cost));
    formData.set("anti_borer_cost", String(cost.anti_borer_cost));
    formData.set("chemical_cost", String(cost.chemical_cost));
    formData.set("labour_cost", String(cost.labour_cost));
    formData.set("electricity_cost", String(cost.electricity_cost));
    formData.set("total_cost", String(cost.total_cost));
    formData.set("cost_per_bf", String(cost.cost_per_bf));
    await createCpiLog(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-8">
      {/* ── Machine Details (fixed) ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-sm font-semibold text-slate-700">
          Machine Details
          <span className="ml-2 text-xs font-normal text-slate-400">
            Fixed — change in Settings
          </span>
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Tank Diameter", `${settings.tank_diameter_in}"`],
            ["Tank Height", `${settings.tank_height_ft} ft`],
            ["Cylinder Dia.", `${settings.cylinder_diameter_in}"`],
            ["Cylinder Length", `${settings.cylinder_length_ft} ft`],
            ["Tray Diameter", `${settings.tray_diameter_in}"`],
            ["Tray Length", `${settings.tray_length_ft} ft`],
            ["Tray Capacity", `${settings.tray_capacity_cuft} cu.ft`],
            ["BF Capacity", `${settings.bf_capacity} BF`],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                {val}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ── Treatment Settings ── */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700">
              Treatment Settings
            </h2>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500">
                Chemical level used (tank drop)
                <span className="ml-1 font-normal text-slate-400">inches</span>
              </label>
              <input
                type="number"
                value={drop}
                onChange={(e) => setDrop(Number(e.target.value))}
                step="0.5"
                min="0.5"
                max="24"
                className={inputCls}
              />
            </div>

            {/* Chemistry result */}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-emerald-50 p-4">
              <div>
                <p className="text-xs text-emerald-600">Litres Used</p>
                <p className={`mt-0.5 text-lg ${numCls}`}>{chem.litres} L</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600">Borax</p>
                <p className={`mt-0.5 text-lg ${numCls}`}>{chem.borax_kg} kg</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600">Boric Acid</p>
                <p className={`mt-0.5 text-lg ${numCls}`}>{chem.boric_kg} kg</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600">Anti Borer</p>
                <p className={`mt-0.5 text-lg ${numCls}`}>
                  {chem.anti_borer_ml} ml
                </p>
              </div>
            </div>
          </div>

          {/* Chemical Prices */}
          <div className="rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700">
              Chemical Prices
              <span className="ml-2 text-xs font-normal text-slate-400">
                Edit to recalculate live
              </span>
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Borax (LKR / kg)",
                  val: boraxPrice,
                  set: setBoraxPrice,
                  step: "10",
                },
                {
                  label: "Boric Acid (LKR / kg)",
                  val: bricPrice,
                  set: setBricPrice,
                  step: "10",
                },
                {
                  label: "Anti Borer (LKR / L)",
                  val: antiPrice,
                  set: setAntiPrice,
                  step: "100",
                },
                {
                  label: "Labour (LKR)",
                  val: labour,
                  set: setLabour,
                  step: "100",
                },
                {
                  label: "Electricity (LKR)",
                  val: electricity,
                  set: setElectricity,
                  step: "100",
                },
              ].map(({ label, val, set, step }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-slate-500">
                    {label}
                  </label>
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => set(Number(e.target.value))}
                    step={step}
                    min="0"
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Cost Summary ── */}
        <div className="rounded-xl border border-emerald-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">
            Cost Summary
          </h2>
          <table className="mt-4 w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {[
                ["Borax", lkr(cost.borax_cost)],
                ["Boric Acid", lkr(cost.boric_cost)],
                ["Anti Borer", lkr(cost.anti_borer_cost)],
                ["— Chemical Cost", lkr(cost.chemical_cost)],
                ["Labour", lkr(cost.labour_cost)],
                ["Electricity", lkr(cost.electricity_cost)],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td
                    className={`py-2 ${label.startsWith("—") ? "font-semibold text-slate-800" : "text-slate-600"}`}
                  >
                    {label.replace("—", "")}
                  </td>
                  <td
                    className={`py-2 text-right font-mono tabular-nums ${label.startsWith("—") ? "font-bold" : ""}`}
                  >
                    {val}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300">
                <td className="py-3 text-base font-bold text-slate-900">
                  Total Treatment Cost
                </td>
                <td className="py-3 text-right font-mono text-base tabular-nums font-bold text-emerald-700">
                  {lkr(cost.total_cost)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-center">
            {[
              ["Cost / BF", `LKR ${cost.cost_per_bf.toFixed(2)}`],
              ["Cost / cu.ft", `LKR ${cost.cost_per_cuft.toFixed(2)}`],
              ["Cost / m³", `LKR ${cost.cost_per_m3.toFixed(2)}`],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-0.5 font-mono text-sm font-bold tabular-nums">
                  {val}
                </p>
              </div>
            ))}
          </div>

          {/* Save log form */}
          <form action={handleSave} className="mt-6 space-y-3 border-t border-slate-100 pt-4">
            <input type="hidden" name="tank_drop_in" value={drop} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Date
                </label>
                <input
                  type="date"
                  name="log_date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Operator (optional)
                </label>
                <input
                  type="text"
                  name="operator"
                  placeholder="Name"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Notes (optional)
              </label>
              <input
                type="text"
                name="notes"
                placeholder="Species, batch details…"
                className={inputCls}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {saved ? "✓ Saved!" : "Save Treatment Log"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
