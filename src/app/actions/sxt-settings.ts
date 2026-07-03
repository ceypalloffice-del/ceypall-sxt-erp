"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";

export async function updateSxtSettings(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const supabase = await createClient();

  const keys = [
    "kiln_capacity_m3",
    "kiln_length_ft",
    "kiln_width_ft",
    "kiln_height_ft",
    "electricity_units_per_day",
    "electricity_rate",
    "drying_days",
    "sticker_thickness_in",
    "target_margin_pct",
    "labour_cost_per_batch",
    "company_name",
    "company_address",
    "company_phone",
    "quotation_terms",
  ];

  const upserts = keys
    .map((key) => ({ key, value: String(formData.get(key) ?? "") }))
    .filter((r) => r.value !== "");

  await supabase.from("sxt_settings").upsert(upserts, { onConflict: "key" });

  revalidatePath("/treatment-suite/settings");
}
