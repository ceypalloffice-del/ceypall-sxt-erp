"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addPettyCashTopUp(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("petty_cash_transactions").insert({
    entity_id: String(formData.get("entity_id") ?? "CPL"),
    type: "top_up",
    description: formData.get("description") || null,
    amount: Number(formData.get("amount") ?? 0),
    txn_date: formData.get("txn_date") || undefined,
  });
  revalidatePath("/petty-cash");
}

export async function addPettyCashExpense(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("petty_cash_transactions").insert({
    entity_id: String(formData.get("entity_id") ?? "CPL"),
    type: "expense",
    category: String(formData.get("category") ?? "other"),
    description: formData.get("description") || null,
    amount: Number(formData.get("amount") ?? 0),
    txn_date: formData.get("txn_date") || undefined,
  });
  revalidatePath("/petty-cash");
}
