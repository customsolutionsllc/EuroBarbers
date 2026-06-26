import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AppointmentRow = {
  id: string;
  appointment_start: string;
  appointment_end: string;
  status: string;
  customers: { first_name: string; last_name: string } | null;
  services: { name: string } | null;
  barbers: { slug: string; name: string } | null;
};

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, appointment_start, appointment_end, status, customers(first_name, last_name), services(name), barbers(slug, name)"
    )
    .order("appointment_start", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: barberRows } = await supabase
    .from("barbers")
    .select("slug, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const resources = ((barberRows ?? []) as { slug: string; name: string }[]).map((b) => ({
    id: b.slug,
    title: b.name
  }));

  const bookings = ((data ?? []) as unknown as AppointmentRow[]).map((row) => ({
    id: row.id,
    title: `${row.services?.name ?? "Service"} — ${row.customers?.first_name ?? ""} ${
      row.customers?.last_name?.charAt(0) ?? ""
    }.`,
    starts_at: row.appointment_start,
    ends_at: row.appointment_end,
    staff_id: row.barbers?.slug ?? ""
  }));

  return NextResponse.json({ bookings, resources });
}

