import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { parseCpiSettings } from "@/lib/cpi-engine/types";
import { calcTreatmentChemistry } from "@/lib/cpi-engine/chemistry";
import { calcTreatmentCost } from "@/lib/cpi-engine/costing";
import { formatLKR } from "@/lib/format";

export default async function CpiDashboardPage() {
  const supabase = await createClient();

  const [settingsRes, logsRes] = await Promise.all([
    supabase.from("cpi_settings").select("key, value"),
    supabase
      .from("cpi_treatment_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const settings = parseCpiSettings(settingsRes.data ?? []);
  const logs = logsRes.data ?? [];

  // Compute cost metrics using default tank drop
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

  const avgSellingCostPerBf =
    cost.cost_per_bf / (1 - settings.target_margin_pct / 100);
  const grossMargin = settings.target_margin_pct;

  return (
    <div className="space-y-8">
      {/* ── Price snapshot ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Borax / kg",
            value: formatLKR(settings.borax_price_per_kg),
            sub: "current price",
          },
          {
            label: "Boric Acid / kg",
            value: formatLKR(settings.boric_price_per_kg),
            sub: "current price",
          },
          {
            label: "Anti Borer / L",
            value: formatLKR(settings.anti_borer_price_per_l),
            sub: "current price",
          },
          {
            label: "Cost / Treatment",
            value: formatLKR(cost.total_cost),
            sub: `${settings.default_tank_drop_in}" drop`,
          },
          {
            label: "Cost / BF",
            value: `LKR ${cost.cost_per_bf.toFixed(2)}`,
            sub: `${settings.bf_capacity} BF capacity`,
          },
          {
            label: "Avg Selling / BF",
            value: `LKR ${avgSellingCostPerBf.toFixed(2)}`,
            sub: `${grossMargin}% margin target`,
          },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {item.label}
            </p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900">
              {item.value}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{item.sub}</p>
          </Card>
        ))}
      </div>

      {/* ── Cost breakdown ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">
            Treatment Cost Breakdown
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Based on {settings.default_tank_drop_in}&quot; tank drop (
            {chem.litres} L)
          </p>
          <table className="mt-4 w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {[
                [
                  `Borax (${chem.borax_kg} kg × LKR ${settings.borax_price_per_kg}/kg)`,
                  formatLKR(cost.borax_cost),
                ],
                [
                  `Boric Acid (${chem.boric_kg} kg × LKR ${settings.boric_price_per_kg}/kg)`,
                  formatLKR(cost.boric_cost),
                ],
                [
                  `Anti Borer (${chem.anti_borer_ml} ml × LKR ${settings.anti_borer_price_per_l}/L)`,
                  formatLKR(cost.anti_borer_cost),
                ],
                ["Labour", formatLKR(cost.labour_cost)],
                ["Electricity", formatLKR(cost.electricity_cost)],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td className="py-2 text-slate-600">{label}</td>
                  <td className="py-2 text-right font-mono tabular-nums font-semibold">
                    {val}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300">
                <td className="py-2 font-bold text-slate-900">Total</td>
                <td className="py-2 text-right font-mono tabular-nums font-bold text-slate-900">
                  {formatLKR(cost.total_cost)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-center text-xs">
            <div>
              <p className="text-slate-500">Per BF</p>
              <p className="mt-0.5 font-mono font-bold tabular-nums">
                LKR {cost.cost_per_bf.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Per cu.ft</p>
              <p className="mt-0.5 font-mono font-bold tabular-nums">
                LKR {cost.cost_per_cuft.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Per m³</p>
              <p className="mt-0.5 font-mono font-bold tabular-nums">
                LKR {cost.cost_per_m3.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        {/* Quick links */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">
            CPI Suite Modules
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              {
                href: "/cpi-suite/costing",
                label: "Treatment Costing",
                desc: "Full cost breakdown per treatment run",
              },
              {
                href: "/cpi-suite/calculator",
                label: "Price Calculator",
                desc: "Quote any size instantly",
              },
              {
                href: "/cpi-suite/price-lists",
                label: "Price Lists",
                desc: "Standard plank & beam rates",
              },
              {
                href: "/cpi-suite/chemical-calc",
                label: "Chemical Calc",
                desc: "Quantities from tank drop",
              },
              {
                href: "/cpi-suite/competitors",
                label: "Competitors",
                desc: "Price comparison",
              },
              {
                href: "/cpi-suite/reports",
                label: "Reports",
                desc: "Daily / monthly history",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg border border-slate-200 p-3 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
              >
                <p className="text-sm font-semibold text-slate-800">
                  {item.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Recent treatment logs ── */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Recent Treatment Logs
          </h2>
          <Link
            href="/cpi-suite/reports"
            className="text-xs text-emerald-600 hover:underline"
          >
            View all →
          </Link>
        </div>
        <Card className="mt-3 p-0">
          {logs.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Log No.</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Operator</th>
                  <th className="px-4 py-3 text-right font-medium">Drop</th>
                  <th className="px-4 py-3 text-right font-medium">Litres</th>
                  <th className="px-4 py-3 text-right font-medium">Chem Cost</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Cost/BF</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-2 font-mono tabular-nums text-slate-700">
                      {log.log_no}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(log.log_date).toLocaleDateString("en-LK")}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {log.operator || "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {log.tank_drop_in}&quot;
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {log.litres_used} L
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {formatLKR(log.chemical_cost)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold">
                      {formatLKR(log.total_cost)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-500">
                      {log.cost_per_bf
                        ? `LKR ${Number(log.cost_per_bf).toFixed(2)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                No treatment logs yet
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Save your first treatment run in{" "}
                <Link
                  href="/cpi-suite/costing"
                  className="text-emerald-600 hover:underline"
                >
                  Treatment Costing
                </Link>
                .
              </p>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
