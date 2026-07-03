import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { formatLKR, formatDate } from "@/lib/format";
import type { SxtSettings } from "@/lib/sxt-engine/types";

async function getSettings(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("sxt_settings").select("key, value");
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return map as Record<string, string>;
}

export default async function TreatmentSuiteDashboard() {
  const supabase = await createClient();

  const [settings, batchesRes, quotesRes] = await Promise.all([
    getSettings(supabase),
    supabase
      .from("sxt_batches")
      .select("id, batch_no, status, created_at, drying_days, electricity_rate")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("treatment_quotes")
      .select("id, quote_no, created_at, total_amount, status")
      .eq("entity_id", "SXT")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const batches = batchesRes.data ?? [];
  const quotes = quotesRes.data ?? [];
  const openBatches = batches.filter((b) => b.status === "open" || b.status === "drying").length;

  const elecRate = Number(settings.electricity_rate ?? 45);
  const elecUnits = Number(settings.electricity_units_per_day ?? 125);
  const dryingDays = Number(settings.drying_days ?? 10);
  const targetMargin = Number(settings.target_margin_pct ?? 40);
  const batchElecCost = elecRate * elecUnits * dryingDays;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            STX Timber Treatment Suite
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kiln Drying — Version 1.0
          </p>
        </div>
        <Link
          href="/treatment-suite/batches"
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          + New Batch
        </Link>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Electricity / batch
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-slate-900">
            {formatLKR(batchElecCost)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {elecUnits} kWh × {dryingDays} days × {elecRate} LKR
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Target Margin
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-slate-900">
            {targetMargin}%
          </p>
          <p className="mt-1 text-xs text-slate-400">Gross margin goal</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Open Batches
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-slate-900">
            {openBatches}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Active kiln loads
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Recent Quotes
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-slate-900">
            {quotes.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Last 5 quotations</p>
        </Card>
      </div>

      {/* Recent batches */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Recent Batches</h2>
          <Link href="/treatment-suite/batches" className="text-xs text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        <Card className="mt-3 p-0">
          {batches.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No batches yet"
                hint="Create a batch to start loading customer timber into the kiln."
              />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono tabular-nums text-blue-700">
                      <Link href={`/treatment-suite/batches/${b.id}`} className="hover:underline">
                        {b.batch_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {/* Recent individual quotes */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Recent Quotations</h2>
          <Link href="/treatment-quotes" className="text-xs text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        <Card className="mt-3 p-0">
          {quotes.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No quotations yet" hint="Individual treatment quotes appear here." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Quote</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-900">{q.quote_no}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {q.total_amount != null ? formatLKR(Number(q.total_amount)) : "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
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
