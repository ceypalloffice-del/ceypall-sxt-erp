// Revenue and rate calculations.

import { r2 } from "./units";

/** Revenue for a given sqft and rate. */
export function calcRevenue(sqft: number, rate_per_sqft: number): number {
  return r2(sqft * rate_per_sqft);
}

/**
 * Minimum rate per sqft needed to achieve a target gross margin.
 * Formula: cost / (sqft × (1 − margin/100))
 */
export function calcSuggestedRate(
  allocated_cost: number,
  sqft: number,
  target_margin_pct: number
): number {
  if (sqft <= 0 || target_margin_pct >= 100) return 0;
  return r2(allocated_cost / (sqft * (1 - target_margin_pct / 100)));
}

/** Format a thickness in mm to a human-readable imperial string ("1"", "1 1/2"", "32mm"). */
export function mmToInLabel(mm: number): string {
  const inches = mm / 25.4;
  const frac = inches - Math.floor(inches);
  if (frac < 0.02) return `${Math.round(inches)}"`;
  if (Math.abs(frac - 0.25) < 0.02) return Math.floor(inches) === 0 ? `1/4"` : `${Math.floor(inches)} 1/4"`;
  if (Math.abs(frac - 0.5) < 0.02) return Math.floor(inches) === 0 ? `1/2"` : `${Math.floor(inches)} 1/2"`;
  if (Math.abs(frac - 0.75) < 0.02) return Math.floor(inches) === 0 ? `3/4"` : `${Math.floor(inches)} 3/4"`;
  return `${(mm / 25.4).toFixed(3)}"`;
}
