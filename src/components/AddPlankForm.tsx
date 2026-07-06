"use client";

import { useState } from "react";
import { createPlankItem } from "@/app/actions/cost-items";
import { SubmitButton } from "@/components/SubmitButton";

const SPECIES = ["Rubber", "Lunumidella", "Pine"];
const WIDTHS = ['3"', '4"', '5"', '6"'];
const LENGTHS = ["3'", "4'", "5'", "6'"];
const THICKNESSES = ['5/8"', '3/4"', '7/8"', '1"'];

export const input =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";
export const label = "block text-xs font-medium text-slate-500";

export function SelectWithOther({
  title,
  name,
  customName,
  customPlaceholder,
  options,
}: {
  title: string;
  name: string;
  customName: string;
  customPlaceholder: string;
  options: string[];
}) {
  const [isOther, setIsOther] = useState(false);
  return (
    <div>
      <span className={label}>{title}</span>
      <select
        name={name}
        defaultValue={options[0]}
        onChange={(e) => setIsOther(e.target.value === "Other")}
        className={`mt-1 ${input}`}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        <option value="Other">Other…</option>
      </select>
      {isOther && (
        <input
          name={customName}
          placeholder={customPlaceholder}
          required
          autoFocus
          className={`mt-2 ${input}`}
        />
      )}
    </div>
  );
}

export function AddPlankForm() {
  return (
    <form action={createPlankItem} className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <SelectWithOther
        title="Wood species"
        name="wood_species"
        customName="custom_species"
        customPlaceholder="Species name"
        options={SPECIES}
      />
      <SelectWithOther
        title="Plank width"
        name="plank_width"
        customName="custom_width"
        customPlaceholder={'Width (e.g. 7")'}
        options={WIDTHS}
      />
      <SelectWithOther
        title="Length"
        name="plank_length"
        customName="custom_length"
        customPlaceholder={"Length (e.g. 8')"}
        options={LENGTHS}
      />
      <div>
        <span className={label}>Thickness</span>
        <select name="plank_thickness" defaultValue={THICKNESSES[0]} className={`mt-1 ${input}`}>
          {THICKNESSES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <span className={label}>Buying price</span>
        <div className="mt-1 flex gap-2">
          <select name="price_basis" defaultValue="ft" className={`${input} w-28`}>
            <option value="ft">Per ft</option>
            <option value="plank">Per plank</option>
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
          Add plank
        </SubmitButton>
      </div>
    </form>
  );
}
