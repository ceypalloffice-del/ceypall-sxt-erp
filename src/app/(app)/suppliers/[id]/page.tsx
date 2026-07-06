import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";
import { Card, EntityTag } from "@/components/ui";
import { formatLKR } from "@/lib/format";

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 whitespace-pre-line text-slate-900 ${mono ? "font-mono tabular-nums" : ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

export default async function SupplierDetailPage({
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

  const [{ data: supplier }, { data: balance }] = await Promise.all([
    supabase.from("suppliers").select("*").eq("id", id).single(),
    supabase.from("supplier_balances").select("balance").eq("id", id).single(),
  ]);

  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/suppliers" className="text-sm text-slate-400 hover:text-slate-600">← Suppliers</Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{supplier.name}</h1>
            <EntityTag entityId={supplier.entity_id} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <Link
              href={`/suppliers/${supplier.id}/edit`}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Edit
            </Link>
          )}
          <Card>
            <p className="text-xs text-slate-500">We owe them</p>
            <p className="mt-1 text-right font-mono text-lg font-semibold tabular-nums text-slate-900">
              {formatLKR(Number(balance?.balance ?? 0))}
            </p>
          </Card>
        </div>
      </div>

      {saved && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Supplier details saved.
        </p>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">Vendor details</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Company name" value={supplier.company_name} />
          <Field label="Supplies" value={supplier.category} />
          <Field
            label="Credit terms"
            value={supplier.credit_days != null ? `${supplier.credit_days} days` : null}
            mono
          />
          <Field label="Phone" value={supplier.phone} mono />
          <Field label="Email" value={supplier.email} />
          <Field label="Address" value={supplier.address} />
        </dl>
      </Card>
    </div>
  );
}
