import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";
import { Card, EntityTag } from "@/components/ui";
import { CustomerForm, type CustomerDetails } from "@/components/CustomerForm";
import { updateCustomer, deleteCustomer } from "@/app/actions/customers";
import { SubmitButton } from "@/components/SubmitButton";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await getProfile();
  if (!canKeepBooks(profile)) redirect(`/customers/${id}`);

  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).single();
  if (!customer) notFound();
  const c = customer as CustomerDetails & { entity_id: "SXT" | "CPL" };

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/customers/${c.id}`} className="text-sm text-slate-400 hover:text-slate-600">
          ← {c.name}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Edit customer</h1>
          <EntityTag entityId={c.entity_id} />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <CustomerForm action={updateCustomer} customer={c} submitLabel="Save changes" />

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">Remove customer</h2>
        <p className="mt-1 text-sm text-slate-500">
          Only possible while the customer has no invoices, jobs or quotes on record.
        </p>
        <form action={deleteCustomer} className="mt-3">
          <input type="hidden" name="id" value={c.id} />
          <SubmitButton
            
            className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            Delete customer
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
