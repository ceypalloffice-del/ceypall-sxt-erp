"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";
import { colombLocalToISO } from "@/lib/sxt-engine/cost";

async function assertCanEdit() {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) throw new Error("Unauthorized");
}

export async function createBatch(formData: FormData) {
  await assertCanEdit();
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();

  // Fetch live settings to snapshot into the batch record
  const { data: settings } = await supabase
    .from("sxt_settings")
    .select("key, value")
    .in("key", [
      "electricity_units_per_day",
      "electricity_rate",
      "drying_days",
      "labour_cost_per_batch",
    ]);

  const s = Object.fromEntries((settings ?? []).map((r) => [r.key, Number(r.value)]));

  const { data, error } = await supabase
    .from("sxt_batches")
    .insert({
      batch_no: "",            // trigger fills this automatically
      electricity_units_per_day: s.electricity_units_per_day ?? 125,
      drying_days: s.drying_days ?? 10,
      electricity_rate: s.electricity_rate ?? 45,
      labour_cost: s.labour_cost_per_batch ?? 5000,
      notes: formData.get("notes") || null,
      created_by: user.user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return;
  redirect(`/treatment-suite/batches/${data.id}`);
}

export async function addBatchItem(formData: FormData) {
  await assertCanEdit();
  const supabase = await createClient();

  const batchId = String(formData.get("batch_id"));
  const customerId = formData.get("customer_id") as string | null;
  const customerName = String(formData.get("customer_name") ?? "").trim();

  await supabase.from("sxt_batch_items").insert({
    batch_id: batchId,
    customer_id: customerId || null,
    customer_name: customerName || null,
    thickness_in: Number(formData.get("thickness_in")),
    width_in: Number(formData.get("width_in")),
    length_ft: Number(formData.get("length_ft")),
    qty: Number(formData.get("qty")),
    treatment_type: String(formData.get("treatment_type") ?? "kiln_drying"),
    rate_per_sqft: formData.get("rate_per_sqft") ? Number(formData.get("rate_per_sqft")) : null,
    notes: formData.get("item_notes") || null,
  });

  revalidatePath(`/treatment-suite/batches/${batchId}`);
}

export async function removeBatchItem(formData: FormData) {
  await assertCanEdit();
  const supabase = await createClient();

  const itemId = String(formData.get("item_id"));
  const batchId = String(formData.get("batch_id"));

  await supabase.from("sxt_batch_items").delete().eq("id", itemId);

  revalidatePath(`/treatment-suite/batches/${batchId}`);
}

export async function updateBatchStatus(formData: FormData) {
  await assertCanEdit();
  const supabase = await createClient();

  const batchId = String(formData.get("batch_id"));
  const status = String(formData.get("status"));

  const update: Record<string, unknown> = { status };
  // Capture full timestamp (not just date) when status changes
  if (status === "drying") update.started_at = new Date().toISOString();
  if (status === "complete") update.completed_at = new Date().toISOString();

  await supabase.from("sxt_batches").update(update).eq("id", batchId);

  revalidatePath(`/treatment-suite/batches/${batchId}`);
  revalidatePath("/treatment-suite/batches");
}

/** Manually set or correct the start/end timestamps for a batch.
 *  Input values are datetime-local strings in Asia/Colombo (UTC+5:30). */
export async function updateBatchTimes(formData: FormData) {
  await assertCanEdit();
  const supabase = await createClient();

  const batchId = String(formData.get("batch_id"));
  const startedLocal = String(formData.get("started_at") ?? "").trim();
  const completedLocal = String(formData.get("completed_at") ?? "").trim();

  await supabase
    .from("sxt_batches")
    .update({
      started_at: startedLocal ? colombLocalToISO(startedLocal) : null,
      completed_at: completedLocal ? colombLocalToISO(completedLocal) : null,
    })
    .eq("id", batchId);

  revalidatePath(`/treatment-suite/batches/${batchId}`);
}
