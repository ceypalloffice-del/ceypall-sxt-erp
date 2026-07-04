"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, isDirector } from "@/lib/session";
import { isRole } from "@/lib/access";

export async function createUserAccount(formData: FormData) {
  const profile = await getProfile();
  if (!isDirector(profile)) return;

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role");
  const scope = String(formData.get("entity_scope") ?? "");

  // Explicit variable annotation so TS control-flow treats calls as terminal.
  const fail: (message: string) => never = (message) =>
    redirect(`/admin/users?error=${encodeURIComponent(message)}`);

  if (!email || !email.includes("@")) fail("A valid email is required.");
  if (password.length < 8) fail("The temporary password must be at least 8 characters.");
  if (!isRole(role)) fail("Pick a role.");
  if (!["", "SXT", "CPL"].includes(scope)) fail("Invalid entity.");

  const admin = createAdminClient();
  if (!admin) fail("Server is missing SUPABASE_SERVICE_ROLE_KEY — add it in Vercel env vars to enable user creation.");

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || null },
  });
  if (error || !data.user) fail(error?.message ?? "Could not create the account.");

  // The signup trigger has created the profile row as viewer; set the assigned access.
  await admin
    .from("profiles")
    .update({ role, entity_scope: scope || null })
    .eq("id", data.user.id);

  revalidatePath("/admin/users");
  redirect(`/admin/users?created=${encodeURIComponent(email)}`);
}

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
