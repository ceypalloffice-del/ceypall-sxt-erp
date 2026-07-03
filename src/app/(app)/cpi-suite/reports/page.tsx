import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { formatLKR } from "@/lib/format";

export default async function CpiReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const activePeriod = period ?? "monthly";

  const supabase = await createClient();

  // Date range for current period
  const now = new Date();
  const startDate =
    activePeriod === "daily"
      ? now.toISOString().slice(0, 10)
      : activePeriod === "monthly"
      ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
      : `${now.getFullYear()}-01-01`;

  const [logsRes, allLogsRes] = await Promise.all([
    supabase
      .from("cpi_treatment_logs")
      .select("*")
      .gte("log_date", startDate)
      .order("log_date", { ascending: false }),
    supabase
      .from("cpi_treatment_logs")
      .select("*")
      .order("log_date", { ascending: false })
      .limit(100),
  ]);

  const logs = logsRes.data ?? [];
  const allLogs = allLogsRes.data ?? [];

  // Aggregate stats
  const totals = logs.reduce(
    (acc, l) => ({
      treatments: acc.treatments + 1,
      litres: acc.litres + Number(l.litres_used),
      borax_kg: acc.borax_kg + Number(l.borax_kg),
      boric_kg: acc.boric_kg + Number(l.boric_kg),
      anti_borer_ml: acc.anti_borer_ml + Number(l.anti_borer_ml),
      chemical_cost: acc.chemical_cost + Number(l.chemical_cost),
      total_cost: acc.total_cost + Number(l.total_cost),
      board_feet: acc.board_feet + Number(l.board_feet ?? 0),
    }),
    {
      treatments: 0,
      litres: 0,
      borax_kg: 0,
      boric_kg: 0,
      anti_borer_ml: 0,
      chemical_cost: 0,
      total_cost: 0,
      board_feet: 0,
    }
  );

  const avgCostPerBf =
    totals.board_feet > 0 ? totals.total_cost / totals.board_feet : 0;

  const periodLabel =
    activePeriod === "daily"
      ? "Today"
      : activePeriod === "monthly"
      ? `${now.toLocaleString("en-LK", { month: "long" })} ${now.getFullYear()}`
      : `${now.getFullYear()} (Year to Date)`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            CPI Reports — {periodLabel}
          </h1>
        </div>
        <div className="flex gap-2">
          {(["daily", "monthly", "yearly"] as const).map((p) => (
            <a
              key={p}
              href={`?period=${p}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                activePeriod === p
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Treatments", value: String(totals.treatments), unit: "runs" },
          { label: "Chemical Cost", value: formatLKR(totals.chemical_cost), unit: "" },
          { label: "Total Cost", value: formatLKR(totals.total_cost), unit: "" },
          { label: "Avg Cost / BF", value: `LKR ${avgCostPerBf.toFixed(2)}`, unit: "" },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {item.label}
            </p>
            <p className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900">
              {item.value}
            </p>
            {item.unit && (
              <p className="text-xs text-slate-400">{item.unit}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Chemical consumption */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-700">
          Chemical Consumption — {periodLabel}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Litres", `${totals.litres.toFixed(1)} L`],
            ["Borax", `${totals.borax_kg.toFixed(2)} kg`],
            ["Boric Acid", `${totals.boric_kg.toFixed(2)} kg`],
            ["Anti Borer", `${totals.anti_borer_ml.toFixed(0)} ml`],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-slate-900">
                {val}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Log table */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700">
          Treatment Log — {periodLabel}
        </h2>
        <Card className="mt-3 p-0">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No treatments recorded in this period.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Log No.</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Operator</th>
                  <th className="px-4 py-3 text-right font-medium">Drop</th>
                  <th className="px-4 py-3 text-right font-medium">Litres</th>
                  <th className="px-4 py-3 text-right font-medium">Borax (kg)</th>
                  <th className="px-4 py-3 text-right font-medium">Boric (kg)</th>
                  <th className="px-4 py-3 text-right font-medium">Anti Borer</th>
                  <th className="px-4 py-3 text-right font-medium">Chem Cost</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 font-mono tabular-nums text-slate-700">
                      {log.log_no}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(log.log_date).toLocaleDateString("en-LK")}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {log.operator || "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {log.tank_drop_in}&quot;
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {log.litres_used}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {log.borax_kg}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {log.boric_kg}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {log.anti_borer_ml} ml
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {formatLKR(log.chemical_cost)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold">
                      {formatLKR(log.total_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}
