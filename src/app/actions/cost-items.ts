"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ENTITY = "CPL";

/** Reads a select with an optional "Other → custom text" companion field. */
function pick(formData: FormData, selectName: string, customName: string) {
  const selected = String(formData.get(selectName) ?? "").trim();
  if (selected !== "Other") return selected;
  return String(formData.get(customName) ?? "").trim();
}

export async function createPlankItem(formData: FormData) {
  const species = pick(formData, "wood_species", "custom_species");
  const width = pick(formData, "plank_width", "custom_width");
  const length = pick(formData, "plank_length", "custom_length");
  const thickness = String(formData.get("plank_thickness") ?? "").trim();
  const basis = String(formData.get("price_basis") ?? "");
  const price = Number(formData.get("unit_price"));

  const fail: (message: string) => never = (message) =>
    redirect(`/materials?error=${encodeURIComponent(message)}`);

  if (!species) fail("Pick a wood species (or type the custom name).");
  if (!width) fail("Pick a plank width (or type the custom width).");
  if (!length) fail("Pick a length (or type the custom length).");
  if (!thickness) fail("Pick a thickness.");
  if (!["ft", "plank"].includes(basis)) fail("Pick a price basis: per ft or per plank.");
  if (!Number.isFinite(price) || price <= 0) fail("Enter the buying price.");

  const name = `${species} plank ${width} x ${thickness} x ${length} — per ${basis}`;

  const supabase = await createClient();
  const { error } = await supabase.from("cost_items").insert({
    entity_id: ENTITY,
    category: "timber",
    name,
    unit: basis,
    unit_price: price,
    wood_species: species,
    plank_width: width,
    plank_length: length,
    plank_thickness: thickness,
  });

  if (error) {
    fail(
      error.message.includes("duplicate")
        ? `"${name}" is already in the price book — edit its price in the list instead.`
        : error.message
    );
  }

  revalidatePath("/materials");
  redirect(`/materials?added=${encodeURIComponent(name)}`);
}

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

export async function createBlockItem(formData: FormData) {
  const species = pick(formData, "wood_species", "custom_species");
  const dimensions = pick(formData, "block_dimensions", "custom_dimensions");
  const basis = String(formData.get("price_basis") ?? "");
  const price = Number(formData.get("unit_price"));

  const fail: (message: string) => never = (message) =>
    redirect(`/materials?error=${encodeURIComponent(message)}`);

  if (!species) fail("Pick a wood species (or type the custom name).");
  if (!dimensions) fail("Pick the block dimensions (or type the custom dimensions).");
  if (!["ft", "beam"].includes(basis)) fail("Pick a price basis: per ft or per beam.");
  if (!Number.isFinite(price) || price <= 0) fail("Enter the buying price.");

  const name = `${species} block ${dimensions} — per ${basis}`;

  const supabase = await createClient();
  const { error } = await supabase.from("cost_items").insert({
    entity_id: ENTITY,
    category: "timber",
    name,
    unit: basis,
    unit_price: price,
    wood_species: species,
    block_dimensions: dimensions,
  });

  if (error) {
    fail(
      error.message.includes("duplicate")
        ? `"${name}" is already in the price book — edit its price in the list instead.`
        : error.message
    );
  }

  revalidatePath("/materials");
  redirect(`/materials?added=${encodeURIComponent(name)}`);
}

export async function updateCostItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const price = Number(formData.get("unit_price"));
  if (!id || !name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("cost_items")
    .update({ name, unit: unit || null, unit_price: Number.isFinite(price) ? price : 0 })
    .eq("id", id);

  if (error) {
    const message = error.message.includes("duplicate")
      ? `Another item is already named "${name}".`
      : error.message;
    redirect(`/materials?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/materials");
}

export async function deleteCostItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("cost_items").delete().eq("id", id);

  if (error) {
    const message = error.message.includes("violates foreign key")
      ? "This material is used in pallet costings and can't be deleted — mark it Inactive instead."
      : error.message;
    redirect(`/materials?error=${encodeURIComponent(message)}`);
  }

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
