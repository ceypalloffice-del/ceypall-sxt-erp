import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState, EntityTag, StatusBadge, AgeingDot } from "@/components/ui";
import { formatLKR, formatDate } from "@/lib/format";
import { createVendorBill, recordBillPayment } from "@/app/actions/vendor-bills";
import { SubmitButton } from "@/components/SubmitButton";

const CATEGORIES = ["material", "utility", "licence", "tax", "maintenance", "transport", "other"];

export default async function VendorBillsPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);
  const activeEntity = await getActiveEntity(profile);

  let bills = supabase
    .from("vendor_bills")
    .select("id, entity_id, bill_no, category, description, bill_date, due_date, amount, status, suppliers(name)")
    .order("bill_date", { ascending: false });
  let ageing = supabase.from("ap_ageing").select("*").order("balance", { ascending: false });
  let suppliers = supabase.from("suppliers").select("id, name, entity_id").order("name");

  if (activeEntity !== "ALL") {
    bills = bills.eq("entity_id", activeEntity);
    ageing = ageing.eq("entity_id", activeEntity);
    suppliers = suppliers.eq("entity_id", activeEntity);
  }

  const [{ data: billRows }, { data: ageingRows }, { data: supplierRows }] = await Promise.all([
    bills,
    ageing,
    suppliers,
  ]);

  const rows = billRows ?? [];
  const ageingList = ageingRows ?? [];
  const totalPayable = ageingList.reduce((sum, r) => sum + Number(r.balance), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Vendor bills</h1>
        <p className="mt-1 text-sm text-slate-500">
          Accounts payable — materials, utilities, licensing, tax, transport, and maintenance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-slate-500">Total payable</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {formatLKR(totalPayable)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Suppliers overdue</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {ageingList.filter((r) => r.bucket !== "green").length}
          </p>
        </Card>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-700">AP ageing</h2>
        <Card className="mt-3 p-0">
          {ageingList.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No outstanding payables" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Days overdue</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ageingList.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-800">
                      <span className="mr-2 inline-flex"><AgeingDot bucket={row.bucket} /></span>
                      {row.name}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                      {row.days_overdue ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatLKR(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700">Bills</h2>
        {rows.length === 0 ? (
          <Card className="mt-3">
            <EmptyState title="No bills yet" hint="Add one below." />
          </Card>
        ) : (
          <div className="mt-3 space-y-3">
            {rows.map((bill) => (
              <Card key={bill.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums text-slate-900">
                        {bill.bill_no ?? "—"}
                      </span>
                      <EntityTag entityId={bill.entity_id} />
                      <StatusBadge status={bill.status} />
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-500">
                        {bill.category}
                      </span>
                    </div>
                    {/* @ts-expect-error -- joined relation shape */}
                    <p className="mt-1 text-sm text-slate-700">{bill.suppliers?.name ?? "—"}</p>
                    {bill.description && <p className="text-sm text-slate-500">{bill.description}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      Billed {formatDate(bill.bill_date)}
                      {bill.due_date && ` · Due ${formatDate(bill.due_date)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-semibold tabular-nums text-slate-900">
                      {formatLKR(bill.amount)}
                    </p>
                  </div>
                </div>

                {canEdit && bill.status !== "paid" && (
                  <form
                    action={recordBillPayment}
                    className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-200 pt-3"
                  >
                    <input type="hidden" name="bill_id" value={bill.id} />
                    <input type="hidden" name="entity_id" value={bill.entity_id} />
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      placeholder="Payment amount"
                      required
                      className="w-36 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    />
                    <select
                      name="method"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                      <option value="bank">Bank</option>
                      <option value="cash">Cash</option>
                      <option value="petty_cash">Petty cash</option>
                    </select>
                    <SubmitButton
                      
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                      Record payment
                    </SubmitButton>
                  </form>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {canEdit && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">New bill</h2>
          <form action={createVendorBill} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="hidden"
              name="entity_id"
              value={activeEntity === "ALL" ? "CPL" : activeEntity}
            />
            <select
              name="supplier_id"
              required
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <option value="">— Supplier —</option>
              {(supplierRows ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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
              name="bill_no"
              placeholder="Bill no. (optional)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            />
            <input
              name="description"
              placeholder="Description"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:col-span-3"
            />
            <label className="block text-sm text-slate-600">
              Bill date
              <input
                name="bill_date"
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Due date
              <input
                name="due_date"
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Amount
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
            </label>
            <SubmitButton
              
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:col-span-3">
              Add bill
            </SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
