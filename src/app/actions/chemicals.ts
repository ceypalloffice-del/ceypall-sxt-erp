"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import type { EntityId } from "@/lib/entities";

/** Resolve entity for chemical movements; never allow 'ALL' as a stored entity_id. */
async function resolveChemEntityId(): Promise<EntityId> {
  const profile = await getProfile();
  const entity = await getActiveEntity(profile);
  return entity === "ALL" ? "SXT" : entity;
}

/** Record incoming chemical stock (purchase). */
export async function addChemicalPurchase(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const entityId = await resolveChemEntityId();

  const packsCount = Number(formData.get("packs_count")) || null;
  const totalQty   = Number(formData.get("total_qty"));
  const unitCost   = Number(formData.get("unit_cost")) || null;
  const totalCost  = unitCost && totalQty ? parseFloat((unitCost * totalQty).toFixed(2)) : null;

  await supabase.from("chemical_movements").insert({
    product_id:    String(formData.get("product_id")),
    movement_type: "purchase",
    quantity:      totalQty,
    pack_size:     String(formData.get("pack_size") ?? "").trim() || null,
    packs_count:   packsCount,
    unit_cost:     unitCost,
    total_cost:    totalCost,
    reference_no:  String(formData.get("reference_no") ?? "").trim() || null,
    entity_id:     entityId,
    notes:         String(formData.get("notes") ?? "").trim() || null,
    movement_date: String(formData.get("movement_date") || new Date().toISOString().slice(0, 10)),
    created_by:    user?.id ?? null,
  });

  revalidatePath("/chemicals");
}

/** Record outgoing chemical usage (CPI treatment, pallet manufacturing, tank fill). */
export async function recordChemicalUsage(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const entityId = await resolveChemEntityId();

  const qty = Math.abs(Number(formData.get("quantity")));

  await supabase.from("chemical_movements").insert({
    product_id:    String(formData.get("product_id")),
    movement_type: String(formData.get("movement_type")),
    quantity:      -qty,  // always negative for usage
    reference_no:  String(formData.get("reference_no") ?? "").trim() || null,
    entity_id:     entityId,
    notes:         String(formData.get("notes") ?? "").trim() || null,
    movement_date: String(formData.get("movement_date") || new Date().toISOString().slice(0, 10)),
    created_by:    user?.id ?? null,
  });

  revalidatePath("/chemicals");
}

/** Add opening balance or manual stock adjustment. */
export async function addStockAdjustment(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const entityId = await resolveChemEntityId();

  const qty       = Math.abs(Number(formData.get("quantity")));
  const direction = String(formData.get("direction")); // 'add' | 'remove'
  const type      = String(formData.get("adjustment_type")); // 'adjustment' | 'opening'

  await supabase.from("chemical_movements").insert({
    product_id:    String(formData.get("product_id")),
    movement_type: type === "opening" ? "opening" : "adjustment",
    quantity:      direction === "remove" ? -qty : qty,
    reference_no:  String(formData.get("reference_no") ?? "").trim() || null,
    entity_id:     entityId,
    notes:         String(formData.get("notes") ?? "").trim() || null,
    movement_date: String(formData.get("movement_date") || new Date().toISOString().slice(0, 10)),
    created_by:    user?.id ?? null,
  });

  revalidatePath("/chemicals");
}
