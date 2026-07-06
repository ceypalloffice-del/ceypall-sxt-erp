import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";
import { Card } from "@/components/ui";
import { updateSxtSettings } from "@/app/actions/sxt-settings";
import { SubmitButton } from "@/components/SubmitButton";

const FIELD_GROUPS = [
  {
    title: "Kiln Specifications",
    fields: [
      { key: "kiln_capacity_m3", label: "Kiln Capacity (m³)", type: "number", step: "0.1" },
      { key: "kiln_length_ft", label: "Kiln Length (ft)", type: "number", step: "0.5" },
      { key: "kiln_width_ft", label: "Kiln Width (ft)", type: "number", step: "0.5" },
      { key: "kiln_height_ft", label: "Kiln Height — stacking space (ft)", type: "number", step: "0.5" },
      { key: "sticker_thickness_in", label: "Sticker Thickness (inches)", type: "number", step: "0.125" },
    ],
  },
  {
    title: "Electricity & Cost",
    fields: [
      { key: "electricity_units_per_day", label: "Electricity Usage (kWh/day)", type: "number", step: "1" },
      { key: "electricity_rate", label: "Electricity Rate (LKR/kWh)", type: "number", step: "0.50" },
      { key: "drying_days", label: "Standard Drying Period (days)", type: "number", step: "1" },
      { key: "labour_cost_per_batch", label: "Labour Cost per Batch (LKR)", type: "number", step: "100" },
      { key: "target_margin_pct", label: "Target Gross Margin (%)", type: "number", step: "1" },
    ],
  },
  {
    title: "Company (Quotations)",
    fields: [
      { key: "company_name", label: "Company Name", type: "text" },
      { key: "company_address", label: "Address", type: "text" },
      { key: "company_phone", label: "Phone", type: "text" },
      { key: "quotation_terms", label: "Terms & Conditions", type: "textarea" },
    ],
  },
];

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 font-mono tabular-nums";

export default async function TreatmentSettingsPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);

  const { data } = await supabase.from("sxt_settings").select("key, value");
  const settings = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">KD Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          All values used by the calculation engine — no hardcoded numbers anywhere.
        </p>
      </div>

      <form action={updateSxtSettings} className="space-y-6">
        {FIELD_GROUPS.map((group) => (
          <Card key={group.title}>
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{group.title}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {group.fields.map((f) => (
                <label key={f.key} className="block text-sm text-slate-600">
                  {f.label}
                  {f.type === "textarea" ? (
                    <textarea
                      name={f.key}
                      defaultValue={settings[f.key] ?? ""}
                      rows={3}
                      disabled={!canEdit}
                      className={`${inputCls} sm:col-span-2 font-sans`}
                    />
                  ) : (
                    <input
                      type={f.type}
                      name={f.key}
                      step={(f as { step?: string }).step}
                      defaultValue={settings[f.key] ?? ""}
                      disabled={!canEdit}
                      className={inputCls}
                    />
                  )}
                </label>
              ))}
            </div>
          </Card>
        ))}

        {canEdit && (
          <SubmitButton
            
            className="rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
            Save settings
          </SubmitButton>
        )}
      </form>
    </div>
  );
}
