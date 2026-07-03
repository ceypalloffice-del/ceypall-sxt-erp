import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState, EntityTag } from "@/components/ui";
import { createWarehouse } from "@/app/actions/warehouses";

export default async function WarehousesPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);
  const activeEntity = await getActiveEntity(profile);

  let warehouses = supabase
    .from("warehouses")
    .select("id, entity_id, name, location")
    .order("name");

  if (activeEntity !== "ALL") warehouses = warehouses.eq("entity_id", activeEntity);

  const { data } = await warehouses;
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Warehouses</h1>
        <p className="mt-1 text-sm text-slate-500">Storage locations that inventory items are assigned to.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No warehouses yet" hint="Add a storage location below." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Location</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">{w.name}</td>
                  <td className="px-4 py-3"><EntityTag entityId={w.entity_id} /></td>
                  <td className="px-4 py-3 text-slate-500">{w.location ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {canEdit && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">Add warehouse</h2>
          {activeEntity === "ALL" ? (
            <p className="mt-3 text-sm text-slate-500">
              Switch to a single entity (top right) to add a warehouse.
            </p>
          ) : (
            <form action={createWarehouse} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                name="name"
                placeholder="Warehouse name"
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <input
                name="location"
                placeholder="Location (optional)"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:col-span-3"
              >
                Add
              </button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
