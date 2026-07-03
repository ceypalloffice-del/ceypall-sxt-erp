import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ENTITY_COOKIE, type EntityKey, isEntityKey } from "@/lib/entities";

export type Profile = {
  id: string;
  full_name: string | null;
  role: "director" | "accounts" | "production" | "viewer";
  entity_scope: "SXT" | "CPL" | null;
};

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, entity_scope")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

/** Resolves the active entity, honouring a locked entity_scope over the cookie. */
export async function getActiveEntity(profile: Profile | null): Promise<EntityKey> {
  if (profile?.entity_scope) return profile.entity_scope;

  const cookieStore = await cookies();
  const value = cookieStore.get(ENTITY_COOKIE)?.value;
  return isEntityKey(value) ? value : "ALL";
}

export function canKeepBooks(profile: Profile | null): boolean {
  return profile?.role === "director" || profile?.role === "accounts";
}

export function isDirector(profile: Profile | null): boolean {
  return profile?.role === "director";
}
