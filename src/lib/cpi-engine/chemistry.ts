import type { ChemistryResult } from "./types";

const CUBIC_IN_PER_LITRE = 61.0237;

function r2(n: number) {
  return Math.round(n * 100) / 100;
}
function r3(n: number) {
  return Math.round(n * 1000) / 1000;
}

/**
 * Volume of solution (litres) consumed when the chemical level drops by
 * `tank_drop_in` inches in a cylindrical tank of the given diameter.
 *
 * Formula: V = π × r² × h   (in cubic inches) ÷ 61.0237 cubic inches per litre
 */
export function calcLitresFromDrop(
  tank_diameter_in: number,
  tank_drop_in: number
): number {
  const r = tank_diameter_in / 2;
  const cubic_in = Math.PI * r * r * tank_drop_in;
  return r2(cubic_in / CUBIC_IN_PER_LITRE);
}

/** Chemical quantities needed for a given volume of solution. */
export function calcChemicalsForLitres(
  litres: number,
  borax_per_100l: number,
  boric_per_100l: number,
  anti_borer_ml_per_100l: number
): Omit<ChemistryResult, "tank_drop_in"> {
  const per100 = litres / 100;
  const borax_kg = r3(per100 * borax_per_100l);
  const boric_kg = r3(per100 * boric_per_100l);
  const anti_borer_ml = r2(per100 * anti_borer_ml_per_100l);
  return {
    litres,
    borax_kg,
    boric_kg,
    anti_borer_ml,
    anti_borer_l: r3(anti_borer_ml / 1000),
  };
}

/** Full chemistry result from a tank drop reading. */
export function calcTreatmentChemistry(
  tank_diameter_in: number,
  tank_drop_in: number,
  borax_per_100l: number,
  boric_per_100l: number,
  anti_borer_ml_per_100l: number
): ChemistryResult {
  const litres = calcLitresFromDrop(tank_diameter_in, tank_drop_in);
  return {
    tank_drop_in,
    ...calcChemicalsForLitres(
      litres,
      borax_per_100l,
      boric_per_100l,
      anti_borer_ml_per_100l
    ),
  };
}
