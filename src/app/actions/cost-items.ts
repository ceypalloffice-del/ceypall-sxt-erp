"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ENTITY = "CPL";

export async function createCostItem(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("cost_items").insert({
    entity_id: ENTITY,
    category: String(formData.get("category") ?? "other"),
    name: String(formData.get("name") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    unit_price: Number(formData.get("unit_price") ?? 0),
  });
  revalidatePath("/materials");
}

export async function updateCostItemPrice(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  await supabase
    .from("cost_items")
    .update({ unit_price: Number(formData.get("unit_price") ?? 0) })
    .eq("id", id);
  revalidatePath("/materials");
}

export async function setCostItemActive(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("cost_items").update({ active }).eq("id", id);
  revalidatePath("/materials");
}
