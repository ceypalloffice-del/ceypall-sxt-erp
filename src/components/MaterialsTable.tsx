"use client";

import { useMemo, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import { updateCostItem, updateCostItemPrice, setCostItemActive, deleteCostItem } from "@/app/actions/cost-items";
import { SubmitButton } from "@/components/SubmitButton";

type CostItem = {
  id: string;
  category: string;
  name: string;
  unit: string | null;
  unit_price: number;
  active: boolean;
};

const GROUPS = ["Planks", "Blocks", "Nails", "Others"] as const;
export type MaterialGroup = (typeof GROUPS)[number];
type Group = MaterialGroup;

function groupFor(item: CostItem): Group {
  if (item.category === "nail") return "Nails";
  if (/block/i.test(item.name)) return "Blocks";
  if (/plank|beam/i.test(item.name)) return "Planks";
  return "Others";
}

export function MaterialsTable({
  items,
  canEdit,
  addForms,
}: {
  items: CostItem[];
  canEdit: boolean;
  /** Per-tab add form, rendered below the table for the active tab only. */
  addForms?: Partial<Record<Group, React.ReactNode>>;
}) {
  const grouped = useMemo(() => {
    const map = new Map<Group, CostItem[]>(GROUPS.map((g) => [g, []]));
    for (const item of items) map.get(groupFor(item))!.push(item);
    return map;
  }, [items]);

  const [activeTab, setActiveTab] = useState<Group>(
    GROUPS.find((g) => (grouped.get(g)?.length ?? 0) > 0) ?? "Planks"
  );
  const [editingId, setEditingId] = useState<string | null>(null);

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
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const isEditing = canEdit && editingId === item.id;
                const formId = `edit-${item.id}`;
                return (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-900">
                      {isEditing ? (
                        <input
                          name="name"
                          form={formId}
                          defaultValue={item.name}
                          required
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        />
                      ) : (
                        item.name
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-500">{item.category}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {isEditing ? (
                        <input
                          name="unit"
                          form={formId}
                          defaultValue={item.unit ?? ""}
                          placeholder="e.g. pc"
                          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        />
                      ) : (
                        item.unit ?? "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          name="unit_price"
                          form={formId}
                          type="number"
                          step="0.01"
                          defaultValue={item.unit_price}
                          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right font-mono text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        />
                      ) : canEdit ? (
                        <form action={updateCostItemPrice} className="flex justify-end gap-2">
                          <input type="hidden" name="id" value={item.id} />
                          <input
                            name="unit_price"
                            type="number"
                            step="0.01"
                            defaultValue={item.unit_price}
                            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right font-mono text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          />
                          <SubmitButton
                            
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                            Save
                          </SubmitButton>
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
                          <SubmitButton
                            
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                              item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}>
                            {item.active ? "Active" : "Inactive"}
                          </SubmitButton>
                        </form>
                      </td>
                    )}
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <form id={formId} action={updateCostItem}>
                              <input type="hidden" name="id" value={item.id} />
                            </form>
                            <SubmitButton
                              
                              form={formId}
                              className="rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                              Save
                            </SubmitButton>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingId(item.id)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                              Edit
                            </button>
                            <form action={deleteCostItem}>
                              <input type="hidden" name="id" value={item.id} />
                              <SubmitButton
                                
                                className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                                Delete
                              </SubmitButton>
                            </form>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {canEdit && addForms?.[activeTab]}
    </div>
  );
}
