"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ENTITY = "SXT";

export async function createTreatmentQuote(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { data, error } = await supabase
    .from("treatment_quotes")
    .insert({ entity_id: ENTITY, name, service: "kiln_drying", item_kind: "plank" })
    .select("id")
    .single();

  if (error || !data) return;
  redirect(`/treatment-quotes/${data.id}`);
}

export async function updateTreatmentQuote(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const itemKind = String(formData.get("item_kind") ?? "plank");

  await supabase
    .from("treatment_quotes")
    .update({
      name: String(formData.get("name") ?? ""),
      customer_id: formData.get("customer_id") || null,
      service: String(formData.get("service") ?? "kiln_drying"),
      item_kind: itemKind,
      thickness: itemKind === "plank" ? formData.get("thickness") || null : null,
      height: itemKind === "beam" ? formData.get("height") || null : null,
      width: itemKind === "beam" ? formData.get("width") || null : null,
      qty: Number(formData.get("qty") ?? 0),
      rate_used: Number(formData.get("rate_used") ?? 0),
      margin_pct: Number(formData.get("margin_pct") ?? 0) / 100,
      notes: formData.get("notes") || null,
    })
    .eq("id", id);

  revalidatePath(`/treatment-quotes/${id}`);
}

export async function deleteTreatmentQuote(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  await supabase.from("treatment_quotes").delete().eq("id", id);
  redirect("/treatment-quotes");
}
