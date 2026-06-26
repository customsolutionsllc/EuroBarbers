import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Barber, Service, ShopPublic } from "@/lib/types";

const SERVICE_COLUMNS =
  "id, slug, name, description, price_cents, duration_minutes, buffer_after_minutes, is_active, sort_order";
const BARBER_COLUMNS =
  "id, slug, name, title, bio, image_url, specialties, is_active, sort_order";

export async function getActiveServices(): Promise<Service[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load services: ${error.message}`);
  }
  return (data ?? []) as Service[];
}

export async function getActiveBarbers(): Promise<Barber[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("barbers")
    .select(BARBER_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load barbers: ${error.message}`);
  }
  return (data ?? []) as Barber[];
}

export async function getShopPublic(): Promise<ShopPublic | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_shop_public");

  if (error) {
    throw new Error(`Failed to load shop settings: ${error.message}`);
  }
  return (data as ShopPublic | null) ?? null;
}

/**
 * Admin views: include inactive rows. Relies on admin RLS (is_admin())
 * so only admins can read the full lists through the user session client.
 */
export async function getAllServices(): Promise<Service[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load services: ${error.message}`);
  }
  return (data ?? []) as Service[];
}

export async function getAllBarbers(): Promise<Barber[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("barbers")
    .select(BARBER_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load barbers: ${error.message}`);
  }
  return (data ?? []) as Barber[];
}
