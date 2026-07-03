import { createClient } from "@/lib/supabase/server";
import { parseCpiSettings } from "@/lib/cpi-engine/types";
import { calcTreatmentChemistry } from "@/lib/cpi-engine/chemistry";
import { calcTreatmentCost } from "@/lib/cpi-engine/costing";
import { calcBoardFeet, calcAutoRatePerBf } from "@/lib/cpi-engine/pricing";
import { updateCpiPriceRow } from "@/app/actions/cpi-price-lists";
import { canKeepBooks, getProfile } from "@/lib/session";
import { PrintButton } from "./PrintButton";

const inputCls =
  "w-24 rounded border border-slate-200 px-2 py-1 text-right text-xs font-mono tabular-nums focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400";

function lkr(n: number) {
  return `LKR ${Math.round(n).toLocaleString("en-LK")}`;
}

type PriceRow = {
  id: string;
  size_label: string;
  item_type: string;
  thickness_in: number;
  width_in: number;
  standard_length_ft: number;
  manual_chemical_per_piece: number | null;
  manual_kiln_per_piece: number | null;
  manual_both_per_piece: number | null;
  sort_order: number;
};

function PriceTable({
  rows,
  autoRatePerBf,
  pricingMode,
  canEdit,
}: {
  rows: PriceRow[];
  autoRatePerBf: number;
  pricingMode: "auto" | "manual";
  canEdit: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="pb-3 pr-4 font-medium">Size (T × W)</th>
            <th className="pb-3 pr-4 text-right font-medium">BF / pc</th>
            <th className="pb-3 pr-4 text-right font-medium">Auto rate / BF</th>
            <th className="pb-3 pr-4 text-right font-medium">
              Chemical
              <span className="ml-1 text-slate-400 font-normal">(per pc)</span>
            </th>
            <th className="pb-3 pr-4 text-right font-medium">
              Kiln
              <span className="ml-1 text-slate-400 font-normal">(per pc)</span>
            </th>
            <th className="pb-3 text-right font-medium">
              Both
              <span className="ml-1 text-slate-400 font-normal">(per pc)</span>
            </th>
            {canEdit && <th className="pb-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const bf = calcBoardFeet(
              row.thickness_in,
              row.width_in,
              row.standard_length_ft
            );
            const autoChem = Math.round(bf * autoRatePerBf);
            const chemPrice =
              pricingMode === "auto" || row.manual_chemical_per_piece === null
                ? autoChem
                : row.manual_chemical_per_piece;

            return (
              <tr key={row.id} className="group">
                <td className="py-2.5 pr-4 font-mono text-slate-800">
                  {row.thickness_in}&quot; × {row.width_in}&quot;
                  <span className="ml-2 text-xs text-slate-400">
                    × {row.standard_length_ft}ft
                  </span>
                  {pricingMode === "manual" && row.manual_chemical_per_piece !== null && (
                    <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-600 font-medium">
                      manual
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-slate-500">
                  {bf}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-slate-400 text-xs">
                  LKR {autoRatePerBf.toFixed(2)}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                  {lkr(chemPrice)}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-slate-600">
                  {row.manual_kiln_per_piece !== null
                    ? lkr(row.manual_kiln_per_piece)
                    : "—"}
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                  {row.manual_both_per_piece !== null
                    ? lkr(row.manual_both_per_piece)
                    : row.manual_kiln_per_piece !== null
                    ? lkr(chemPrice + row.manual_kiln_per_piece)
                    : "—"}
                </td>
                {canEdit && (
                  <td className="py-2.5 pl-4">
                    <details className="relative">
                      <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600 list-none">
                        Edit ›
                      </summary>
                      <form
                        action={updateCpiPriceRow}
                        className="absolute right-0 top-6 z-10 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <p className="mb-3 text-xs font-semibold text-slate-600">
                          {row.thickness_in}&quot; × {row.width_in}&quot; overrides
                        </p>
                        <div className="space-y-2">
                          {[
                            {
                              name: "manual_chemical_per_piece",
                              label: "Chemical (LKR)",
                              val: row.manual_chemical_per_piece,
                            },
                            {
                              name: "manual_kiln_per_piece",
                              label: "Kiln (LKR)",
                              val: row.manual_kiln_per_piece,
                            },
                            {
                              name: "manual_both_per_piece",
                              label: "Both (LKR)",
                              val: row.manual_both_per_piece,
                            },
                          ].map(({ name, label, val }) => (
                            <div key={name} className="flex items-center justify-between gap-3">
                              <label className="text-xs text-slate-500">
                                {label}
                              </label>
                              <input
                                type="number"
                                name={name}
                                defaultValue={val ?? ""}
                                step="10"
                                min="0"
                                placeholder="auto"
                                className={inputCls}
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="submit"
                          className="mt-3 w-full rounded-md bg-emerald-700 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          Save
                        </button>
                        <p className="mt-2 text-[10px] text-slate-400">
                          Leave blank to use auto-calculated price
                        </p>
                      </form>
                    </details>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function CpiPriceListsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "beam" ? "beam" : "plank";

  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);

  const [settingsRes, listRes] = await Promise.all([
    supabase.from("cpi_settings").select("key, value"),
    supabase
      .from("cpi_price_lists")
      .select("*")
      .eq("item_type", activeTab)
      .order("sort_order"),
  ]);

  const settings = parseCpiSettings(settingsRes.data ?? []);
  const rows: PriceRow[] = (listRes.data ?? []).map((r) => ({
    ...r,
    thickness_in: Number(r.thickness_in),
    width_in: Number(r.width_in),
    standard_length_ft: Number(r.standard_length_ft),
    manual_chemical_per_piece:
      r.manual_chemical_per_piece !== null
        ? Number(r.manual_chemical_per_piece)
        : null,
    manual_kiln_per_piece:
      r.manual_kiln_per_piece !== null
        ? Number(r.manual_kiln_per_piece)
        : null,
    manual_both_per_piece:
      r.manual_both_per_piece !== null
        ? Number(r.manual_both_per_piece)
        : null,
  }));

  const chem = calcTreatmentChemistry(
    settings.tank_diameter_in,
    settings.default_tank_drop_in,
    settings.borax_per_100l,
    settings.boric_per_100l,
    settings.anti_borer_ml_per_100l
  );
  const cost = calcTreatmentCost(
    chem,
    settings.borax_price_per_kg,
    settings.boric_price_per_kg,
    settings.anti_borer_price_per_l,
    settings.labour_cost,
    settings.electricity_cost,
    settings.bf_capacity
  );
  const autoRatePerBf = calcAutoRatePerBf(cost.cost_per_bf, settings.target_margin_pct);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Price Lists</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Mode:{" "}
            <span
              className={`font-semibold ${settings.pricing_mode === "manual" ? "text-amber-600" : "text-emerald-600"}`}
            >
              {settings.pricing_mode}
            </span>
            {" · "}
            Auto rate: LKR {autoRatePerBf.toFixed(2)} / BF
            {" · "}
            {settings.target_margin_pct}% margin target
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(["plank", "beam"] as const).map((t) => (
          <a
            key={t}
            href={`?tab=${t}`}
            className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === t
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {t}s
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <PriceTable
          rows={rows}
          autoRatePerBf={autoRatePerBf}
          pricingMode={settings.pricing_mode}
          canEdit={canEdit}
        />
      </div>

      <p className="text-xs text-slate-400 print:block">
        Prices shown for {activeTab}s at {rows[0]?.standard_length_ft ?? 10}ft
        standard length · Chemical treatment (CPI) · Generated from live cost
        settings
      </p>
    </div>
  );
}
