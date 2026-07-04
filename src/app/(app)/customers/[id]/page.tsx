import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";
import { Card, EntityTag } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import { CustomerForm, type CustomerDetails } from "@/components/CustomerForm";
import { updateCustomer, deleteCustomer } from "@/app/actions/customers";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);

  const [{ data: customer }, { data: balance }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase.from("customer_balances").select("balance").eq("id", id).single(),
  ]);

  if (!customer) notFound();
  const c = customer as CustomerDetails & { entity_id: "SXT" | "CPL" };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/customers" className="text-sm text-slate-400 hover:text-slate-600">← Customers</Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{c.name}</h1>
            <EntityTag entityId={c.entity_id} />
          </div>
        </div>
        <Card>
          <p className="text-xs text-slate-500">Outstanding balance</p>
          <p className="mt-1 text-right font-mono text-lg font-semibold tabular-nums text-slate-900">
            {formatLKR(Number(balance?.balance ?? 0))}
          </p>
        </Card>
      </div>

      {saved && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Customer details saved.
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {canEdit ? (
        <>
          <CustomerForm action={updateCustomer} customer={c} submitLabel="Save changes" />

          <Card>
            <h2 className="text-sm font-semibold text-slate-700">Remove customer</h2>
            <p className="mt-1 text-sm text-slate-500">
              Only possible while the customer has no invoices, jobs or quotes on record.
            </p>
            <form action={deleteCustomer} className="mt-3">
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Delete customer
              </button>
            </form>
          </Card>
        </>
      ) : (
        <Card>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Type", c.type],
              ["Credit terms", c.credit_days != null ? `${c.credit_days} days` : null],
              ["VAT / TIN", c.vat_tin],
              ["Phone", c.phone],
              ["Email", c.email],
              ["Head office", c.address],
              ["Delivery address", c.delivery_address],
              ["Accounts", [c.accounts_contact, c.accounts_phone, c.accounts_email].filter(Boolean).join(" · ")],
              ["Operations", [c.operations_contact, c.operations_phone, c.operations_email].filter(Boolean).join(" · ")],
              ["Procurement", [c.procurement_contact, c.procurement_phone, c.procurement_email].filter(Boolean).join(" · ")],
              ["Notes", c.notes],
            ]
              .filter(([, value]) => value)
              .map(([field, value]) => (
                <div key={String(field)}>
                  <dt className="text-xs text-slate-500">{field}</dt>
                  <dd className="mt-0.5 text-slate-900">{value}</dd>
                </div>
              ))}
          </dl>
        </Card>
      )}
    </div>
  );
}
