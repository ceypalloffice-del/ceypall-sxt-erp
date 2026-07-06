import { Card } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

const input =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";
const label = "block text-xs font-medium text-slate-500";

export type CustomerDetails = {
  id?: string;
  name?: string | null;
  type?: string | null;
  credit_days?: number | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  delivery_address?: string | null;
  vat_tin?: string | null;
  accounts_contact?: string | null;
  accounts_phone?: string | null;
  accounts_email?: string | null;
  operations_contact?: string | null;
  operations_phone?: string | null;
  operations_email?: string | null;
  procurement_contact?: string | null;
  procurement_phone?: string | null;
  procurement_email?: string | null;
  notes?: string | null;
};

function ContactBlock({
  title,
  prefix,
  customer,
}: {
  title: string;
  prefix: "accounts" | "operations" | "procurement";
  customer: CustomerDetails;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div>
        <label className={label} htmlFor={`${prefix}_contact`}>Name</label>
        <input id={`${prefix}_contact`} name={`${prefix}_contact`} defaultValue={customer[`${prefix}_contact`] ?? ""} className={`mt-1 ${input}`} />
      </div>
      <div>
        <label className={label} htmlFor={`${prefix}_phone`}>Phone</label>
        <input id={`${prefix}_phone`} name={`${prefix}_phone`} defaultValue={customer[`${prefix}_phone`] ?? ""} className={`mt-1 ${input}`} />
      </div>
      <div>
        <label className={label} htmlFor={`${prefix}_email`}>Email</label>
        <input id={`${prefix}_email`} name={`${prefix}_email`} type="email" defaultValue={customer[`${prefix}_email`] ?? ""} className={`mt-1 ${input}`} />
      </div>
    </div>
  );
}

export function CustomerForm({
  action,
  customer = {},
  entityPicker,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  customer?: CustomerDetails;
  /** Rendered at the top of the form — hidden input or entity select. */
  entityPicker?: React.ReactNode;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6">
      {customer.id && <input type="hidden" name="id" value={customer.id} />}

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">Company</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {entityPicker}
          <div className="sm:col-span-2">
            <label className={label} htmlFor="name">Company name *</label>
            <input id="name" name="name" required defaultValue={customer.name ?? ""} className={`mt-1 ${input}`} />
          </div>
          <div>
            <label className={label} htmlFor="type">Type</label>
            <select id="type" name="type" defaultValue={customer.type ?? "Corporate"} className={`mt-1 ${input}`}>
              <option>Corporate</option>
              <option>SME</option>
              <option>Individual</option>
              <option>Government</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="vat_tin">VAT / TIN</label>
            <input id="vat_tin" name="vat_tin" defaultValue={customer.vat_tin ?? ""} className={`mt-1 ${input} font-mono`} />
          </div>
          <div>
            <label className={label} htmlFor="credit_days">Credit terms (days)</label>
            <input
              id="credit_days"
              name="credit_days"
              type="number"
              min={0}
              defaultValue={customer.credit_days ?? 30}
              className={`mt-1 ${input} font-mono tabular-nums`}
            />
          </div>
          <div>
            <label className={label} htmlFor="phone">General phone</label>
            <input id="phone" name="phone" defaultValue={customer.phone ?? ""} className={`mt-1 ${input}`} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="email">General email</label>
            <input id="email" name="email" type="email" defaultValue={customer.email ?? ""} className={`mt-1 ${input}`} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">Addresses</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div>
            <label className={label} htmlFor="address">Head office address</label>
            <textarea id="address" name="address" rows={3} defaultValue={customer.address ?? ""} className={`mt-1 ${input}`} />
          </div>
          <div>
            <label className={label} htmlFor="delivery_address">
              Delivery address <span className="font-normal">(only if different from head office)</span>
            </label>
            <textarea id="delivery_address" name="delivery_address" rows={3} defaultValue={customer.delivery_address ?? ""} className={`mt-1 ${input}`} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">Contact people</h2>
        <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <ContactBlock title="Accounts" prefix="accounts" customer={customer} />
          <ContactBlock title="Operations" prefix="operations" customer={customer} />
          <ContactBlock title="Procurement" prefix="procurement" customer={customer} />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">Special notes</h2>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Anything the team should know — delivery instructions, preferred payment method, key dates…"
          defaultValue={customer.notes ?? ""}
          className={`mt-3 ${input}`}
        />
      </Card>

      <SubmitButton
        
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
