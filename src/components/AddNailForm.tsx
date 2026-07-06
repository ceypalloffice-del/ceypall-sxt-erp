"use client";

import { createNailItem } from "@/app/actions/cost-items";
import { SelectWithOther, input, label } from "@/components/AddPlankForm";
import { SubmitButton } from "@/components/SubmitButton";

const NAIL_TYPES = ["Wire Nails", "Screw Nails", "Coil Nails"];
const SIZES = ["2", "3", "4"];
const GAUGES = ["10", "12"];

export function AddNailForm() {
  return (
    <form action={createNailItem} className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <SelectWithOther
        title="Nail type"
        name="nail_type"
        customName="custom_type"
        customPlaceholder="Nail type name"
        options={NAIL_TYPES}
      />
      <SelectWithOther
        title="Nail size (inches)"
        name="nail_size"
        customName="custom_size"
        customPlaceholder="e.g. 2 1/2"
        options={SIZES}
      />
      <SelectWithOther
        title="Gauge"
        name="nail_gauge"
        customName="custom_gauge"
        customPlaceholder="e.g. 8"
        options={GAUGES}
      />
      <div>
        <span className={label}>Buying price</span>
        <div className="mt-1 flex gap-2">
          <select name="price_basis" defaultValue="kg" className={`${input} w-28`}>
            <option value="kg">Per kg</option>
            <option value="nail">Per nail</option>
          </select>
          <input
            name="unit_price"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="LKR"
            required
            className={`${input} font-mono tabular-nums`}
          />
        </div>
      </div>
      <div className="self-end">
        <SubmitButton className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
          Add nail
        </SubmitButton>
      </div>
    </form>
  );
}
