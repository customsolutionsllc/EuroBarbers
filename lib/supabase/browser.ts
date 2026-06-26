"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client bound to the anon key. Respects Row Level Security and the
 * signed-in user's session. Use in client components for realtime queue
 * subscriptions and authenticated reads.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing public Supabase environment variables.");
  }

  return createBrowserClient(url, key);
}
