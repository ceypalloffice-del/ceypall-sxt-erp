import { createClient } from "@/lib/supabase/server";
import { getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState, EntityTag } from "@/components/ui";
import { formatLKR } from "@/lib/format";

export default async function CustomersPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const entity = await getActiveEntity(profile);

  let customers = supabase
    .from("customers")
    .select("id, entity_id, name, type, credit_days, phone, email")
    .order("name");
  let balances = supabase.from("customer_balances").select("id, balance");

  if (entity !== "ALL") {
    customers = customers.eq("entity_id", entity);
    balances = balances.eq("entity_id", entity);
  }

  const [{ data: customerRows }, { data: balanceRows }] = await Promise.all([
    customers,
    balances,
  ]);

  const balanceById = new Map((balanceRows ?? []).map((b) => [b.id, b.balance]));
  const rows = customerRows ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">Master list with current outstanding balance.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No customers yet"
          hint="Customers will appear here once added or imported from QuickBooks."
        />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Credit days</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">{c.name}</td>
                  <td className="px-4 py-3"><EntityTag entityId={c.entity_id} /></td>
                  <td className="px-4 py-3 text-slate-500">{c.type}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-500">{c.credit_days}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    {formatLKR(Number(balanceById.get(c.id) ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
