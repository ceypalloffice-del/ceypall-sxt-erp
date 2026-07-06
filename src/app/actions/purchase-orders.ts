"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import type { EntityId } from "@/lib/entities";

async function resolveEntityId(): Promise<EntityId> {
  const profile = await getProfile();
  const entity  = await getActiveEntity(profile);
  return entity === "ALL" ? "SXT" : entity;
}

export type PoItemInput = {
  description: string;
  inventory_item_id: string | null;
  chemical_product_id: string | null;
  unit: string;
  qty_ordered: number;
  unit_cost: number | null;
};

/** Create a PO with all its line items in one call. Returns the new PO id. */
export async function createPurchaseOrder(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const supabase  = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const entityId  = await resolveEntityId();

  const supplierId   = String(formData.get("supplier_id") || "").trim() || null;
  const orderDate    = String(formData.get("order_date")  || new Date().toISOString().slice(0, 10));
  const expectedDate = String(formData.get("expected_date") || "").trim() || null;
  const notes        = String(formData.get("notes") || "").trim() || null;
  const items: PoItemInput[] = JSON.parse(String(formData.get("items") || "[]"));

  if (items.length === 0) return;

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      entity_id:     entityId,
      supplier_id:   supplierId,
      order_date:    orderDate,
      expected_date: expectedDate,
      notes,
      created_by:    user?.id ?? null,
      po_no:         "",
    })
    .select("id")
    .single();

  if (error || !po) return;

  await supabase.from("purchase_order_items").insert(
    items.map((item, i) => ({
      po_id:               po.id,
      description:         item.description,
      inventory_item_id:   item.inventory_item_id  || null,
      chemical_product_id: item.chemical_product_id || null,
      unit:                item.unit,
      qty_ordered:         item.qty_ordered,
      unit_cost:           item.unit_cost ?? null,
      sort_order:          i,
    }))
  );

  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${po.id}`);
}

/** Change PO status (approve / mark sent / cancel). */
export async function updatePoStatus(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const supabase = await createClient();
  const poId     = String(formData.get("po_id"));
  const status   = String(formData.get("status"));

  await supabase
    .from("purchase_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", poId);

  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/purchase-orders");
}

/** Record a GRN — receives goods and auto-updates inventory/chemical stock via DB trigger. */
export async function createGrn(formData: FormData): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return { error: "Your role can't receive goods." };

  const supabase   = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const poId       = String(formData.get("po_id"));
  const receiptDate = String(formData.get("receipt_date") || new Date().toISOString().slice(0, 10));
  const notes      = String(formData.get("notes") || "").trim() || null;

  type GrnLine = { po_item_id: string; qty_received: number };
  const lines: GrnLine[] = JSON.parse(String(formData.get("lines") || "[]"))
    .filter((l: GrnLine) => l.qty_received > 0);

  if (lines.length === 0) return { error: "Enter the quantity received for at least one item." };

  const { data: grn, error } = await supabase
    .from("purchase_grns")
    .insert({
      po_id:        poId,
      receipt_date: receiptDate,
      notes,
      created_by:   user?.id ?? null,
      grn_no:       "",
    })
    .select("id")
    .single();

  if (error || !grn) return { error: error?.message ?? "Could not create the goods received note." };

  // Insert GRN items — trigger handles stock movements + PO status update
  const { error: itemsError } = await supabase.from("purchase_grn_items").insert(
    lines.map((l) => ({
      grn_id:       grn.id,
      po_item_id:   l.po_item_id,
      qty_received: l.qty_received,
    }))
  );

  if (itemsError) {
    // Don't leave an empty GRN behind if the lines failed
    await supabase.from("purchase_grns").delete().eq("id", grn.id);
    return { error: itemsError.message };
  }

  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/purchase-orders");
  revalidatePath("/chemicals");
  revalidatePath("/inventory");
  return {};
}
