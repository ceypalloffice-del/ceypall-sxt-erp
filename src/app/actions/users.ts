"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isDirector } from "@/lib/session";
import { isRole } from "@/lib/access";

export async function updateUserAccess(formData: FormData) {
  const profile = await getProfile();
  if (!isDirector(profile)) return;

  const id = String(formData.get("id") ?? "");
  const role = formData.get("role");
  const scope = String(formData.get("entity_scope") ?? "");
  if (!id || !isRole(role)) return;
  if (!["", "SXT", "CPL"].includes(scope)) return;

  // Lockout guard: a director cannot demote their own account.
  if (id === profile!.id && role !== "director") return;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ role, entity_scope: scope || null })
    .eq("id", id);

  revalidatePath("/admin/users");
}
