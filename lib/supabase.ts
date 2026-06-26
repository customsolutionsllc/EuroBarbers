// Backward-compatible re-exports. Prefer importing from the focused modules:
//   - lib/supabase/admin   -> createAdminClient (service role, server-only)
//   - lib/supabase/server  -> createServerSupabaseClient (user session, RLS)
//   - lib/supabase/browser -> createBrowserSupabaseClient (client components)
import { createAdminClient } from "./supabase/admin";

export { createAdminClient } from "./supabase/admin";
export { createServerSupabaseClient } from "./supabase/server";

/** @deprecated Use createAdminClient from "@/lib/supabase/admin". */
export function createServiceSupabaseClient() {
  return createAdminClient();
}
