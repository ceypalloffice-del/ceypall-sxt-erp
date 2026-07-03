// Electricity cost calculation and proportional cost allocation across batch items.
// Labour and other fixed costs are included in total_batch_cost.

import { r2 } from "./units";
import type { ElectricitySettings } from "./types";

/** Total electricity cost for one kiln run. */
export function calcElectricityCost(s: ElectricitySettings): number {
  return r2(s.units_per_day * s.days * s.rate_per_unit);
}

/**
 * Allocate a share of total batch cost to a single item proportionally by volume.
 * Items that take more space in the kiln bear a larger share of the fixed electricity cost.
 */
export function allocateCost(
  item_m3: number,
  total_batch_m3: number,
  total_cost: number
): number {
  if (total_batch_m3 <= 0) return 0;
  return r2((item_m3 / total_batch_m3) * total_cost);
}

/** Cost per sqft for a given item, after allocation. */
export function costPerSqft(allocated_cost: number, sqft: number): number {
  if (sqft <= 0) return 0;
  return r2(allocated_cost / sqft);
}

/**
 * Compute actual elapsed days (fractional) from two ISO timestamp strings.
 * If completed_at is null, measures to now (useful for in-progress batches).
 */
export function calcActualDays(
  started_at: string,
  completed_at: string | null
): number {
  const start = new Date(started_at).getTime();
  const end = completed_at ? new Date(completed_at).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  return ms / (1000 * 60 * 60 * 24);
}

/** Format fractional days as "X days Y h" for display. */
export function formatDuration(days: number): string {
  const totalMinutes = Math.round(days * 24 * 60);
  const d = Math.floor(totalMinutes / (60 * 24));
  const h = Math.floor((totalMinutes % (60 * 24)) / 60);
  const m = totalMinutes % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} day${d !== 1 ? "s" : ""}`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 && d === 0) parts.push(`${m}m`);
  return parts.length ? parts.join(" ") : "0m";
}

/**
 * Format a UTC ISO string for a datetime-local input in Asia/Colombo (UTC+5:30).
 * Returns "" when iso is null/undefined.
 */
export function toColombDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Colombo" }).slice(0, 16);
}

/**
 * Parse a datetime-local string (treated as Asia/Colombo) into UTC ISO.
 * Input looks like "2026-07-02T08:30" (no timezone suffix — we add +05:30).
 */
export function colombLocalToISO(local: string): string {
  if (!local) return "";
  return new Date(local + "+05:30").toISOString();
}
