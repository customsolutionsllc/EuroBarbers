import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type Role = "admin" | "barber";

export type CurrentProfile = {
  userId: string;
  email: string | null;
  role: Role;
  barberId: string | null;
  fullName: string | null;
};

/** Returns the signed-in user's profile, or null if not authenticated. */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("role, barber_id, full_name")
    .eq("id", user.id)
    .single();

  if (!data) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role: data.role as Role,
    barberId: (data.barber_id as string | null) ?? null,
    fullName: (data.full_name as string | null) ?? null
  };
}

/** Requires an admin; redirects otherwise. */
export async function requireAdmin(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?redirect=/admin");
  }
  if (profile.role !== "admin") {
    redirect("/barber");
  }
  return profile;
}

/** Requires any signed-in staff member (admin or barber); redirects otherwise. */
export async function requireStaff(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?redirect=/barber");
  }
  return profile;
}
