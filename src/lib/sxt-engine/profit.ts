// Profit and margin functions.

import { r2 } from "./units";

export function calcProfit(revenue: number, cost: number): number {
  return r2(revenue - cost);
}

/** Gross margin as a percentage of revenue. Returns 0 if revenue is zero. */
export function calcMarginPct(revenue: number, cost: number): number {
  if (revenue <= 0) return 0;
  return r2(((revenue - cost) / revenue) * 100);
}
