// Kiln capacity and batch utilisation calculations.

import { r2, r4 } from "./units";
import type { KilnCapacity } from "./types";

/** Number of vertical layers that fit in a kiln given timber and sticker thickness. */
export function calcLayers(
  timber_thickness_in: number,
  sticker_thickness_in: number,
  kiln_height_ft: number
): number {
  const layer_height_ft = (timber_thickness_in + sticker_thickness_in) / 12;
  if (layer_height_ft <= 0) return 0;
  return Math.floor(kiln_height_ft / layer_height_ft);
}

/** Number of pieces that fit in a single layer (rows × columns). */
export function calcPiecesPerLayer(
  timber_width_in: number,
  timber_length_ft: number,
  kiln_width_ft: number,
  kiln_length_ft: number
): number {
  if (timber_width_in <= 0 || timber_length_ft <= 0) return 0;
  const per_row = Math.floor(kiln_width_ft / (timber_width_in / 12));
  const per_col = Math.floor(kiln_length_ft / timber_length_ft);
  return per_row * per_col;
}

/** Full kiln capacity analysis for a specific timber size. */
export function calcKilnCapacity(
  thickness_in: number,
  width_in: number,
  length_ft: number,
  sticker_in: number,
  kiln_h_ft: number,
  kiln_w_ft: number,
  kiln_l_ft: number
): { layers: number; pieces_per_layer: number; max_pieces: number } {
  const layers = calcLayers(thickness_in, sticker_in, kiln_h_ft);
  const pieces_per_layer = calcPiecesPerLayer(width_in, length_ft, kiln_w_ft, kiln_l_ft);
  return { layers, pieces_per_layer, max_pieces: layers * pieces_per_layer };
}

/** Batch utilisation — how full the kiln is by volume. */
export function calcUtilisation(
  batch_m3: number,
  kiln_capacity_m3: number
): Pick<KilnCapacity, "batch_m3" | "kiln_capacity_m3" | "utilisation_pct" | "remaining_m3" | "is_over_capacity"> {
  const utilisation_pct = kiln_capacity_m3 > 0
    ? r2((batch_m3 / kiln_capacity_m3) * 100)
    : 0;
  return {
    batch_m3: r4(batch_m3),
    kiln_capacity_m3,
    utilisation_pct,
    remaining_m3: r4(Math.max(0, kiln_capacity_m3 - batch_m3)),
    is_over_capacity: batch_m3 > kiln_capacity_m3,
  };
}
