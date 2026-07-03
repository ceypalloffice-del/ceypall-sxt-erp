"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";

/** Save manual price overrides for a single price list row. */
export async function updateCpiPriceRow(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const supabase = await createClient();
  const id = String(formData.get("id"));

  const parsePrice = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : Number(v);
  };

  await supabase
    .from("cpi_price_lists")
    .update({
      manual_chemical_per_piece: parsePrice("manual_chemical_per_piece"),
      manual_kiln_per_piece: parsePrice("manual_kiln_per_piece"),
      manual_both_per_piece: parsePrice("manual_both_per_piece"),
    })
    .eq("id", id);

  revalidatePath("/cpi-suite/price-lists");
}

/** Add or update a competitor's price for a specific size. */
export async function upsertCpiCompetitorPrice(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const supabase = await createClient();

  const competitor_id = String(formData.get("competitor_id"));
  const size_label = String(formData.get("size_label"));
  const item_type = String(formData.get("item_type"));
  const chemical_per_piece = Number(formData.get("chemical_per_piece")) || null;

  await supabase.from("cpi_competitor_prices").upsert(
    {
      competitor_id,
      size_label,
      item_type,
      chemical_per_piece,
      effective_date: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "competitor_id,size_label,item_type" }
  );

  revalidatePath("/cpi-suite/competitors");
}
