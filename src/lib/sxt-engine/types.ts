// ════════════════════════════════════════════════════════════════════════════
// STX Timber Treatment Suite — shared types for the calculation engine.
// All dimension inputs use imperial units (inches / feet) to match how SXT
// staff measure timber. Computed outputs include both imperial and SI.
// ════════════════════════════════════════════════════════════════════════════

export interface TimberDimensions {
  thickness_in: number;   // e.g. 1, 1.5, 2  (inches)
  width_in: number;       // e.g. 4, 6, 8    (inches)
  length_ft: number;      // e.g. 8, 10, 12  (feet)
  qty: number;            // pieces
}

export interface TimberMeasurements {
  lft: number;       // linear feet  = qty × length_ft
  sqft: number;      // board area   = qty × (width_in/12) × length_ft
  cubic_ft: number;  // volume       = qty × (thickness_in/12) × (width_in/12) × length_ft
  cubic_m3: number;  // SI volume    = cubic_ft × 0.0283168
}

export interface KilnCapacity {
  layers: number;
  pieces_per_layer: number;
  max_pieces: number;
  batch_m3: number;
  kiln_capacity_m3: number;
  utilisation_pct: number;
  remaining_m3: number;
  is_over_capacity: boolean;
}

export interface ElectricitySettings {
  units_per_day: number;   // kWh
  days: number;
  rate_per_unit: number;   // LKR per kWh
}

export interface CalculatorInput extends TimberDimensions {
  rate_per_sqft?: number;
  kiln_capacity_m3: number;
  kiln_length_ft: number;
  kiln_width_ft: number;
  kiln_height_ft: number;
  sticker_thickness_in: number;
  electricity_units_per_day: number;
  electricity_rate: number;
  drying_days: number;
  labour_cost_per_batch: number;
  target_margin_pct: number;
}

export interface CalculatorResult extends TimberMeasurements {
  layers: number;
  pieces_per_layer: number;
  kiln_max_pieces: number;
  utilisation_pct: number;
  remaining_m3: number;
  electricity_cost: number;    // full batch electricity cost
  labour_cost: number;
  total_batch_cost: number;
  item_cost: number;           // this item's proportional share of batch cost
  cost_per_sqft: number;
  rate_per_sqft: number;
  revenue: number;
  profit: number;
  margin_pct: number;
  suggested_rate: number;      // rate needed to hit target_margin_pct
}

export interface BatchItemInput {
  id?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  thickness_in: number;
  width_in: number;
  length_ft: number;
  qty: number;
  treatment_type: string;
  rate_per_sqft: number;
  notes?: string | null;
}

export interface BatchItemResult extends BatchItemInput, TimberMeasurements {
  display_name: string;
  allocated_cost: number;
  revenue: number;
  profit: number;
  margin_pct: number;
}

export interface BatchTotals {
  m3: number;
  sqft: number;
  lft: number;
  electricity_cost: number;
  labour_cost: number;
  total_cost: number;
  revenue: number;
  profit: number;
  margin_pct: number;
}

export interface BatchResult {
  items: BatchItemResult[];
  kiln: {
    batch_m3: number;
    kiln_capacity_m3: number;
    utilisation_pct: number;
    remaining_m3: number;
    is_over_capacity: boolean;
  };
  totals: BatchTotals;
}

/** Settings as loaded from sxt_settings table (key → value coerced to number/string). */
export interface SxtSettings {
  kiln_capacity_m3: number;
  kiln_length_ft: number;
  kiln_width_ft: number;
  kiln_height_ft: number;
  electricity_units_per_day: number;
  electricity_rate: number;
  drying_days: number;
  sticker_thickness_in: number;
  target_margin_pct: number;
  labour_cost_per_batch: number;
  company_name: string;
  company_address: string;
  company_phone: string;
  quotation_terms: string;
}
