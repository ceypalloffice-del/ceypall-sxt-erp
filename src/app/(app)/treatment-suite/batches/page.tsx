import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { createBatch } from "@/app/actions/sxt-batches";

export default async function BatchesPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);

  const { data } = await supabase
    .from("sxt_batches")
    .select("id, batch_no, status, started_at, completed_at, drying_days, electricity_units_per_day, electricity_rate, labour_cost, created_at")
    .order("created_at", { ascending: false });

  const batches = data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">KD Batches</h1>
          <p className="mt-1 text-sm text-slate-500">
            Each batch is one kiln load, shared across multiple customers.
          </p>
        </div>
        {canEdit && (
          <form action={createBatch}>
            <button
              type="submit"
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              + New Batch
            </button>
          </form>
        )}
      </div>

      {batches.length === 0 ? (
        <EmptyState
          title="No batches yet"
          hint='Click "+ New Batch" to start loading customer timber into the kiln.'
        />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Batch</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 text-right font-medium">Days</th>
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
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{b.started_at ? formatDate(b.started_at) : "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{b.completed_at ? formatDate(b.completed_at) : "—"}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">{b.drying_days}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
