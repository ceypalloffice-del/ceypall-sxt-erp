"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ENTITY = "CPL";

export async function createPalletSpec(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { data, error } = await supabase
    .from("pallet_specs")
    .insert({ entity_id: ENTITY, name })
    .select("id")
    .single();

  if (error || !data) return;
  redirect(`/pallets/${data.id}`);
}

export async function updatePalletSpec(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const intOrNull = (key: string) => {
    const v = formData.get(key);
    if (v === null || v === "") return null;
    return Number(v);
  };

  await supabase
    .from("pallet_specs")
    .update({
      name: String(formData.get("name") ?? ""),
      customer_id: formData.get("customer_id") || null,
      pallet_size: formData.get("pallet_size") || null,
      base_type: formData.get("base_type") || null,
      treatment_type: formData.get("treatment_type") || null,
      additional_treatment: formData.get("additional_treatment") || null,
      wood_species: formData.get("wood_species") || null,
      planer: formData.get("planer") === "on",
      plank_thickness: formData.get("plank_thickness") || null,
      planks_top: intOrNull("planks_top"),
      planks_middle: intOrNull("planks_middle"),
      planks_bottom: intOrNull("planks_bottom"),
      block_spec: formData.get("block_spec") || null,
      block_qty: intOrNull("block_qty"),
      wire_nail_spec: formData.get("wire_nail_spec") || null,
      wire_nail_qty: intOrNull("wire_nail_qty"),
      screw_nail_spec: formData.get("screw_nail_spec") || null,
      screw_nail_qty: intOrNull("screw_nail_qty"),
      margin_pct: Number(formData.get("margin_pct") ?? 0) / 100,
      notes: formData.get("notes") || null,
    })
    .eq("id", id);

  revalidatePath(`/pallets/${id}`);
  revalidatePath("/pallets");
  redirect(`/pallets/${id}?saved=1`);
}

export async function deletePalletSpec(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  await supabase.from("pallet_specs").delete().eq("id", id);
  redirect("/pallets");
}

export async function addPalletSpecItem(formData: FormData) {
  const supabase = await createClient();
  const specId = String(formData.get("spec_id"));
  const costItemId = formData.get("cost_item_id") ? String(formData.get("cost_item_id")) : null;

  let itemName = String(formData.get("item_name") ?? "").trim();
  let unitPrice = Number(formData.get("unit_price") ?? 0);

  if (costItemId) {
    const { data: costItem } = await supabase
      .from("cost_items")
      .select("name, unit_price")
      .eq("id", costItemId)
      .single();
    if (costItem) {
      itemName = costItem.name;
      if (!formData.get("unit_price")) unitPrice = Number(costItem.unit_price);
    }
  }

  if (!itemName) return;

  const { count } = await supabase
    .from("pallet_spec_items")
    .select("id", { count: "exact", head: true })
    .eq("spec_id", specId);

  await supabase.from("pallet_spec_items").insert({
    spec_id: specId,
    cost_item_id: costItemId,
    item_name: itemName,
    unit_price: unitPrice,
    qty: Number(formData.get("qty") ?? 0),
    sort_order: count ?? 0,
  });

  revalidatePath(`/pallets/${specId}`);
}

export async function updatePalletSpecItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const specId = String(formData.get("spec_id"));

  await supabase
    .from("pallet_spec_items")
    .update({
      unit_price: Number(formData.get("unit_price") ?? 0),
      qty: Number(formData.get("qty") ?? 0),
    })
    .eq("id", id);

  revalidatePath(`/pallets/${specId}`);
}

export async function deletePalletSpecItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const specId = String(formData.get("spec_id"));
  await supabase.from("pallet_spec_items").delete().eq("id", id);
  revalidatePath(`/pallets/${specId}`);
}
