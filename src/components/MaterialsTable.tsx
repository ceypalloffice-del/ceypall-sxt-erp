"use client";

import { useMemo, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import { updateCostItemPrice, setCostItemActive } from "@/app/actions/cost-items";

type CostItem = {
  id: string;
  category: string;
  name: string;
  unit: string | null;
  unit_price: number;
  active: boolean;
};

const GROUPS = ["Planks", "Blocks", "Nails", "Others"] as const;
type Group = (typeof GROUPS)[number];

function groupFor(item: CostItem): Group {
  if (item.category === "nail") return "Nails";
  if (/block/i.test(item.name)) return "Blocks";
  if (/plank|beam/i.test(item.name)) return "Planks";
  return "Others";
}

export function MaterialsTable({ items, canEdit }: { items: CostItem[]; canEdit: boolean }) {
  const grouped = useMemo(() => {
    const map = new Map<Group, CostItem[]>(GROUPS.map((g) => [g, []]));
    for (const item of items) map.get(groupFor(item))!.push(item);
    return map;
  }, [items]);

  const [activeTab, setActiveTab] = useState<Group>(
    GROUPS.find((g) => (grouped.get(g)?.length ?? 0) > 0) ?? "Planks"
  );

  const rows = grouped.get(activeTab) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
        {GROUPS.map((g) => {
          const count = grouped.get(g)?.length ?? 0;
          const isActive = g === activeTab;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setActiveTab(g)}
              aria-pressed={isActive}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                isActive ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {g} <span className="text-slate-400">({count})</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={`No ${activeTab.toLowerCase()} yet`} hint="Add one below to get started." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 text-right font-medium">Unit price</th>
                {canEdit && <th className="px-4 py-3 font-medium">Active</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 capitalize text-slate-500">{item.category}</td>
                  <td className="px-4 py-3 text-slate-500">{item.unit ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {canEdit ? (
                      <form action={updateCostItemPrice} className="flex justify-end gap-2">
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          name="unit_price"
                          type="number"
                          step="0.01"
                          defaultValue={item.unit_price}
                          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right font-mono text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        />
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <span className="font-mono tabular-nums text-slate-900">{formatLKR(item.unit_price)}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <form action={setCostItemActive}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="active" value={item.active ? "false" : "true"} />
                        <button
                          type="submit"
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                            item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.active ? "Active" : "Inactive"}
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
