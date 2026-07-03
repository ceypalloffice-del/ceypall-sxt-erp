import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState, EntityTag } from "@/components/ui";
import { formatLKR, formatDate } from "@/lib/format";
import { addPettyCashTopUp, addPettyCashExpense } from "@/app/actions/petty-cash";

const EXPENSE_CATEGORIES = [
  "fuel",
  "donation",
  "food",
  "stationery",
  "salary_advance",
  "maintenance",
  "transport",
  "vendor_bill",
  "other",
];

export default async function PettyCashPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);
  const activeEntity = await getActiveEntity(profile);

  let balances = supabase.from("petty_cash_balance").select("*");
  let txns = supabase
    .from("petty_cash_transactions")
    .select("id, entity_id, type, category, description, amount, txn_date")
    .order("txn_date", { ascending: false })
    .limit(50);

  if (activeEntity !== "ALL") {
    balances = balances.eq("entity_id", activeEntity);
    txns = txns.eq("entity_id", activeEntity);
  }

  const [{ data: balanceRows }, { data: txnRows }] = await Promise.all([balances, txns]);

  const totalBalance = (balanceRows ?? []).reduce((sum, b) => sum + Number(b.balance), 0);
  const rows = txnRows ?? [];
  const formEntity = activeEntity === "ALL" ? "CPL" : activeEntity;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Petty cash</h1>
        <p className="mt-1 text-sm text-slate-500">Daily cash float — top-ups in, small expenses out.</p>
      </div>

      {activeEntity === "ALL" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(balanceRows ?? []).map((b) => (
            <Card key={b.entity_id}>
              <div className="flex items-center gap-2">
                <EntityTag entityId={b.entity_id} />
                <p className="text-sm text-slate-500">Balance</p>
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                {formatLKR(b.balance)}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-slate-500">Current balance</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {formatLKR(totalBalance)}
          </p>
        </Card>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-700">Recent transactions</h2>
        <Card className="mt-3 p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No petty cash transactions yet" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-500">{formatDate(t.txn_date)}</td>
                    <td className="px-4 py-3"><EntityTag entityId={t.entity_id} /></td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {t.type === "top_up" ? "Top-up" : t.category?.replace("_", " ") ?? "Expense"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{t.description ?? "—"}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular-nums ${
                        t.type === "top_up" ? "text-emerald-700" : "text-slate-900"
                      }`}
                    >
                      {t.type === "top_up" ? "+" : "-"}
                      {formatLKR(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {canEdit && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-slate-700">Top up float</h2>
            <form action={addPettyCashTopUp} className="mt-3 space-y-3">
              <input type="hidden" name="entity_id" value={formEntity} />
              <input
                name="amount"
                type="number"
                step="0.01"
                placeholder="Amount"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <input
                name="description"
                placeholder="Note (optional)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Add top-up
              </button>
            </form>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-slate-700">Record expense</h2>
            <form action={addPettyCashExpense} className="mt-3 space-y-3">
              <input type="hidden" name="entity_id" value={formEntity} />
              <select
                name="category"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
                  </option>
                ))}
              </select>
              <input
                name="amount"
                type="number"
                step="0.01"
                placeholder="Amount"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <input
                name="description"
                placeholder="Note (optional)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Add expense
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
