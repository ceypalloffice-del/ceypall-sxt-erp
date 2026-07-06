import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState, EntityTag } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import { createSupplier } from "@/app/actions/suppliers";
import { SubmitButton } from "@/components/SubmitButton";

const inputCls =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);
  const activeEntity = await getActiveEntity(profile);

  let suppliers = supabase
    .from("suppliers")
    .select("id, entity_id, name, category, phone")
    .order("name");
  let balances = supabase.from("supplier_balances").select("id, balance");

  if (activeEntity !== "ALL") {
    suppliers = suppliers.eq("entity_id", activeEntity);
    balances = balances.eq("entity_id", activeEntity);
  }

  const [{ data: supplierRows }, { data: balanceRows }] = await Promise.all([suppliers, balances]);
  const balanceById = new Map((balanceRows ?? []).map((b) => [b.id, b.balance]));
  const rows = supplierRows ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Suppliers</h1>
        <p className="mt-1 text-sm text-slate-500">Vendors and billers, with current amount owed.</p>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No suppliers yet" hint="Add a vendor or biller below." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Supplies</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 text-right font-medium">Owed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/suppliers/${s.id}`} className="font-medium text-slate-900 hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><EntityTag entityId={s.entity_id} /></td>
                  <td className="px-4 py-3 text-slate-500">{s.category ?? "—"}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-500">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    {formatLKR(Number(balanceById.get(s.id) ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {canEdit && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">Add supplier</h2>
          <form action={createSupplier} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              name="entity_id"
              defaultValue={activeEntity === "ALL" ? "CPL" : activeEntity}
              className={inputCls}
            >
              <option value="SXT">SXT</option>
              <option value="CPL">CPL</option>
            </select>
            <input name="name" placeholder="Vendor name" required className={`${inputCls} lg:col-span-2`} />
            <input
              name="category"
              placeholder="Supply category (what they supply, e.g. timber, nails, fuel)"
              className={`${inputCls} lg:col-span-2`}
            />
            <input name="phone" placeholder="Phone number" className={inputCls} />
            <input name="email" type="email" placeholder="Email (optional)" className={inputCls} />
            <input name="address" placeholder="Address" className={`${inputCls} lg:col-span-2`} />
            <SubmitButton className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 lg:col-span-3">
              Add supplier
            </SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
