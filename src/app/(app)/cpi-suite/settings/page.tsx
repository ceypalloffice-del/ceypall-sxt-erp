import { createClient } from "@/lib/supabase/server";
import { parseCpiSettings } from "@/lib/cpi-engine/types";
import { updateCpiSettings } from "@/app/actions/cpi-settings";
import { SubmitButton } from "@/components/SubmitButton";

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400";

function Field({
  name,
  label,
  unit,
  value,
  step = "0.01",
  type = "number",
}: {
  name: string;
  label: string;
  unit?: string;
  value: string | number;
  step?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500">
        {label}
        {unit && (
          <span className="ml-1 font-normal text-slate-400">({unit})</span>
        )}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={String(value)}
        step={type === "number" ? step : undefined}
        min={type === "number" ? "0" : undefined}
        className={inputCls}
      />
    </div>
  );
}

export default async function CpiSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("cpi_settings").select("key, value");
  const s = parseCpiSettings(data ?? []);

  const submitBtn = (
    <SubmitButton
      
      className="rounded-md bg-emerald-700 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
      Save settings
    </SubmitButton>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-lg font-semibold text-slate-900">CPI Settings</h1>

      {/* ── Machine ── */}
      <form action={updateCpiSettings} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Machine Dimensions
          <span className="ml-2 text-xs font-normal text-slate-400">
            Rarely change
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field name="tank_diameter_in" label="Tank Diameter" unit="in" value={s.tank_diameter_in} step="0.5" />
          <Field name="tank_height_ft" label="Tank Height" unit="ft" value={s.tank_height_ft} step="0.5" />
          <Field name="cylinder_diameter_in" label="Cylinder Dia." unit="in" value={s.cylinder_diameter_in} step="0.5" />
          <Field name="cylinder_length_ft" label="Cylinder Length" unit="ft" value={s.cylinder_length_ft} step="0.5" />
          <Field name="tray_diameter_in" label="Tray Diameter" unit="in" value={s.tray_diameter_in} step="0.5" />
          <Field name="tray_length_ft" label="Tray Length" unit="ft" value={s.tray_length_ft} step="0.5" />
          <Field name="tray_capacity_cuft" label="Tray Capacity" unit="cu.ft" value={s.tray_capacity_cuft} step="1" />
          <Field name="bf_capacity" label="Board Feet Capacity" unit="BF" value={s.bf_capacity} step="1" />
          <Field name="default_tank_drop_in" label="Default Chemical Level" unit="in" value={s.default_tank_drop_in} step="0.5" />
        </div>
        {submitBtn}
      </form>

      {/* ── Formula ── */}
      <form action={updateCpiSettings} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Chemical Formula
          <span className="ml-2 text-xs font-normal text-slate-400">
            Quantities per 100 litres of solution
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field name="borax_per_100l" label="Borax" unit="kg / 100 L" value={s.borax_per_100l} step="0.1" />
          <Field name="boric_per_100l" label="Boric Acid" unit="kg / 100 L" value={s.boric_per_100l} step="0.1" />
          <Field name="anti_borer_ml_per_100l" label="Anti Borer" unit="ml / 100 L" value={s.anti_borer_ml_per_100l} step="1" />
        </div>
        {submitBtn}
      </form>

      {/* ── Prices ── */}
      <form action={updateCpiSettings} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Chemical &amp; Operating Costs
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field name="borax_price_per_kg" label="Borax Price" unit="LKR / kg" value={s.borax_price_per_kg} step="10" />
          <Field name="boric_price_per_kg" label="Boric Acid Price" unit="LKR / kg" value={s.boric_price_per_kg} step="10" />
          <Field name="anti_borer_price_per_l" label="Anti Borer Price" unit="LKR / litre" value={s.anti_borer_price_per_l} step="100" />
          <Field name="labour_cost" label="Labour Cost" unit="LKR / treatment" value={s.labour_cost} step="100" />
          <Field name="electricity_cost" label="Electricity Cost" unit="LKR / treatment" value={s.electricity_cost} step="100" />
        </div>
        {submitBtn}
      </form>

      {/* ── Profit target ── */}
      <form action={updateCpiSettings} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Profit Target</h2>
        <div className="flex flex-wrap gap-3">
          {[20, 25, 30, 35, 40].map((pct) => (
            <SubmitButton
              key={pct}
              
              name="target_margin_pct"
              value={pct}
              className={`rounded-lg border px-5 py-2 text-sm font-semibold transition-colors ${
                s.target_margin_pct === pct
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
              }`}>
              {pct}%
            </SubmitButton>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="target_margin_pct"
              defaultValue={s.target_margin_pct}
              min="0"
              max="99"
              step="1"
              className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            />
            <span className="text-sm text-slate-500">% custom</span>
            <SubmitButton
              
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Set
            </SubmitButton>
          </div>
        </div>
      </form>

      {/* ── Pricing mode ── */}
      <form action={updateCpiSettings} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Pricing Mode</h2>
        <div className="flex flex-wrap gap-3">
          {[
            {
              v: "auto",
              label: "Auto",
              desc: "Prices calculated from live costs + margin target",
            },
            {
              v: "manual",
              label: "Manual",
              desc: "Stored per-size overrides take precedence",
            },
          ].map(({ v, label, desc }) => (
            <SubmitButton
              key={v}
              
              name="pricing_mode"
              value={v}
              className={`rounded-lg border px-5 py-3 text-left text-sm transition-colors ${
                s.pricing_mode === v
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
              }`}>
              <p className="font-semibold">{label}</p>
              <p className="mt-0.5 text-xs font-normal text-slate-500">
                {desc}
              </p>
            </SubmitButton>
          ))}
        </div>
      </form>
    </div>
  );
}
