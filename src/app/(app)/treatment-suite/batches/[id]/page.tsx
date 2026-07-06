import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import { computeBatch } from "@/lib/sxt-engine/batch";
import {
  calcElectricityCost,
  calcActualDays,
  formatDuration,
  toColombDatetimeLocal,
} from "@/lib/sxt-engine/cost";
import { SubmitButton } from "@/components/SubmitButton";
import {
  addBatchItem,
  removeBatchItem,
  updateBatchStatus,
  updateBatchTimes,
} from "@/app/actions/sxt-batches";

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

function ColombTime({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-slate-400">—</span>;
  const d = new Date(iso);
  return (
    <span>
      {d.toLocaleString("en-LK", {
        timeZone: "Asia/Colombo",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}
    </span>
  );
}

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);

  const [batchRes, itemsRes, customersRes, settingsRes, plankRes] =
    await Promise.all([
      supabase.from("sxt_batches").select("*").eq("id", id).single(),
      supabase
        .from("sxt_batch_items")
        .select("*, customers(id, name)")
        .eq("batch_id", id)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("customers")
        .select("id, name")
        .eq("entity_id", "SXT")
        .order("name"),
      supabase.from("sxt_settings").select("key, value"),
      supabase
        .from("plank_treatment_rates")
        .select("thickness_mm, service_type, rate_per_sqft")
        .order("thickness_mm"),
    ]);

  const batch = batchRes.data;
  if (!batch) notFound();

  const rawItems = itemsRes.data ?? [];
  const customers = customersRes.data ?? [];
  const settings = Object.fromEntries(
    (settingsRes.data ?? []).map((r) => [r.key, r.value])
  );
  const plankRates = plankRes.data ?? [];
  const isLocked = batch.status === "complete" || batch.status === "cancelled";

  // ── Duration & cost calculation ──────────────────────────────────────────
  const plannedDays = Number(batch.drying_days);

  // Actual elapsed days: uses timestamps when available, else falls back to planned
  const actualDays = batch.started_at
    ? calcActualDays(batch.started_at, batch.completed_at)
    : null;

  // Cost using actual elapsed time (or planned if timing not yet set)
  const daysForCost = actualDays ?? plannedDays;

  const electricitySettings = {
    units_per_day: Number(batch.electricity_units_per_day),
    days: daysForCost,
    rate_per_unit: Number(batch.electricity_rate),
  };

  const plannedElecCost = calcElectricityCost({
    ...electricitySettings,
    days: plannedDays,
  });
  const actualElecCost = calcElectricityCost(electricitySettings);
  const plannedTotalCost = plannedElecCost + Number(batch.labour_cost);
  const actualTotalCost = actualElecCost + Number(batch.labour_cost);

  // ── Engine: compute batch P&L ─────────────────────────────────────────────
  const engineItems = rawItems.map((item) => ({
    id: item.id,
    customer_id: item.customer_id,
    customer_name:
      item.customer_name ||
      (item.customers as { name?: string } | null)?.name ||
      "Walk-in",
    thickness_in: Number(item.thickness_in),
    width_in: Number(item.width_in),
    length_ft: Number(item.length_ft),
    qty: Number(item.qty),
    treatment_type: item.treatment_type,
    rate_per_sqft: Number(item.rate_per_sqft ?? 0),
    notes: item.notes,
  }));

  const result =
    engineItems.length > 0
      ? computeBatch(
          engineItems,
          Number(settings.kiln_capacity_m3 ?? 25),
          electricitySettings,
          Number(batch.labour_cost)
        )
      : null;

  const utilisationPct = result?.kiln.utilisation_pct ?? 0;
  const utilisationColor =
    utilisationPct > 100
      ? "bg-red-500"
      : utilisationPct > 85
      ? "bg-emerald-500"
      : utilisationPct > 50
      ? "bg-blue-500"
      : "bg-amber-400";

  const isInProgress =
    batch.started_at && !batch.completed_at && batch.status === "drying";

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-semibold tabular-nums text-slate-900">
            {batch.batch_no}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <StatusBadge status={batch.status} />
            <span>
              {batch.electricity_units_per_day} kWh/day · LKR{" "}
              {batch.electricity_rate}/kWh
            </span>
          </div>
        </div>
        {canEdit && !isLocked && (
          <div className="flex gap-2">
            {batch.status === "open" && (
              <form action={updateBatchStatus}>
                <input type="hidden" name="batch_id" value={batch.id} />
                <input type="hidden" name="status" value="drying" />
                <button className="rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                  → Start Drying
                </button>
              </form>
            )}
            {batch.status === "drying" && (
              <form action={updateBatchStatus}>
                <input type="hidden" name="batch_id" value={batch.id} />
                <input type="hidden" name="status" value="complete" />
                <button className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
                  ✓ Mark Complete
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Time Tracking ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">
            Treatment Period
          </h2>
          {actualDays != null && (
            <div
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                isInProgress
                  ? "bg-blue-50 text-blue-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {isInProgress ? "⏱ " : ""}
              {formatDuration(actualDays)}
              {isInProgress && " elapsed"}
            </div>
          )}
        </div>

        <form action={updateBatchTimes} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="batch_id" value={batch.id} />

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Kiln loaded — start date &amp; time
            </label>
            <input
              type="datetime-local"
              name="started_at"
              defaultValue={toColombDatetimeLocal(batch.started_at)}
              disabled={!canEdit}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">
              <ColombTime iso={batch.started_at} />
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Kiln unloaded — end date &amp; time
            </label>
            <input
              type="datetime-local"
              name="completed_at"
              defaultValue={toColombDatetimeLocal(batch.completed_at)}
              disabled={!canEdit}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">
              <ColombTime iso={batch.completed_at} />
            </p>
          </div>

          {canEdit && (
            <div className="sm:col-span-2">
              <SubmitButton
                
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                Save times
              </SubmitButton>
              <span className="ml-3 text-xs text-slate-400">
                Times are in Sri Lanka time (UTC+5:30).
              </span>
            </div>
          )}
        </form>

        {/* Planned vs actual cost comparison */}
        {batch.started_at && (
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Planned days</p>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-700">
                {plannedDays}d
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">
                {batch.completed_at ? "Actual duration" : "Elapsed so far"}
              </p>
              <p
                className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                  actualDays! > plannedDays ? "text-amber-600" : "text-emerald-700"
                }`}
              >
                {formatDuration(actualDays!)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Planned elec. cost</p>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-700">
                {formatLKR(plannedElecCost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">
                {batch.completed_at ? "Actual elec. cost" : "Current elec. cost"}
              </p>
              <p
                className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                  actualElecCost > plannedElecCost
                    ? "text-amber-600"
                    : "text-emerald-700"
                }`}
              >
                {formatLKR(actualElecCost)}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ── Kiln capacity bar ── */}
      {result && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">
              Kiln Load
            </span>
            <span
              className={`font-mono text-xl font-bold tabular-nums ${
                utilisationPct > 100 ? "text-red-600" : "text-slate-900"
              }`}
            >
              {utilisationPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${utilisationColor}`}
              style={{ width: `${Math.min(utilisationPct, 100)}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-slate-500 text-xs">Batch volume</p>
              <p className="font-mono font-semibold tabular-nums">
                {result.kiln.batch_m3.toFixed(3)} m³
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Remaining</p>
              <p className="font-mono font-semibold tabular-nums">
                {result.kiln.remaining_m3.toFixed(3)} m³
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Total sqft</p>
              <p className="font-mono font-semibold tabular-nums">
                {result.totals.sqft.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Total LFT</p>
              <p className="font-mono font-semibold tabular-nums">
                {result.totals.lft.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Batch P&L ── */}
      {result && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <p className="text-xs text-slate-500">
              Total cost
              {actualDays != null && (
                <span className="ml-1 text-slate-400">
                  ({formatDuration(actualDays)})
                </span>
              )}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">
              {formatLKR(actualTotalCost)}
            </p>
            <p className="text-xs text-slate-400">
              Elec {formatLKR(actualElecCost)} + Labour{" "}
              {formatLKR(Number(batch.labour_cost))}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Revenue</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">
              {formatLKR(result.totals.revenue)}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Profit</p>
            <p
              className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                result.totals.profit >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {formatLKR(result.totals.profit)}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Margin</p>
            <p
              className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                result.totals.margin_pct >= 0 ? "text-slate-900" : "text-red-600"
              }`}
            >
              {result.totals.margin_pct.toFixed(1)}%
            </p>
          </Card>
        </div>
      )}

      {/* ── Per-customer breakdown ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700">
          Customer Breakdown
        </h2>
        <Card className="mt-3 p-0">
          {result && result.items.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Sqft</th>
                  <th className="px-4 py-3 text-right font-medium">m³</th>
                  <th className="px-4 py-3 text-right font-medium">Rate</th>
                  <th className="px-4 py-3 text-right font-medium">Cost</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium">Profit</th>
                  <th className="px-4 py-3 text-right font-medium">Margin</th>
                  <th className="px-4 py-3 font-medium">Quote</th>
                  {canEdit && !isLocked && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {result.items.map((item, idx) => (
                  <tr
                    key={item.id ?? idx}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {item.display_name}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                      {item.thickness_in}&quot; × {item.width_in}&quot; ×{" "}
                      {item.length_ft}&apos;
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {item.qty}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {item.sqft.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {item.cubic_m3}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {item.rate_per_sqft || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                      {formatLKR(item.allocated_cost)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {item.rate_per_sqft ? formatLKR(item.revenue) : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular-nums ${
                        item.profit >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {item.rate_per_sqft ? formatLKR(item.profit) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500">
                      {item.rate_per_sqft
                        ? `${item.margin_pct.toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {item.id && item.rate_per_sqft ? (
                        <Link
                          href={`/sxt-quote/${id}/${item.id}`}
                          target="_blank"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Print
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    {canEdit && !isLocked && item.id && (
                      <td className="px-4 py-3">
                        <form action={removeBatchItem}>
                          <input type="hidden" name="item_id" value={item.id} />
                          <input type="hidden" name="batch_id" value={id} />
                          <button className="text-xs text-red-400 hover:text-red-600">
                            Remove
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No items in this batch"
                hint="Add customer timber below to start filling the kiln."
              />
            </div>
          )}
        </Card>
      </section>

      {/* ── Add item form ── */}
      {canEdit && !isLocked && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">Add Timber</h2>
          <form
            action={addBatchItem}
            className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <input type="hidden" name="batch_id" value={id} />

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Customer
              </label>
              <select name="customer_id" className={inputCls}>
                <option value="">— Walk-in / manual name —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Walk-in name (overrides selection above)
              </label>
              <input
                name="customer_name"
                placeholder="e.g. ABC Furniture"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Thickness (in)
              </label>
              <input
                type="number"
                name="thickness_in"
                step="0.001"
                min="0.1"
                required
                placeholder="1"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Width (in)
              </label>
              <input
                type="number"
                name="width_in"
                step="0.001"
                min="0.1"
                required
                placeholder="6"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Length (ft)
              </label>
              <input
                type="number"
                name="length_ft"
                step="0.5"
                min="1"
                required
                placeholder="10"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Qty (pieces)
              </label>
              <input
                type="number"
                name="qty"
                step="1"
                min="1"
                required
                placeholder="100"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Treatment
              </label>
              <select name="treatment_type" className={inputCls}>
                <option value="kiln_drying">Kiln Drying</option>
                <option value="impregnation">CPI</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Rate / sqft (LKR)
                {plankRates.length > 0 && (
                  <span className="ml-1 text-slate-400">— see price list</span>
                )}
              </label>
              <input
                type="number"
                name="rate_per_sqft"
                step="0.50"
                min="0"
                placeholder="e.g. 38"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Notes (optional)
              </label>
              <input
                name="item_notes"
                placeholder="Species, grade, delivery date…"
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-4">
              <SubmitButton
                
                className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                Add to batch
              </SubmitButton>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
