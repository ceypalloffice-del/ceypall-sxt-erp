// Single-item calculator — the main entry point used by the Calculator page.
// The item is costed as if it takes its proportional share of a FULL kiln run.
// For multi-customer batch costing, use batch.ts instead.

import { measureTimber } from "./units";
import { calcKilnCapacity, calcUtilisation } from "./capacity";
import { calcElectricityCost, allocateCost, costPerSqft } from "./cost";
import { calcRevenue, calcSuggestedRate } from "./pricing";
import { calcProfit, calcMarginPct } from "./profit";
import type { CalculatorInput, CalculatorResult } from "./types";

export function calculate(input: CalculatorInput): CalculatorResult {
  const m = measureTimber(
    input.thickness_in,
    input.width_in,
    input.length_ft,
    input.qty
  );

  const { layers, pieces_per_layer, max_pieces } = calcKilnCapacity(
    input.thickness_in,
    input.width_in,
    input.length_ft,
    input.sticker_thickness_in,
    input.kiln_height_ft,
    input.kiln_width_ft,
    input.kiln_length_ft
  );

  const { utilisation_pct, remaining_m3 } = calcUtilisation(
    m.cubic_m3,
    input.kiln_capacity_m3
  );

  const electricity_cost = calcElectricityCost({
    units_per_day: input.electricity_units_per_day,
    days: input.drying_days,
    rate_per_unit: input.electricity_rate,
  });

  const total_batch_cost = electricity_cost + input.labour_cost_per_batch;

  // Cost allocated proportionally to kiln capacity (single-item view of a full kiln run)
  const item_cost = allocateCost(m.cubic_m3, input.kiln_capacity_m3, total_batch_cost);
  const cps = costPerSqft(item_cost, m.sqft);

  const rate = input.rate_per_sqft ?? 0;
  const revenue = calcRevenue(m.sqft, rate);
  const profit = calcProfit(revenue, item_cost);
  const margin_pct = calcMarginPct(revenue, item_cost);
  const suggested_rate = calcSuggestedRate(item_cost, m.sqft, input.target_margin_pct);

  return {
    ...m,
    layers,
    pieces_per_layer,
    kiln_max_pieces: max_pieces,
    utilisation_pct,
    remaining_m3,
    electricity_cost,
    labour_cost: input.labour_cost_per_batch,
    total_batch_cost,
    item_cost,
    cost_per_sqft: cps,
    rate_per_sqft: rate,
    revenue,
    profit,
    margin_pct,
    suggested_rate,
  };
}
