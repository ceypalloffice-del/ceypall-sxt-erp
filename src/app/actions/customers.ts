"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile, getActiveEntity } from "@/lib/session";

const DETAIL_FIELDS = [
  "type",
  "phone",
  "email",
  "address",
  "delivery_address",
  "vat_tin",
  "accounts_contact",
  "accounts_phone",
  "accounts_email",
  "operations_contact",
  "operations_phone",
  "operations_email",
  "procurement_contact",
  "procurement_phone",
  "procurement_email",
  "notes",
] as const;

function readDetails(formData: FormData) {
  const details: Record<string, string | number | null> = {};
  for (const field of DETAIL_FIELDS) {
    const value = String(formData.get(field) ?? "").trim();
    details[field] = value || null;
  }
  const creditDays = Number(formData.get("credit_days"));
  details.credit_days = Number.isFinite(creditDays) && creditDays >= 0 ? creditDays : 30;
  return details;
}

export async function createCustomer(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const active = await getActiveEntity(profile);
  const entityField = String(formData.get("entity_id") ?? "");
  const entityId =
    active !== "ALL" ? active : ["SXT", "CPL"].includes(entityField) ? entityField : null;
  if (!entityId) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ entity_id: entityId, name, ...readDetails(formData) })
    .select("id")
    .single();

  if (error || !data) redirect(`/customers?error=${encodeURIComponent(error?.message ?? "Could not add customer")}`);

  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const supabase = await createClient();
  await supabase.from("customers").update({ name, ...readDetails(formData) }).eq("id", id);

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}?saved=1`);
}

export async function deleteCustomer(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    const message = error.message.includes("violates foreign key")
      ? "This customer has invoices, jobs or quotes on record and can't be deleted. Keep them for history."
      : error.message;
    redirect(`/customers/${id}/edit?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/customers");
  redirect("/customers");
}
