import { type EntityKey, ENTITIES } from "@/lib/entities";

export function Card({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-50 text-amber-700",
  complete: "bg-blue-50 text-blue-700",
  invoiced: "bg-violet-50 text-violet-700",
  closed: "bg-slate-100 text-slate-500",
  unpaid: "bg-red-50 text-red-700",
  partial: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  // inventory stock status
  ok: "bg-emerald-50 text-emerald-700",
  low: "bg-amber-50 text-amber-700",
  out_of_stock: "bg-red-50 text-red-700",
  overstock: "bg-blue-50 text-blue-700",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export function EntityTag({ entityId }: { entityId: EntityKey }) {
  const entity = ENTITIES[entityId];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: entity.tint, color: entity.accent }}
    >
      {entityId === "ALL" ? "Consolidated" : entityId}
    </span>
  );
}

export function AgeingDot({ bucket }: { bucket: "green" | "orange" | "red" }) {
  const colors = { green: "#16A34A", orange: "#D97706", red: "#DC2626" };
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: colors[bucket] }}
      aria-label={bucket}
    />
  );
}
