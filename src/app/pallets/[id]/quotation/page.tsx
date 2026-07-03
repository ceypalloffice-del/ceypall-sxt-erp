import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeCosting } from "@/lib/costing";
import { QuotationView } from "@/components/QuotationView";

export default async function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: spec } = await supabase
    .from("pallet_specs")
    .select("*, customers(name, phone, email)")
    .eq("id", id)
    .single();

  if (!spec) notFound();

  const { data: items } = await supabase
    .from("pallet_spec_items")
    .select("unit_price, qty")
    .eq("spec_id", id);

  const grandTotal = (items ?? []).reduce((sum, r) => sum + Number(r.qty) * Number(r.unit_price), 0);
  const { finalPrice } = computeCosting(grandTotal, Number(spec.margin_pct));

  const customerName: string = spec.customers?.name ?? "";

  return (
    <QuotationView
      spec={spec}
      defaultUnitPrice={finalPrice}
      defaultCustomerName={customerName}
      defaultCustomerAddress=""
    />
  );
}
