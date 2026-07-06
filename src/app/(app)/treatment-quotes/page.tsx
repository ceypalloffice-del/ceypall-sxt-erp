import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import { computeCosting } from "@/lib/costing";
import { createTreatmentQuote } from "@/app/actions/treatment-quotes";
import { SubmitButton } from "@/components/SubmitButton";

const SERVICE_LABEL: Record<string, string> = {
  kiln_drying: "Kiln Drying",
  impregnation: "Chemical Impregnation",
};

export default async function TreatmentQuotesPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);
  const activeEntity = await getActiveEntity(profile);

  if (activeEntity === "CPL") {
    return (
      <EmptyState
        title="Not available for CeyPall"
        hint="Timber treatment quotes are an SXT-only operation. Switch entity to view them."
      />
    );
  }

  const { data: quotes } = await supabase
    .from("treatment_quotes")
    .select("id, name, service, item_kind, thickness, height, width, qty, rate_used, margin_pct, customers(name)")
    .eq("entity_id", "SXT")
    .order("created_at", { ascending: false });

  const rows = quotes ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Treatment quotes</h1>
        <p className="mt-1 text-sm text-slate-500">Kiln drying and chemical impregnation job costings.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No treatment quotes yet" hint="Create one below to start costing." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Quote</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Spec</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Margin</th>
                <th className="px-4 py-3 text-right font-medium">Final price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => {
                const subtotal = Number(q.qty) * Number(q.rate_used);
                const { finalPrice } = computeCosting(subtotal, Number(q.margin_pct));
                const spec = q.item_kind === "plank" ? q.thickness : `${q.height} x ${q.width}`;
                return (
                  <tr key={q.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">
                      <Link href={`/treatment-quotes/${q.id}`} className="underline-offset-2 hover:underline">
                        {q.name}
                      </Link>
                    </td>
                    {/* @ts-expect-error -- joined relation shape */}
                    <td className="px-4 py-3 text-slate-500">{q.customers?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{SERVICE_LABEL[q.service] ?? q.service}</td>
                    <td className="px-4 py-3 text-slate-500">{spec ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500">
                      {q.qty} {q.item_kind === "plank" ? "sqft" : "LFT"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500">
                      {(Number(q.margin_pct) * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatLKR(finalPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {canEdit && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">New treatment quote</h2>
          <form action={createTreatmentQuote} className="mt-3 flex gap-3">
            <input
              name="name"
              placeholder="e.g. Acme Pallets - Rubber Planks"
              required
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            />
            <SubmitButton
              
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
              Create
            </SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
