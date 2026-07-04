import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";
import { Card, EntityTag } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import type { CustomerDetails } from "@/components/CustomerForm";

function Field({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 whitespace-pre-line text-slate-900 ${mono ? "font-mono tabular-nums" : ""}`}>
        {value != null && value !== "" ? value : "—"}
      </dd>
    </div>
  );
}

function ContactCard({
  title,
  name,
  phone,
  email,
}: {
  title: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <dl className="mt-2 space-y-2">
        <Field label="Name" value={name} />
        <Field label="Phone" value={phone} mono />
        <Field label="Email" value={email} />
      </dl>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
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
        <div className="flex items-center gap-3">
          {canEdit && (
            <Link
              href={`/customers/${c.id}/edit`}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Edit
            </Link>
          )}
          <Card>
            <p className="text-xs text-slate-500">Outstanding balance</p>
            <p className="mt-1 text-right font-mono text-lg font-semibold tabular-nums text-slate-900">
              {formatLKR(Number(balance?.balance ?? 0))}
            </p>
          </Card>
        </div>
      </div>

      {saved && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Customer details saved.
        </p>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">Company</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-5 text-sm">
          <Field label="Type" value={c.type} />
          <Field label="Credit terms" value={c.credit_days != null ? `${c.credit_days} days` : null} />
          <Field label="VAT / TIN" value={c.vat_tin} mono />
          <Field label="General phone" value={c.phone} mono />
          <Field label="General email" value={c.email} />
        </dl>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">Addresses</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2 text-sm">
          <Field label="Head office" value={c.address} />
          <Field label="Delivery address" value={c.delivery_address ?? "Same as head office"} />
        </dl>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">Contact people</h2>
        <div className="mt-3 grid grid-cols-1 gap-6 text-sm sm:grid-cols-3">
          <ContactCard title="Accounts" name={c.accounts_contact} phone={c.accounts_phone} email={c.accounts_email} />
          <ContactCard title="Operations" name={c.operations_contact} phone={c.operations_phone} email={c.operations_email} />
          <ContactCard title="Procurement" name={c.procurement_contact} phone={c.procurement_phone} email={c.procurement_email} />
        </div>
      </Card>

      {c.notes && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">Special notes</h2>
          <p className="mt-3 whitespace-pre-line text-sm text-slate-900">{c.notes}</p>
        </Card>
      )}
    </div>
  );
}
