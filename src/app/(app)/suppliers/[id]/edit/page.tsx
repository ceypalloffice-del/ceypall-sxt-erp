import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";
import { Card, EntityTag } from "@/components/ui";
import { updateSupplier, deleteSupplier } from "@/app/actions/suppliers";
import { SubmitButton } from "@/components/SubmitButton";

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";
const labelCls = "block text-xs font-medium text-slate-500";

export default async function EditSupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await getProfile();
  if (!canKeepBooks(profile)) redirect(`/suppliers/${id}`);

  const supabase = await createClient();
  const { data: supplier } = await supabase.from("suppliers").select("*").eq("id", id).single();
  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/suppliers/${supplier.id}`} className="text-sm text-slate-400 hover:text-slate-600">
          ← {supplier.name}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Edit supplier</h1>
          <EntityTag entityId={supplier.entity_id} />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <Card>
        <form action={updateSupplier} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={supplier.id} />
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="name">Vendor name *</label>
            <input id="name" name="name" required defaultValue={supplier.name} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="category">Supply category (what they supply)</label>
            <input
              id="category"
              name="category"
              placeholder="e.g. timber, nails, fuel, transport"
              defaultValue={supplier.category ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="phone">Phone number</label>
            <input id="phone" name="phone" defaultValue={supplier.phone ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={supplier.email ?? ""} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="address">Address</label>
            <textarea id="address" name="address" rows={3} defaultValue={supplier.address ?? ""} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
              Save changes
            </SubmitButton>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">Remove supplier</h2>
        <p className="mt-1 text-sm text-slate-500">
          Only possible while the supplier has no bills or purchase orders on record.
        </p>
        <form action={deleteSupplier} className="mt-3">
          <input type="hidden" name="id" value={supplier.id} />
          <SubmitButton className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            Delete supplier
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
