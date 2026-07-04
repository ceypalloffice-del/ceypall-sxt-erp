import Link from "next/link";
import { redirect } from "next/navigation";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { CustomerForm } from "@/components/CustomerForm";
import { createCustomer } from "@/app/actions/customers";

export default async function NewCustomerPage() {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) redirect("/customers");
  const activeEntity = await getActiveEntity(profile);

  const label = "block text-xs font-medium text-slate-500";
  const input =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

  const entityPicker =
    activeEntity === "ALL" ? (
      <div>
        <label className={label} htmlFor="entity_id">Entity *</label>
        <select id="entity_id" name="entity_id" required className={`mt-1 ${input}`}>
          <option value="SXT">St. Xavier Timber</option>
          <option value="CPL">CeyPall</option>
        </select>
      </div>
    ) : (
      <input type="hidden" name="entity_id" value={activeEntity} />
    );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/customers" className="text-sm text-slate-400 hover:text-slate-600">← Customers</Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Add customer</h1>
        <p className="mt-1 text-sm text-slate-500">Only the company name is required — fill in the rest as you learn it.</p>
      </div>

      <CustomerForm action={createCustomer} entityPicker={entityPicker} submitLabel="Add customer" />
    </div>
  );
}
