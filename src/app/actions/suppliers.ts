"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canKeepBooks, getProfile } from "@/lib/session";

function readDetails(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? "").trim() || null;
  return {
    category: text("category"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
  };
}

export async function createSupplier(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      entity_id: String(formData.get("entity_id") ?? "CPL"),
      name,
      ...readDetails(formData),
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/suppliers?error=${encodeURIComponent(error?.message ?? "Could not add supplier")}`);
  }

  revalidatePath("/suppliers");
  redirect(`/suppliers/${data.id}`);
}

export async function updateSupplier(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const supabase = await createClient();
  await supabase.from("suppliers").update({ name, ...readDetails(formData) }).eq("id", id);

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  redirect(`/suppliers/${id}?saved=1`);
}

export async function deleteSupplier(formData: FormData) {
  const profile = await getProfile();
  if (!canKeepBooks(profile)) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);

  if (error) {
    const message = error.message.includes("violates foreign key")
      ? "This supplier has bills or purchase orders on record and can't be deleted. Keep them for history."
      : error.message;
    redirect(`/suppliers/${id}/edit?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/suppliers");
  redirect("/suppliers");
}
