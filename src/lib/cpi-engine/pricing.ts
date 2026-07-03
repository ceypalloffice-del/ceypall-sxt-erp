import type { PricingResult } from "./types";

function r2(n: number) {
  return Math.round(n * 100) / 100;
}
function r4(n: number) {
  return Math.round(n * 10000) / 10000;
}

/**
 * Board feet for one piece (or qty pieces).
 * BF = (thickness_in × width_in × length_ft × qty) / 12
 */
export function calcBoardFeet(
  thickness_in: number,
  width_in: number,
  length_ft: number,
  qty = 1
): number {
  return r4((thickness_in * width_in * length_ft * qty) / 12);
}

/**
 * Auto selling rate per BF from cost + target gross margin.
 * rate = cost_per_bf / (1 − margin%)
 * e.g. cost=10, margin=25% → rate = 10/0.75 = 13.33 → margin on revenue = 25% ✓
 */
export function calcAutoRatePerBf(
  cost_per_bf: number,
  target_margin_pct: number
): number {
  if (target_margin_pct >= 100) return cost_per_bf * 10;
  return r4(cost_per_bf / (1 - target_margin_pct / 100));
}

/** Full pricing result for a given timber piece. */
export function calcPricing(
  thickness_in: number,
  width_in: number,
  length_ft: number,
  qty: number,
  cost_per_bf: number,
  target_margin_pct: number,
  manual_rate_per_bf?: number | null
): PricingResult {
  const board_feet = calcBoardFeet(thickness_in, width_in, length_ft, qty);
  const auto_rate_per_bf = calcAutoRatePerBf(cost_per_bf, target_margin_pct);
  const effective_rate = manual_rate_per_bf ?? auto_rate_per_bf;
  const allocated_cost = r2(board_feet * cost_per_bf);
  const selling_price = r2(board_feet * effective_rate);
  const profit = r2(selling_price - allocated_cost);
  const margin_pct =
    selling_price > 0
      ? r2((profit / selling_price) * 100)
      : 0;

  return {
    board_feet,
    allocated_cost,
    auto_rate_per_bf,
    selling_price,
    profit,
    margin_pct,
  };
}

/** LKR format helper (no decimals, e.g. "LKR 14,312") */
export function fmtLKR(n: number): string {
  return `LKR ${Math.round(n).toLocaleString("en-LK")}`;
}
