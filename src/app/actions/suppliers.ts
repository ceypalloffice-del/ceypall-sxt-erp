"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSupplier(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("suppliers").insert({
    entity_id: String(formData.get("entity_id") ?? "CPL"),
    name,
    category: String(formData.get("category") ?? "") || null,
  });

  revalidatePath("/suppliers");
}
