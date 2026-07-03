"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";

const ALL_KEYS = [
  "tank_diameter_in",
  "tank_height_ft",
  "cylinder_diameter_in",
  "cylinder_length_ft",
  "tray_diameter_in",
  "tray_length_ft",
  "tray_capacity_cuft",
  "bf_capacity",
  "default_tank_drop_in",
  "borax_per_100l",
  "boric_per_100l",
  "anti_borer_ml_per_100l",
  "borax_price_per_kg",
  "boric_price_per_kg",
  "anti_borer_price_per_l",
  "labour_cost",
  "electricity_cost",
  "target_margin_pct",
  "pricing_mode",
] as const;

export async function updateCpiSettings(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const supabase = await createClient();

  const rows = ALL_KEYS.filter((k) => formData.has(k)).map((k) => ({
    key: k,
    value: String(formData.get(k) ?? ""),
    label: k,
    updated_at: new Date().toISOString(),
  }));

  await supabase
    .from("cpi_settings")
    .upsert(rows, { onConflict: "key" });

  revalidatePath("/cpi-suite", "layout");
}
