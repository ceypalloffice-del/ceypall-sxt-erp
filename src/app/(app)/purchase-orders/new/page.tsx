import { createClient } from "@/lib/supabase/server";
import { getProfile, getActiveEntity } from "@/lib/session";
import { NewPoForm } from "./NewPoForm";

export default async function NewPurchaseOrderPage() {
  const supabase  = await createClient();
  const profile   = await getProfile();
  const entity    = await getActiveEntity(profile);
  const entityId  = entity === "ALL" ? "SXT" : entity;

  const [suppliersRes, inventoryRes, chemicalsRes, materialsRes] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("entity_id", entityId).order("name"),
    supabase.from("inventory_items").select("id, name, unit, last_purchase_price, category").eq("entity_id", entityId).eq("active", true).order("name"),
    supabase.from("chemical_products").select("id, name, unit").eq("is_active", true).order("sort_order"),
    supabase.from("cost_items").select("id, name, unit, unit_price, category").eq("entity_id", entityId).eq("active", true).order("name"),
  ]);

  // Same grouping as the materials price book page
  type Material = { id: string; name: string; unit: string | null; unit_price: number };
  const materialGroups: Record<string, Material[]> = { Planks: [], Blocks: [], Nails: [], "Other materials": [] };
  for (const m of materialsRes.data ?? []) {
    const group =
      m.category === "nail" ? "Nails"
      : /block/i.test(m.name) ? "Blocks"
      : /plank|beam/i.test(m.name) ? "Planks"
      : "Other materials";
    materialGroups[group].push(m);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Purchase Order</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add items from inventory or chemicals — receiving the PO will automatically update stock.
        </p>
      </div>
      <NewPoForm
        suppliers={(suppliersRes.data ?? []) as { id: string; name: string }[]}
        inventoryItems={(inventoryRes.data ?? []) as { id: string; name: string; unit: string | null; last_purchase_price: number | null; category: string }[]}
        chemicals={(chemicalsRes.data ?? []) as { id: string; name: string; unit: string }[]}
        materialGroups={materialGroups}
      />
    </div>
  );
}
