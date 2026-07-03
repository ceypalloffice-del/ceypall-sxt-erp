import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { EmptyState } from "@/components/ui";
import { TreatmentRatesView } from "@/components/TreatmentRatesView";

export default async function TreatmentRatesPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);
  const activeEntity = await getActiveEntity(profile);

  if (activeEntity === "CPL") {
    return (
      <EmptyState
        title="Not available for CeyPall"
        hint="Timber treatment rates are an SXT-only operation. Switch entity to view them."
      />
    );
  }

  const [{ data: plankRates }, { data: beamRates }] = await Promise.all([
    supabase
      .from("plank_treatment_rates")
      .select("id, service, thickness, rate_per_sqft, active")
      .eq("entity_id", "SXT")
      .order("thickness"),
    supabase
      .from("beam_treatment_rates")
      .select("id, service, height, width, rate_per_lft, active")
      .eq("entity_id", "SXT")
      .order("height")
      .order("width"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Timber treatment rates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kiln drying and chemical impregnation pricing by plank thickness and beam dimension.
        </p>
      </div>

      <TreatmentRatesView plankRates={plankRates ?? []} beamRates={beamRates ?? []} canEdit={canEdit} />
    </div>
  );
}
