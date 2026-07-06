import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState } from "@/components/ui";
import { MaterialsTable } from "@/components/MaterialsTable";
import { AddPlankForm } from "@/components/AddPlankForm";
import { AddBlockForm } from "@/components/AddBlockForm";
import { createCostItem } from "@/app/actions/cost-items";

const CATEGORIES = ["timber", "nail", "chemical", "labour", "transport", "other"];

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const { error, added } = await searchParams;
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);
  const activeEntity = await getActiveEntity(profile);

  if (activeEntity === "SXT") {
    return (
      <EmptyState
        title="Not available for St. Xavier Timber"
        hint="The materials price book is a CeyPall-only operation. Switch entity to view it."
      />
    );
  }

  const { data } = await supabase
    .from("cost_items")
    .select("id, category, name, unit, unit_price, active")
    .eq("entity_id", "CPL")
    .order("category")
    .order("name");

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Materials price book</h1>
        <p className="mt-1 text-sm text-slate-500">
          Standard unit prices used when costing pallet and crate specs.
        </p>
      </div>

      {added && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ Added <span className="font-medium">{added}</span> to the price book.
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <MaterialsTable items={rows} canEdit={canEdit} />

      {canEdit && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">Add plank</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick the species and dimensions — the item name is built automatically.
          </p>
          <div className="mt-3">
            <AddPlankForm />
          </div>
        </Card>
      )}

      {canEdit && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">Add block</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick the species and dimensions — the item name is built automatically.
          </p>
          <div className="mt-3">
            <AddBlockForm />
          </div>
        </Card>
      )}

      {canEdit && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">Add other material</h2>
          <form action={createCostItem} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              name="name"
              placeholder="Item name"
              required
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:col-span-2"
            />
            <select
              name="category"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              name="unit"
              placeholder="Unit (e.g. pc)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            />
            <input
              name="unit_price"
              type="number"
              step="0.01"
              placeholder="Unit price"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Add
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
