"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createVendorBill(formData: FormData) {
  const supabase = await createClient();
  const entityId = String(formData.get("entity_id") ?? "CPL");

  await supabase.from("vendor_bills").insert({
    entity_id: entityId,
    supplier_id: formData.get("supplier_id") || null,
    bill_no: formData.get("bill_no") || null,
    category: String(formData.get("category") ?? "material"),
    description: formData.get("description") || null,
    bill_date: formData.get("bill_date") || undefined,
    due_date: formData.get("due_date") || null,
    amount: Number(formData.get("amount") ?? 0),
  });

  revalidatePath("/vendor-bills");
}

export async function recordBillPayment(formData: FormData) {
  const supabase = await createClient();
  const billId = String(formData.get("bill_id"));
  const entityId = String(formData.get("entity_id"));
  const amount = Number(formData.get("amount") ?? 0);
  const method = String(formData.get("method") ?? "bank");

  await supabase.from("vendor_bill_payments").insert({
    entity_id: entityId,
    bill_id: billId,
    amount,
    method,
  });

  if (method === "petty_cash") {
    await supabase.from("petty_cash_transactions").insert({
      entity_id: entityId,
      type: "expense",
      category: "vendor_bill",
      description: `Bill payment ${billId}`,
      amount,
    });
  }

  const { data: bill } = await supabase
    .from("vendor_bills")
    .select("amount")
    .eq("id", billId)
    .single();
  const { data: payments } = await supabase
    .from("vendor_bill_payments")
    .select("amount")
    .eq("bill_id", billId);

  if (bill) {
    const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const status = totalPaid <= 0 ? "unpaid" : totalPaid >= Number(bill.amount) ? "paid" : "partial";
    await supabase.from("vendor_bills").update({ status }).eq("id", billId);
  }

  revalidatePath("/vendor-bills");
  revalidatePath("/petty-cash");
}
