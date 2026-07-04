import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState } from "@/components/ui";
import { formatLKR } from "@/lib/format";
import { computeCosting } from "@/lib/costing";
import { createPalletSpec, deletePalletSpec } from "@/app/actions/pallet-specs";

export default async function PalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: focusNew } = await searchParams;
  const supabase = await createClient();
  const profile = await getProfile();
  const canEdit = canKeepBooks(profile);
  const activeEntity = await getActiveEntity(profile);

  if (activeEntity === "SXT") {
    return (
      <EmptyState
        title="Not available for St. Xavier Timber"
        hint="Pallet costing is a CeyPall-only operation. Switch entity to view it."
      />
    );
  }

  const { data: specs } = await supabase
    .from("pallet_specs")
    .select("id, name, pallet_size, treatment_type, margin_pct, customers(name)")
    .eq("entity_id", "CPL")
    .order("created_at", { ascending: false });

  const { data: costing } = await supabase.from("pallet_spec_costing").select("spec_id, grand_total");
  const totalsBySpec = new Map((costing ?? []).map((c) => [c.spec_id, Number(c.grand_total)]));

  const rows = specs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Pallet &amp; crate costings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bill-of-materials costings for CeyPall pallet and crate designs.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No pallet specs yet" hint="Create one below to start costing." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Spec</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Treatment</th>
                <th className="px-4 py-3 text-right font-medium">Grand total</th>
                <th className="px-4 py-3 text-right font-medium">Margin</th>
                <th className="px-4 py-3 text-right font-medium">Final price</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((spec) => {
                const grandTotal = totalsBySpec.get(spec.id) ?? 0;
                const { finalPrice } = computeCosting(grandTotal, Number(spec.margin_pct));
                return (
                  <tr key={spec.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">
                      <Link href={`/pallets/${spec.id}`} className="underline-offset-2 hover:underline">
                        {spec.name}
                      </Link>
                    </td>
                    {/* @ts-expect-error -- joined relation shape */}
                    <td className="px-4 py-3 text-slate-500">{spec.customers?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{spec.pallet_size ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{spec.treatment_type ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                      {formatLKR(grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500">
                      {(Number(spec.margin_pct) * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatLKR(finalPrice)}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/pallets/${spec.id}#spec`}
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          >
                            Edit
                          </Link>
                          <form action={deletePalletSpec}>
                            <input type="hidden" name="id" value={spec.id} />
                            <button
                              type="submit"
                              className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {canEdit && (
        <Card id="new-spec" className="scroll-mt-24">
          <h2 className="text-sm font-semibold text-slate-700">New pallet/crate spec</h2>
          <form action={createPalletSpec} className="mt-3 flex gap-3">
            <input
              name="name"
              placeholder="e.g. 48 x 48 CPI Pallet"
              required
              autoFocus={focusNew === "1"}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Create
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
