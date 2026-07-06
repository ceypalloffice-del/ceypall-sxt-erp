"use client";

import { useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import { SubmitButton } from "@/components/SubmitButton";
import {
  createPlankRate,
  updatePlankRate,
  setPlankRateActive,
  createBeamRate,
  updateBeamRate,
  setBeamRateActive,
} from "@/app/actions/treatment-rates";

type PlankRate = {
  id: string;
  service: string;
  thickness: string;
  rate_per_sqft: number;
  active: boolean;
};

type BeamRate = {
  id: string;
  service: string;
  height: string;
  width: string;
  rate_per_lft: number;
  active: boolean;
};

const SERVICES = [
  { value: "kiln_drying", label: "Kiln Drying" },
  { value: "impregnation", label: "Chemical Impregnation" },
] as const;

export function TreatmentRatesView({
  plankRates,
  beamRates,
  canEdit,
}: {
  plankRates: PlankRate[];
  beamRates: BeamRate[];
  canEdit: boolean;
}) {
  const [service, setService] = useState<string>("kiln_drying");

  const planks = plankRates.filter((r) => r.service === service);
  const beams = beamRates.filter((r) => r.service === service);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
        {SERVICES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setService(s.value)}
            aria-pressed={service === s.value}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
              service === s.value ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-700">Plank rates (per sqft, by thickness)</h2>
        <Card className="mt-3 p-0">
          {planks.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No plank rates yet" hint="Add a thickness and rate below." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Thickness</th>
                  <th className="px-4 py-3 text-right font-medium">Rate / sqft</th>
                  {canEdit && <th className="px-4 py-3 font-medium">Active</th>}
                </tr>
              </thead>
              <tbody>
                {planks.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-900">{r.thickness}</td>
                    <td className="px-4 py-3 text-right">
                      {canEdit ? (
                        <form action={updatePlankRate} className="flex justify-end gap-2">
                          <input type="hidden" name="id" value={r.id} />
                          <input
                            name="rate_per_sqft"
                            type="number"
                            step="0.01"
                            defaultValue={r.rate_per_sqft}
                            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right font-mono text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          />
                          <SubmitButton
                            
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                            Save
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className="font-mono tabular-nums text-slate-900">{formatLKR(r.rate_per_sqft)}</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <form action={setPlankRateActive}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="active" value={r.active ? "false" : "true"} />
                          <SubmitButton
                            
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                              r.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}>
                            {r.active ? "Active" : "Inactive"}
                          </SubmitButton>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {canEdit && (
          <Card className="mt-3">
            <form action={createPlankRate} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input type="hidden" name="service" value={service} />
              <input
                name="thickness"
                placeholder={'Thickness, e.g. 1"'}
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <input
                name="rate_per_sqft"
                type="number"
                step="0.01"
                placeholder="Rate per sqft"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <SubmitButton
                
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                Add plank rate
              </SubmitButton>
            </form>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700">Beam rates (per LFT, by height x width)</h2>
        <Card className="mt-3 p-0">
          {beams.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No beam rates yet" hint="Add a dimension and rate below." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Height x width</th>
                  <th className="px-4 py-3 text-right font-medium">Rate / LFT</th>
                  {canEdit && <th className="px-4 py-3 font-medium">Active</th>}
                </tr>
              </thead>
              <tbody>
                {beams.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-900">
                      {r.height} x {r.width}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit ? (
                        <form action={updateBeamRate} className="flex justify-end gap-2">
                          <input type="hidden" name="id" value={r.id} />
                          <input
                            name="rate_per_lft"
                            type="number"
                            step="0.01"
                            defaultValue={r.rate_per_lft}
                            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right font-mono text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          />
                          <SubmitButton
                            
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                            Save
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className="font-mono tabular-nums text-slate-900">{formatLKR(r.rate_per_lft)}</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <form action={setBeamRateActive}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="active" value={r.active ? "false" : "true"} />
                          <SubmitButton
                            
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                              r.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}>
                            {r.active ? "Active" : "Inactive"}
                          </SubmitButton>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {canEdit && (
          <Card className="mt-3">
            <form action={createBeamRate} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input type="hidden" name="service" value={service} />
              <input
                name="height"
                placeholder={'Height, e.g. 2"'}
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <input
                name="width"
                placeholder={'Width, e.g. 4"'}
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <input
                name="rate_per_lft"
                type="number"
                step="0.01"
                placeholder="Rate per LFT"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <SubmitButton
                
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                Add beam rate
              </SubmitButton>
            </form>
          </Card>
        )}
      </section>
    </div>
  );
}
