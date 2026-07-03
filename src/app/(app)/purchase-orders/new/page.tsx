import { createClient } from "@/lib/supabase/server";
import { getProfile, getActiveEntity } from "@/lib/session";
import { NewPoForm } from "./NewPoForm";

export default async function NewPurchaseOrderPage() {
  const supabase  = await createClient();
  const profile   = await getProfile();
  const entity    = await getActiveEntity(profile);
  const entityId  = entity === "ALL" ? "SXT" : entity;

  const [suppliersRes, inventoryRes, chemicalsRes] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("entity_id", entityId).order("name"),
    supabase.from("inventory_items").select("id, name, unit, last_purchase_price, category").eq("entity_id", entityId).eq("active", true).order("name"),
    supabase.from("chemical_products").select("id, name, unit").eq("is_active", true).order("sort_order"),
  ]);

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
      />
    </div>
  );
}
