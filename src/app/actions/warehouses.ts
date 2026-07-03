"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveEntity, getProfile } from "@/lib/session";

export async function createWarehouse(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const profile = await getProfile();
  const active = await getActiveEntity(profile);
  if (active === "ALL") return; // can't create a warehouse without a single active entity

  await supabase.from("warehouses").insert({
    entity_id: active,
    name,
    location: formData.get("location") || null,
  });

  revalidatePath("/warehouses");
}
