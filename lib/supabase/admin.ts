import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Server-only. Bypasses Row Level Security, so it must
 * never be imported into client components. Use for trusted server actions,
 * API routes, and SECURITY DEFINER RPC calls made on behalf of the public.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase service environment variables.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
