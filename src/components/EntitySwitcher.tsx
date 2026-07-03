"use client";

import { useTransition } from "react";
import { setActiveEntity } from "@/app/actions/entity";
import { ENTITIES, type EntityKey } from "@/lib/entities";

const OPTIONS: EntityKey[] = ["SXT", "CPL", "ALL"];

export function EntitySwitcher({ active }: { active: EntityKey }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {OPTIONS.map((key) => {
        const entity = ENTITIES[key];
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => setActiveEntity(key))}
            aria-pressed={isActive}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
            style={
              isActive
                ? { backgroundColor: entity.tint, color: entity.accent }
                : { color: "#64748b" }
            }
          >
            {key === "ALL" ? "Consolidated" : key}
          </button>
        );
      })}
    </div>
  );
}
