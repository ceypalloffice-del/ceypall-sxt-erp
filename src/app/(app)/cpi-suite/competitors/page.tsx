import { createClient } from "@/lib/supabase/server";
import { parseCpiSettings } from "@/lib/cpi-engine/types";
import { calcTreatmentChemistry } from "@/lib/cpi-engine/chemistry";
import { calcTreatmentCost } from "@/lib/cpi-engine/costing";
import { calcBoardFeet, calcAutoRatePerBf } from "@/lib/cpi-engine/pricing";
import { upsertCpiCompetitorPrice } from "@/app/actions/cpi-price-lists";
import { canKeepBooks, getProfile } from "@/lib/session";
import { SubmitButton } from "@/components/SubmitButton";

function diffBadge(stx: number, comp: number) {
  const pct = ((comp - stx) / comp) * 100;
  if (pct > 5)
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        ▼ {pct.toFixed(0)}% cheaper
      </span>
    );
  if (pct >= -5)
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-600">
        ≈ within 5%
      </span>
    );
  return (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
      ▲ {Math.abs(pct).toFixed(0)}% more exp.
    </span>
  );
}

export default async function CpiCompetitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "beam" ? "beam" : "plank";

  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);

  const [settingsRes, listRes, compRes, compPricesRes] = await Promise.all([
    supabase.from("cpi_settings").select("key, value"),
    supabase
      .from("cpi_price_lists")
      .select("id, size_label, thickness_in, width_in, standard_length_ft, manual_chemical_per_piece")
      .eq("item_type", activeTab)
      .order("sort_order"),
    supabase.from("sxt_competitors").select("id, name").eq("active", true).order("name"),
    supabase
      .from("cpi_competitor_prices")
      .select("competitor_id, size_label, item_type, chemical_per_piece")
      .eq("item_type", activeTab),
  ]);

  const settings = parseCpiSettings(settingsRes.data ?? []);
  const items = listRes.data ?? [];
  const competitors = compRes.data ?? [];
  const compPrices = compPricesRes.data ?? [];

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

  // Build price lookup: competitorId → sizeLabel → price
  const compPriceLookup = new Map<string, number>();
  compPrices.forEach((p) => {
    compPriceLookup.set(`${p.competitor_id}::${p.size_label}`, Number(p.chemical_per_piece));
  });

  const lkr = (n: number) => `LKR ${Math.round(n).toLocaleString("en-LK")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Competitor Comparison
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">
          CPI treatment prices per piece at {items[0] ? Number((items[0] as {standard_length_ft: number}).standard_length_ft) : 10}ft standard length
        </p>
      </div>

      {/* Tab */}
      <div className="flex gap-2">
        {(["plank", "beam"] as const).map((t) => (
          <a
            key={t}
            href={`?tab=${t}`}
            className={`rounded-md px-4 py-2 text-sm font-medium capitalize ${
              activeTab === t
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {t}s
          </a>
        ))}
      </div>

      {competitors.length === 0 ? (
        <div className="rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">No competitors added yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Add competitors in the KD Suite → then enter their CPI prices below.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 text-right font-medium">STX</th>
                {competitors.map((c) => (
                  <th key={c.id} className="px-4 py-3 text-right font-medium">
                    {c.name}
                  </th>
                ))}
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const bf = calcBoardFeet(
                  Number(item.thickness_in),
                  Number(item.width_in),
                  Number(item.standard_length_ft)
                );
                const stxPrice =
                  settings.pricing_mode === "auto" || item.manual_chemical_per_piece === null
                    ? Math.round(bf * autoRatePerBf)
                    : Number(item.manual_chemical_per_piece);

                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-slate-700">
                      {Number(item.thickness_in)}&quot; × {Number(item.width_in)}&quot;
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {lkr(stxPrice)}
                    </td>
                    {competitors.map((c) => {
                      const cp = compPriceLookup.get(`${c.id}::${item.size_label}`);
                      return (
                        <td
                          key={c.id}
                          className="px-4 py-2.5 text-right font-mono tabular-nums"
                        >
                          {cp !== undefined ? lkr(cp) : "—"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5">
                      {competitors.some(
                        (c) =>
                          compPriceLookup.has(`${c.id}::${item.size_label}`)
                      )
                        ? (() => {
                            const prices = competitors
                              .map((c) =>
                                compPriceLookup.get(`${c.id}::${item.size_label}`)
                              )
                              .filter((p): p is number => p !== undefined);
                            const lowestComp = Math.min(...prices);
                            return diffBadge(stxPrice, lowestComp);
                          })()
                        : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add competitor price */}
      {canEdit && competitors.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700">
            Add / Update Competitor Price
          </h2>
          <form action={upsertCpiCompetitorPrice} className="mt-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Competitor
              </label>
              <select
                name="competitor_id"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                {competitors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Size
              </label>
              <select
                name="size_label"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                {items.map((item) => (
                  <option key={item.id} value={item.size_label}>
                    {Number(item.thickness_in)}&quot; × {Number(item.width_in)}&quot;
                  </option>
                ))}
              </select>
            </div>
            <input type="hidden" name="item_type" value={activeTab} />
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Their price (LKR / piece)
              </label>
              <input
                type="number"
                name="chemical_per_piece"
                step="10"
                min="0"
                placeholder="e.g. 250"
                className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              />
            </div>
            <SubmitButton
              
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
              Save
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
