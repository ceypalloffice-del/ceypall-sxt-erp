import { createClient } from "@/lib/supabase/server";
import { getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState, EntityTag } from "@/components/ui";
import { formatLKR } from "@/lib/format";

export default async function ProductsPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const entity = await getActiveEntity(profile);

  let products = supabase
    .from("products")
    .select("id, entity_id, code, name, kind, unit, price, stock, reorder_level")
    .order("name");

  if (entity !== "ALL") products = products.eq("entity_id", entity);

  const { data } = await products;
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Products &amp; services</h1>
        <p className="mt-1 text-sm text-slate-500">Price list used on invoices.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No products yet" hint="Products and services will appear here once added." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const low =
                  p.kind === "Product" &&
                  p.reorder_level != null &&
                  p.stock != null &&
                  Number(p.stock) <= Number(p.reorder_level);
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500">{p.code ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-900">{p.name}</td>
                    <td className="px-4 py-3"><EntityTag entityId={p.entity_id} /></td>
                    <td className="px-4 py-3 text-slate-500">{p.kind}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {p.kind === "Product" ? (
                        <span className={low ? "text-red-600" : "text-slate-700"}>
                          {p.stock ?? "—"} {p.unit ?? ""}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatLKR(p.price)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
