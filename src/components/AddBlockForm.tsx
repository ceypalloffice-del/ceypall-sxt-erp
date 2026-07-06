"use client";

import { createBlockItem } from "@/app/actions/cost-items";
import { SelectWithOther, input, label } from "@/components/AddPlankForm";
import { SubmitButton } from "@/components/SubmitButton";

const SPECIES = ["Rubber", "Lunumidella"];
const DIMENSIONS = ['75mm x 100mm (3"x4")', '100mm x 100mm (4" x 4")'];

export function AddBlockForm() {
  return (
    <form action={createBlockItem} className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SelectWithOther
        title="Wood species"
        name="wood_species"
        customName="custom_species"
        customPlaceholder="Species name"
        options={SPECIES}
      />
      <SelectWithOther
        title="Block dimensions"
        name="block_dimensions"
        customName="custom_dimensions"
        customPlaceholder="e.g. 50mm x 75mm (2&quot;x3&quot;)"
        options={DIMENSIONS}
      />
      <div>
        <span className={label}>Buying price</span>
        <div className="mt-1 flex gap-2">
          <select name="price_basis" defaultValue="ft" className={`${input} w-32`}>
            <option value="ft">Per ft</option>
            <option value="beam">Per beam</option>
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
        <SubmitButton
          
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
          Add block
        </SubmitButton>
      </div>
    </form>
  );
}
