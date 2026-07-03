import { createClient } from "@/lib/supabase/server";
import { parseCpiSettings } from "@/lib/cpi-engine/types";
import { calcTreatmentChemistry } from "@/lib/cpi-engine/chemistry";
import { calcTreatmentCost } from "@/lib/cpi-engine/costing";
import { CpiCalculatorClient } from "./CpiCalculatorClient";

export default async function CpiCalculatorPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("cpi_settings").select("key, value");
  const s = parseCpiSettings(data ?? []);

  const chem = calcTreatmentChemistry(
    s.tank_diameter_in,
    s.default_tank_drop_in,
    s.borax_per_100l,
    s.boric_per_100l,
    s.anti_borer_ml_per_100l
  );
  const cost = calcTreatmentCost(
    chem,
    s.borax_price_per_kg,
    s.boric_price_per_kg,
    s.anti_borer_price_per_l,
    s.labour_cost,
    s.electricity_cost,
    s.bf_capacity
  );

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-slate-900">
        CPI Price Calculator
      </h1>
      <CpiCalculatorClient settings={s} costPerBf={cost.cost_per_bf} />
    </div>
  );
}
