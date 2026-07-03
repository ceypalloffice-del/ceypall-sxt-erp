// Pure dimension conversion functions. No I/O, no side-effects.
// All inputs: thickness/width in inches, length in feet, qty in pieces.

import type { TimberMeasurements } from "./types";

const M3_PER_FT3 = 0.0283168;

export function r2(n: number): number { return Math.round(n * 100) / 100; }
export function r4(n: number): number { return Math.round(n * 10000) / 10000; }

/** Linear feet — total run of all pieces. */
export function lft(length_ft: number, qty: number): number {
  return r2(qty * length_ft);
}

/** Square feet — face area (width × length) per piece × qty. */
export function sqft(width_in: number, length_ft: number, qty: number): number {
  return r2((width_in / 12) * length_ft * qty);
}

/** Cubic feet — full volume (thickness × width × length) per piece × qty. */
export function cubicFt(thickness_in: number, width_in: number, length_ft: number, qty: number): number {
  return r2((thickness_in / 12) * (width_in / 12) * length_ft * qty);
}

/** Cubic metres from cubic feet. */
export function cubicM3(cubic_ft: number): number {
  return r4(cubic_ft * M3_PER_FT3);
}

/** Compute all four measurements in one call. */
export function measureTimber(
  thickness_in: number,
  width_in: number,
  length_ft: number,
  qty: number
): TimberMeasurements {
  const cf = cubicFt(thickness_in, width_in, length_ft, qty);
  return {
    lft: lft(length_ft, qty),
    sqft: sqft(width_in, length_ft, qty),
    cubic_ft: cf,
    cubic_m3: cubicM3(cf),
  };
}

/** Convert millimetres to inches (for price list lookups). */
export function mmToIn(mm: number): number { return r4(mm / 25.4); }

/** Convert inches to millimetres. */
export function inToMm(inches: number): number { return r2(inches * 25.4); }
