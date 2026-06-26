import { CalendarDays, ListOrdered, Scissors, UsersRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function startOfTodayUtc() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return d.toISOString();
}

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const todayStart = startOfTodayUtc();
  const tomorrow = new Date(Date.parse(todayStart) + 24 * 60 * 60 * 1000).toISOString();

  const [appts, queue, barbers, services] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("appointment_start", todayStart)
      .lt("appointment_start", tomorrow),
    supabase
      .from("walk_in_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["waiting", "next", "in_chair"]),
    supabase.from("barbers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("is_active", true)
  ]);

  const cards = [
    { label: "Today's bookings", value: appts.count ?? 0, Icon: CalendarDays },
    { label: "In queue now", value: queue.count ?? 0, Icon: ListOrdered },
    { label: "Active barbers", value: barbers.count ?? 0, Icon: UsersRound },
    { label: "Active services", value: services.count ?? 0, Icon: Scissors }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, Icon }) => (
        <div key={label} className="rounded-lg border bg-white p-6">
          <Icon className="h-6 w-6 text-primary" />
          <p className="mt-5 text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 font-serif text-5xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}
