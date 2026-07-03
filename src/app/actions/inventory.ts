"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveEntity, getProfile } from "@/lib/session";

/** Active entity never comes from form data — it's derived server-side from the session/cookie. */
async function resolveWriteEntity(): Promise<"SXT" | "CPL" | null> {
  const profile = await getProfile();
  const active = await getActiveEntity(profile);
  return active === "ALL" ? null : active;
}

export async function createInventoryItem(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const entityId = await resolveWriteEntity();
  if (!entityId) return; // can't create an item without a single active entity

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      entity_id: entityId,
      sku: formData.get("sku") || null,
      name,
      category: String(formData.get("category") ?? "other"),
      unit: formData.get("unit") || null,
      min_qty: Number(formData.get("min_qty") ?? 0),
      max_qty: formData.get("max_qty") ? Number(formData.get("max_qty")) : null,
      warehouse_id: formData.get("warehouse_id") || null,
      supplier_id: formData.get("supplier_id") || null,
    })
    .select("id")
    .single();

  if (error || !data) return;
  redirect(`/inventory/${data.id}`);
}

export async function updateInventoryItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  await supabase
    .from("inventory_items")
    .update({
      name: String(formData.get("name") ?? ""),
      sku: formData.get("sku") || null,
      category: String(formData.get("category") ?? "other"),
      description: formData.get("description") || null,
      unit: formData.get("unit") || null,
      min_qty: Number(formData.get("min_qty") ?? 0),
      max_qty: formData.get("max_qty") ? Number(formData.get("max_qty")) : null,
      supplier_id: formData.get("supplier_id") || null,
      warehouse_id: formData.get("warehouse_id") || null,
    })
    .eq("id", id);

  revalidatePath(`/inventory/${id}`);
}

const STOCK_IN_TYPES = new Set(["purchase", "goods_receipt", "production_output", "return"]);

export async function recordMovement(formData: FormData) {
  const supabase = await createClient();
  const itemId = String(formData.get("item_id"));
  const movementType = String(formData.get("movement_type") ?? "adjustment");

  const rawQty = Number(formData.get("qty") ?? 0);
  if (!(rawQty > 0)) return; // reject zero/negative input instead of silently flipping its sign

  let signedQty = rawQty;
  if (movementType === "adjustment") {
    signedQty = String(formData.get("direction")) === "out" ? -rawQty : rawQty;
  } else if (!STOCK_IN_TYPES.has(movementType)) {
    signedQty = -rawQty;
  }

  const entityId = await resolveWriteEntity();
  if (!entityId) return;

  const { data: user } = await supabase.auth.getUser();

  await supabase.from("inventory_movements").insert({
    entity_id: entityId,
    item_id: itemId,
    movement_type: movementType,
    qty: signedQty,
    unit_cost: formData.get("unit_cost") ? Number(formData.get("unit_cost")) : null,
    reference: formData.get("reference") || null,
    notes: formData.get("notes") || null,
    created_by: user.user?.id ?? null,
  });

  // Any inbound movement that carries a unit cost represents an acquisition price, not just "purchase".
  if (STOCK_IN_TYPES.has(movementType) && formData.get("unit_cost")) {
    await supabase
      .from("inventory_items")
      .update({ last_purchase_price: Number(formData.get("unit_cost")) })
      .eq("id", itemId);
  }

  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/inventory");
  redirect(`/inventory/${itemId}`);
}
