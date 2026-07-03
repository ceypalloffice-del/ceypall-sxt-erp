import { createClient } from "@/lib/supabase/server";
import { CalculatorClient } from "./CalculatorClient";
import type { SxtSettings } from "@/lib/sxt-engine/types";

export default async function CalculatorPage() {
  const supabase = await createClient();

  const [settingsRes, plankRes, beamRes] = await Promise.all([
    supabase.from("sxt_settings").select("key, value"),
    supabase
      .from("plank_treatment_rates")
      .select("thickness_mm, service_type, rate_per_sqft")
      .order("thickness_mm"),
    supabase
      .from("beam_treatment_rates")
      .select("width_mm, height_mm, service_type, rate_per_sqft")
      .order("width_mm")
      .order("height_mm"),
  ]);

  const raw = Object.fromEntries(
    (settingsRes.data ?? []).map((r) => [r.key, r.value])
  );

  const settings: SxtSettings = {
    kiln_capacity_m3: Number(raw.kiln_capacity_m3 ?? 25),
    kiln_length_ft: Number(raw.kiln_length_ft ?? 20),
    kiln_width_ft: Number(raw.kiln_width_ft ?? 8),
    kiln_height_ft: Number(raw.kiln_height_ft ?? 8),
    electricity_units_per_day: Number(raw.electricity_units_per_day ?? 125),
    electricity_rate: Number(raw.electricity_rate ?? 45),
    drying_days: Number(raw.drying_days ?? 10),
    sticker_thickness_in: Number(raw.sticker_thickness_in ?? 0.75),
    target_margin_pct: Number(raw.target_margin_pct ?? 40),
    labour_cost_per_batch: Number(raw.labour_cost_per_batch ?? 5000),
    company_name: raw.company_name ?? "St. Xavier Timber",
    company_address: raw.company_address ?? "",
    company_phone: raw.company_phone ?? "",
    quotation_terms: raw.quotation_terms ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Timber Calculator</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter dimensions to instantly calculate measurements, kiln capacity,
          cost, and pricing.
        </p>
      </div>
      <CalculatorClient
        settings={settings}
        plankRates={plankRes.data ?? []}
        beamRates={beamRes.data ?? []}
      />
    </div>
  );
}
