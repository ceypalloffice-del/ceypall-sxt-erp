"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";

export async function createCpiLog(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  const n = (k: string) => Number(formData.get(k) ?? 0);

  await supabase.from("cpi_treatment_logs").insert({
    log_no: "",
    log_date: String(formData.get("log_date") || new Date().toISOString().slice(0, 10)),
    operator: String(formData.get("operator") ?? "").trim() || null,
    tank_drop_in: n("tank_drop_in"),
    litres_used: n("litres_used"),
    borax_kg: n("borax_kg"),
    boric_kg: n("boric_kg"),
    anti_borer_ml: n("anti_borer_ml"),
    borax_cost: n("borax_cost"),
    boric_cost: n("boric_cost"),
    anti_borer_cost: n("anti_borer_cost"),
    chemical_cost: n("chemical_cost"),
    labour_cost: n("labour_cost"),
    electricity_cost: n("electricity_cost"),
    total_cost: n("total_cost"),
    board_feet: n("board_feet") || null,
    cost_per_bf: n("cost_per_bf") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.user?.id ?? null,
  });

  revalidatePath("/cpi-suite");
  revalidatePath("/cpi-suite/costing");
}
