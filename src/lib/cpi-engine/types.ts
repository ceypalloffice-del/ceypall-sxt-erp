export interface CpiSettings {
  // Machine
  tank_diameter_in: number;
  tank_height_ft: number;
  cylinder_diameter_in: number;
  cylinder_length_ft: number;
  tray_diameter_in: number;
  tray_length_ft: number;
  tray_capacity_cuft: number;
  bf_capacity: number;
  // Defaults
  default_tank_drop_in: number;
  // Formula (per 100 L of solution)
  borax_per_100l: number;
  boric_per_100l: number;
  anti_borer_ml_per_100l: number;
  // Prices
  borax_price_per_kg: number;
  boric_price_per_kg: number;
  anti_borer_price_per_l: number;
  labour_cost: number;
  electricity_cost: number;
  // Margins
  target_margin_pct: number;
  pricing_mode: "auto" | "manual";
}

export interface ChemistryResult {
  tank_drop_in: number;
  litres: number;
  borax_kg: number;
  boric_kg: number;
  anti_borer_ml: number;
  anti_borer_l: number;
}

export interface CostResult {
  borax_cost: number;
  boric_cost: number;
  anti_borer_cost: number;
  chemical_cost: number;
  labour_cost: number;
  electricity_cost: number;
  total_cost: number;
  cost_per_bf: number;
  cost_per_cuft: number;
  cost_per_m3: number;
}

export interface PricingResult {
  board_feet: number;
  allocated_cost: number;
  auto_rate_per_bf: number;
  selling_price: number;
  profit: number;
  margin_pct: number;
}

/** Parse raw key-value rows from cpi_settings into a typed object. */
export function parseCpiSettings(
  rows: { key: string; value: string }[]
): CpiSettings {
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const n = (k: string, fallback: number) => Number(s[k] ?? fallback);
  return {
    tank_diameter_in: n("tank_diameter_in", 111),
    tank_height_ft: n("tank_height_ft", 12),
    cylinder_diameter_in: n("cylinder_diameter_in", 41),
    cylinder_length_ft: n("cylinder_length_ft", 27),
    tray_diameter_in: n("tray_diameter_in", 24),
    tray_length_ft: n("tray_length_ft", 26),
    tray_capacity_cuft: n("tray_capacity_cuft", 173),
    bf_capacity: n("bf_capacity", 2076),
    default_tank_drop_in: n("default_tank_drop_in", 5),
    borax_per_100l: n("borax_per_100l", 4.5),
    boric_per_100l: n("boric_per_100l", 3.5),
    anti_borer_ml_per_100l: n("anti_borer_ml_per_100l", 20),
    borax_price_per_kg: n("borax_price_per_kg", 400),
    boric_price_per_kg: n("boric_price_per_kg", 600),
    anti_borer_price_per_l: n("anti_borer_price_per_l", 25000),
    labour_cost: n("labour_cost", 5000),
    electricity_cost: n("electricity_cost", 1500),
    target_margin_pct: n("target_margin_pct", 25),
    pricing_mode: s["pricing_mode"] === "manual" ? "manual" : "auto",
  };
}
