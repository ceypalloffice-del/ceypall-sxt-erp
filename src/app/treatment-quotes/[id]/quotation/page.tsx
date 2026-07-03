import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeCosting } from "@/lib/costing";
import { TreatmentQuotationView } from "@/components/TreatmentQuotationView";

export default async function TreatmentQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("treatment_quotes")
    .select("*, customers(name)")
    .eq("id", id)
    .single();

  if (!quote) notFound();

  const subtotal = Number(quote.qty) * Number(quote.rate_used);
  const { finalPrice } = computeCosting(subtotal, Number(quote.margin_pct));

  const customerName: string = quote.customers?.name ?? "";

  return (
    <TreatmentQuotationView
      quote={quote}
      defaultUnitPrice={finalPrice}
      defaultCustomerName={customerName}
      defaultCustomerAddress=""
    />
  );
}
