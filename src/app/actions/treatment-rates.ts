"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPlankRate(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("plank_treatment_rates").insert({
    entity_id: "SXT",
    service: String(formData.get("service") ?? "kiln_drying"),
    thickness: String(formData.get("thickness") ?? "").trim(),
    rate_per_sqft: Number(formData.get("rate_per_sqft") ?? 0),
  });
  revalidatePath("/treatment-rates");
}

export async function updatePlankRate(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  await supabase
    .from("plank_treatment_rates")
    .update({ rate_per_sqft: Number(formData.get("rate_per_sqft") ?? 0) })
    .eq("id", id);
  revalidatePath("/treatment-rates");
}

export async function setPlankRateActive(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("plank_treatment_rates").update({ active }).eq("id", id);
  revalidatePath("/treatment-rates");
}

export async function createBeamRate(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("beam_treatment_rates").insert({
    entity_id: "SXT",
    service: String(formData.get("service") ?? "kiln_drying"),
    height: String(formData.get("height") ?? "").trim(),
    width: String(formData.get("width") ?? "").trim(),
    rate_per_lft: Number(formData.get("rate_per_lft") ?? 0),
  });
  revalidatePath("/treatment-rates");
}

export async function updateBeamRate(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  await supabase
    .from("beam_treatment_rates")
    .update({ rate_per_lft: Number(formData.get("rate_per_lft") ?? 0) })
    .eq("id", id);
  revalidatePath("/treatment-rates");
}

export async function setBeamRateActive(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("beam_treatment_rates").update({ active }).eq("id", id);
  revalidatePath("/treatment-rates");
}
