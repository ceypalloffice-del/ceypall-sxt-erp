import type { ChemistryResult, CostResult } from "./types";

function r2(n: number) {
  return Math.round(n * 100) / 100;
}
function r4(n: number) {
  return Math.round(n * 10000) / 10000;
}

/**
 * Full treatment cost breakdown.
 *
 * Cost/BF  = total_cost / bf_capacity
 * Cost/cuft = cost/BF × 12   (1 BF = 1/12 cu.ft for a 1″ board)
 * Cost/m³  = cost/cuft × 35.3147
 */
export function calcTreatmentCost(
  chemistry: ChemistryResult,
  borax_price_per_kg: number,
  boric_price_per_kg: number,
  anti_borer_price_per_l: number,
  labour_cost: number,
  electricity_cost: number,
  bf_capacity: number
): CostResult {
  const borax_cost = r2(chemistry.borax_kg * borax_price_per_kg);
  const boric_cost = r2(chemistry.boric_kg * boric_price_per_kg);
  const anti_borer_cost = r2(chemistry.anti_borer_l * anti_borer_price_per_l);
  const chemical_cost = r2(borax_cost + boric_cost + anti_borer_cost);
  const total_cost = r2(chemical_cost + labour_cost + electricity_cost);

  const cost_per_bf = bf_capacity > 0 ? r4(total_cost / bf_capacity) : 0;
  const cost_per_cuft = r2(cost_per_bf * 12);
  const cost_per_m3 = r2(cost_per_cuft * 35.3147);

  return {
    borax_cost,
    boric_cost,
    anti_borer_cost,
    chemical_cost,
    labour_cost,
    electricity_cost,
    total_cost,
    cost_per_bf,
    cost_per_cuft,
    cost_per_m3,
  };
}
