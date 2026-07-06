import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import { computeCosting } from "@/lib/costing";
import { SubmitButton } from "@/components/SubmitButton";
import {
  updatePalletSpec,
  deletePalletSpec,
  addPalletSpecItem,
  updatePalletSpecItem,
  deletePalletSpecItem,
} from "@/app/actions/pallet-specs";

export default async function PalletSpecPage({
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
  const activeEntity = await getActiveEntity(profile);

  if (activeEntity === "SXT") {
    return (
      <EmptyState
        title="Not available for St. Xavier Timber"
        hint="Pallet costing is a CeyPall-only operation. Switch entity to view it."
      />
    );
  }

  const { data: spec } = await supabase.from("pallet_specs").select("*").eq("id", id).single();
  if (!spec) notFound();

  const [{ data: items }, { data: customers }, { data: costItems }] = await Promise.all([
    supabase
      .from("pallet_spec_items")
      .select("id, item_name, unit_price, qty, sort_order")
      .eq("spec_id", id)
      .order("sort_order"),
    supabase.from("customers").select("id, name").eq("entity_id", "CPL").order("name"),
    supabase
      .from("cost_items")
      .select("id, name, unit_price, category")
      .eq("entity_id", "CPL")
      .eq("active", true)
      .order("category")
      .order("name"),
  ]);

  const rows = items ?? [];
  const grandTotal = rows.reduce((sum, r) => sum + Number(r.qty) * Number(r.unit_price), 0);
  const { profitAmount, finalPrice } = computeCosting(grandTotal, Number(spec.margin_pct));

  return (
    <div className="space-y-8">
      {saved && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-800">
            ✓ Pallet spec saved. Do you want to add another one?
          </p>
          <div className="flex gap-2">
            <Link
              href="/pallets?new=1#new-spec"
              className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Yes, add another
            </Link>
            <Link
              href="/pallets"
              className="rounded-md border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              No, go to pallets list
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{spec.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{spec.pallet_size ?? "Spec not yet defined"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/pallets/${id}/quotation`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Generate quotation
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Grand total (BOM)</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {formatLKR(grandTotal)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Profit amount ({(Number(spec.margin_pct) * 100).toFixed(0)}%)</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {formatLKR(profitAmount)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Final price</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {formatLKR(finalPrice)}
          </p>
        </Card>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-700">Bill of materials</h2>
        <Card className="mt-3 p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No line items yet" hint="Add timber, nails, labour, chemical, and transport below." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Unit price</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  {canEdit && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-800">{item.item_name}</td>
                    {canEdit ? (
                      <>
                        <td className="px-4 py-3">
                          <form
                            id={`item-${item.id}`}
                            action={updatePalletSpecItem}
                            className="flex items-center gap-2"
                          >
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="spec_id" value={id} />
                            <input
                              name="unit_price"
                              type="number"
                              step="0.01"
                              defaultValue={item.unit_price}
                              className="w-24 rounded-md border border-slate-300 px-2 py-1 font-mono text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            />
                          </form>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            name="qty"
                            type="number"
                            step="0.01"
                            defaultValue={item.qty}
                            form={`item-${item.id}`}
                            className="w-20 rounded-md border border-slate-300 px-2 py-1 font-mono text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                          {formatLKR(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-500">{item.qty}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatLKR(Number(item.qty) * Number(item.unit_price))}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <SubmitButton
                            
                            form={`item-${item.id}`}
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                            Save
                          </SubmitButton>
                          <form action={deletePalletSpecItem}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="spec_id" value={id} />
                            <SubmitButton
                              
                              className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                              Remove
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

      </section>

      {canEdit && (
        <section id="spec" className="scroll-mt-24">
          <h2 className="text-sm font-semibold text-slate-700">Spec &amp; pricing</h2>
          <Card className="mt-3">
            <form action={updatePalletSpec} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={id} />

              <Field label="Spec name">
                <input name="name" defaultValue={spec.name} className={inputCls} required />
              </Field>
              <Field label="Customer">
                <select name="customer_id" defaultValue={spec.customer_id ?? ""} className={inputCls}>
                  <option value="">— None —</option>
                  {(customers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Pallet size">
                <input name="pallet_size" defaultValue={spec.pallet_size ?? ""} placeholder="e.g. 1200mm x 1200mm" className={inputCls} />
              </Field>
              <Field label="Base type">
                <select name="base_type" defaultValue={spec.base_type ?? ""} className={inputCls}>
                  <option value="">—</option>
                  <option value="2-way">2-way</option>
                  <option value="4-way">4-way</option>
                </select>
              </Field>

              <Field label="Treatment type">
                <select name="treatment_type" defaultValue={spec.treatment_type ?? "None"} className={inputCls}>
                  {treatmentOptions(spec.treatment_type).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Additional treatment">
                <select name="additional_treatment" defaultValue={spec.additional_treatment ?? "None"} className={inputCls}>
                  {treatmentOptions(spec.additional_treatment).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>

              <Field label="Wood species">
                <input name="wood_species" defaultValue={spec.wood_species ?? ""} className={inputCls} />
              </Field>
              <Field label="Plank thickness">
                <input name="plank_thickness" defaultValue={spec.plank_thickness ?? ""} placeholder="e.g. 24mm" className={inputCls} />
              </Field>

              <Field label="Planks (top deck)">
                <input name="planks_top" type="number" defaultValue={spec.planks_top ?? ""} className={inputCls} />
              </Field>
              <Field label="Planks (middle)">
                <input name="planks_middle" type="number" defaultValue={spec.planks_middle ?? ""} className={inputCls} />
              </Field>
              <Field label="Planks (bottom)">
                <input name="planks_bottom" type="number" defaultValue={spec.planks_bottom ?? ""} className={inputCls} />
              </Field>

              <Field label="Block spec">
                <input name="block_spec" defaultValue={spec.block_spec ?? ""} placeholder="e.g. 50mm x 100mm x 48in" className={inputCls} />
              </Field>
              <Field label="Block qty">
                <input name="block_qty" type="number" defaultValue={spec.block_qty ?? ""} className={inputCls} />
              </Field>

              <Field label="Wire nail spec">
                <input name="wire_nail_spec" defaultValue={spec.wire_nail_spec ?? ""} placeholder={'e.g. 2 1/2"'} className={inputCls} />
              </Field>
              <Field label="Wire nail qty">
                <input name="wire_nail_qty" type="number" defaultValue={spec.wire_nail_qty ?? ""} className={inputCls} />
              </Field>

              <Field label="Screw nail spec">
                <input name="screw_nail_spec" defaultValue={spec.screw_nail_spec ?? ""} placeholder={'e.g. 3/8"'} className={inputCls} />
              </Field>
              <Field label="Screw nail qty">
                <input name="screw_nail_qty" type="number" defaultValue={spec.screw_nail_qty ?? ""} className={inputCls} />
              </Field>

              <Field label="Margin %">
                <input
                  name="margin_pct"
                  type="number"
                  step="0.1"
                  defaultValue={Number(spec.margin_pct) * 100}
                  className={inputCls}
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                <input type="checkbox" name="planer" defaultChecked={spec.planer} className="rounded border-slate-300" />
                Planer finish
              </label>

              <Field label="Notes" full>
                <textarea name="notes" defaultValue={spec.notes ?? ""} rows={2} className={inputCls} />
              </Field>

              <div className="flex items-center gap-3 sm:col-span-2">
                <SubmitButton
                  
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                  Save spec
                </SubmitButton>
              </div>
            </form>

            <form action={deletePalletSpec} className="mt-4 border-t border-slate-200 pt-4">
              <input type="hidden" name="id" value={id} />
              <SubmitButton
                
                className="text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                Delete this spec
              </SubmitButton>
            </form>
          </Card>
        </section>
      )}

      {canEdit && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700">Add line item</h2>
          <Card className="mt-3">
            <form action={addPalletSpecItem} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <input type="hidden" name="spec_id" value={id} />
              <select
                name="cost_item_id"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:col-span-2"
              >
                <option value="">— Custom item —</option>
                {(costItems ?? []).map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    {ci.name} ({formatLKR(ci.unit_price)})
                  </option>
                ))}
              </select>
              <input
                name="item_name"
                placeholder="Custom item name"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <input
                name="qty"
                type="number"
                step="0.01"
                placeholder="Qty"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <SubmitButton
                
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                Add
              </SubmitButton>
            </form>
            <p className="mt-2 text-xs text-slate-400">
              Pick a material to use its current price, or leave it as a custom item and set unit price after adding.
            </p>
          </Card>
        </section>
      )}
    </div>
  );
}

const TREATMENT_OPTIONS = ["Heat Treated - ISPM 15", "CPI Treatment", "Kiln Drying", "None"];

/** The fixed options, keeping any legacy free-text value selectable. */
function treatmentOptions(current: string | null) {
  return current && !TREATMENT_OPTIONS.includes(current)
    ? [current, ...TREATMENT_OPTIONS]
    : TREATMENT_OPTIONS;
}

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${full ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}
