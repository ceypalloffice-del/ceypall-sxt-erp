import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for auth admin operations (creating user accounts)
 * from director-gated Server Actions ONLY. Never import in client code and
 * never use it to read or write business data — RLS with the user's session
 * remains the boundary for everything else.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
