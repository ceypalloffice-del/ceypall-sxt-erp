import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import { computeCosting } from "@/lib/costing";
import { TreatmentQuoteForm } from "@/components/TreatmentQuoteForm";
import { deleteTreatmentQuote } from "@/app/actions/treatment-quotes";

export default async function TreatmentQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: quote } = await supabase.from("treatment_quotes").select("*").eq("id", id).single();
  if (!quote) notFound();

  const [{ data: plankRates }, { data: beamRates }, { data: customers }] = await Promise.all([
    supabase
      .from("plank_treatment_rates")
      .select("id, service, thickness, rate_per_sqft")
      .eq("entity_id", "SXT")
      .eq("active", true),
    supabase
      .from("beam_treatment_rates")
      .select("id, service, height, width, rate_per_lft")
      .eq("entity_id", "SXT")
      .eq("active", true),
    supabase.from("customers").select("id, name").eq("entity_id", "SXT").order("name"),
  ]);

  const subtotal = Number(quote.qty) * Number(quote.rate_used);
  const { profitAmount, finalPrice } = computeCosting(subtotal, Number(quote.margin_pct));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{quote.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {quote.service === "kiln_drying" ? "Kiln Drying" : "Chemical Impregnation"}
          </p>
        </div>
        <Link
          href={`/treatment-quotes/${id}/quotation`}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Generate quotation
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Subtotal</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {formatLKR(subtotal)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Profit ({(Number(quote.margin_pct) * 100).toFixed(0)}%)</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {formatLKR(profitAmount)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Final price</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {formatLKR(finalPrice)}
          </p>
        </Card>
      </div>

      {canEdit && (
        <Card>
          <TreatmentQuoteForm
            quote={quote}
            plankRates={plankRates ?? []}
            beamRates={beamRates ?? []}
            customers={customers ?? []}
          />

          <form action={deleteTreatmentQuote} className="mt-4 border-t border-slate-200 pt-4">
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Delete this quote
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
