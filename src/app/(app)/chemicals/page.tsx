import { createClient } from "@/lib/supabase/server";
import { formatLKR } from "@/lib/format";
import { ActionForms } from "./ActionForms";

const MOVEMENT_LABELS: Record<string, string> = {
  purchase:      "Purchase",
  cpi_treatment: "CPI Treatment",
  pallet_use:    "Pallet Use",
  tank_fill:     "Tank Fill",
  adjustment:    "Adjustment",
  opening:       "Opening Balance",
};

const MOVEMENT_COLORS: Record<string, string> = {
  purchase:      "bg-emerald-50 text-emerald-700",
  cpi_treatment: "bg-blue-50 text-blue-700",
  pallet_use:    "bg-violet-50 text-violet-700",
  tank_fill:     "bg-orange-50 text-orange-700",
  adjustment:    "bg-amber-50 text-amber-700",
  opening:       "bg-slate-50 text-slate-600",
};

function fmtQty(qty: number, unit: string): string {
  if (unit === "L") return `${qty.toFixed(2)} L`;
  return `${qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(1)} ${unit}`;
}

export default async function ChemicalsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: filterType } = await searchParams;
  const supabase = await createClient();

  const [stockRes, movementsRes, productsRes] = await Promise.all([
    supabase
      .from("chemical_stock_on_hand")
      .select("*")
      .order("sort_order"),
    supabase
      .from("chemical_movements")
      .select("*, chemical_products(name, unit)")
      .order("movement_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("chemical_products")
      .select("id, name, unit, pack_sizes")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const stock     = stockRes.data ?? [];
  const allMoves  = movementsRes.data ?? [];
  const products  = productsRes.data ?? [];

  // Attach current stock_qty for usage form hints
  const productsWithStock = products.map((p) => ({
    ...p,
    pack_sizes: p.pack_sizes as string[],
    stock_qty: Number(stock.find((s) => s.id === p.id)?.stock_qty ?? 0),
  }));

  const movements = filterType
    ? allMoves.filter((m) => m.movement_type === filterType)
    : allMoves;

  const filterTypes = [
    { value: "",              label: "All" },
    { value: "purchase",      label: "Purchases" },
    { value: "cpi_treatment", label: "CPI Treatment" },
    { value: "pallet_use",    label: "Pallet Use" },
    { value: "tank_fill",     label: "Tank Fill" },
    { value: "adjustment",    label: "Adjustments" },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Chemical Stock</h1>
        <p className="mt-1 text-sm text-slate-500">
          Central stock management for Borax, Boric Acid and Anti Borer — shared across CPI treatments and pallet manufacturing.
        </p>
      </div>

      {/* ── Stock overview cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stock.length === 0 ? (
          <p className="col-span-3 text-sm text-slate-400">
            Run migration <code>13_chemical_stock.sql</code> in Supabase to activate this module.
          </p>
        ) : (
          stock.map((item) => {
            const qty = Number(item.stock_qty);
            const isLow = item.is_low_stock as boolean;
            return (
              <div
                key={item.id as string}
                className={`rounded-xl border p-5 ${
                  isLow
                    ? "border-red-200 bg-red-50"
                    : "border-slate-200 bg-white"
                } shadow-sm`}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-slate-700">{item.name as string}</p>
                  {isLow && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Low Stock
                    </span>
                  )}
                </div>
                <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-slate-900">
                  {fmtQty(qty, item.unit as string)}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Threshold: {fmtQty(Number(item.low_stock_threshold), item.unit as string)}
                  </span>
                  {item.avg_cost_per_unit != null && (
                    <span className="font-mono tabular-nums">
                      Avg {formatLKR(Number(item.avg_cost_per_unit))}/{item.unit as string}
                    </span>
                  )}
                </div>
                {qty < 0 && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    ⚠ Negative stock — check for missing purchase records
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Action forms ── */}
      {productsWithStock.length > 0 && <ActionForms products={productsWithStock} />}

      {/* ── Movement history ── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-sm font-semibold text-slate-700">Movement History</h2>
          {filterTypes.map((f) => (
            <a
              key={f.value}
              href={f.value ? `?type=${f.value}` : "?"}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                (filterType ?? "") === f.value
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {movements.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-600">No movements yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Use &ldquo;Receive Stock&rdquo; to log your first chemical purchase.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Chemical</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Cost/Unit</th>
                  <th className="px-4 py-3 text-right font-medium">Total Cost</th>
                  <th className="px-4 py-3 font-medium">Pack</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const qty  = Number(m.quantity);
                  const prod = m.chemical_products as { name: string; unit: string } | null;
                  const unit = prod?.unit ?? "";
                  const isIn = qty > 0;
                  return (
                    <tr key={m.id as string} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2 font-mono tabular-nums text-slate-600">
                        {new Date(m.movement_date as string).toLocaleDateString("en-LK")}
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {prod?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            MOVEMENT_COLORS[m.movement_type as string] ?? "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {MOVEMENT_LABELS[m.movement_type as string] ?? m.movement_type}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-mono tabular-nums font-semibold ${
                          isIn ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {isIn ? "+" : ""}
                        {fmtQty(qty, unit)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-500">
                        {m.unit_cost != null
                          ? `LKR ${Number(m.unit_cost).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">
                        {m.total_cost != null ? formatLKR(Number(m.total_cost)) : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {m.pack_size
                          ? `${m.packs_count ?? ""}× ${m.pack_size}`.trim()
                          : "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs tabular-nums text-slate-600">
                        {(m.reference_no as string) || "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-400">
                        {(m.notes as string) || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
