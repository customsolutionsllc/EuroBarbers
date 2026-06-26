import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server client bound to the anon key plus the request's auth cookies.
 * Respects Row Level Security and the signed-in user's session. Use in
 * server components, route handlers, and server actions that act as the user.
 */
export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing public Supabase environment variables.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Session refresh is handled by middleware instead.
        }
      }
    }
  });
}
