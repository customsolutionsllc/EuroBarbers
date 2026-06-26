import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { QueueBoard } from "@/components/queue-board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Barber Dashboard",
  robots: { index: false, follow: false }
};

type Appointment = {
  id: string;
  status: string;
  appointment_start: string;
  appointment_end: string;
  first_name: string;
  last_initial: string;
  phone: string | null;
  service_name: string;
  barber_name: string;
  notes: string | null;
};

function timeLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York"
  }).format(new Date(iso));
}

export default async function BarberDashboardPage() {
  const profile = await requireStaff();
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.rpc("get_staff_appointments", { p_date: null });
  const appointments = (data as Appointment[] | null) ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h2 className="font-serif text-2xl font-semibold">Today&apos;s appointments</h2>
        <p className="text-sm text-muted-foreground">
          {profile.role === "admin" ? "All barbers" : "Your scheduled clients"}.
        </p>
        <ul className="mt-4 space-y-3">
          {appointments.length === 0 ? (
            <li className="rounded-lg border bg-white p-6 text-center text-muted-foreground">
              No appointments scheduled today.
            </li>
          ) : (
            appointments.map((appt) => (
              <li key={appt.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {timeLabel(appt.appointment_start)} – {timeLabel(appt.appointment_end)}
                  </p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize">
                    {appt.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {appt.first_name} {appt.last_initial}. · {appt.service_name}
                  {profile.role === "admin" ? ` · ${appt.barber_name}` : ""}
                  {appt.phone ? ` · ${appt.phone}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-2xl font-semibold">Walk-in queue</h2>
        <p className="text-sm text-muted-foreground">
          Your assigned customers and First Available.
        </p>
        <div className="mt-4">
          <QueueBoard role={profile.role === "admin" ? "admin" : "barber"} barberId={profile.barberId} />
        </div>
      </section>
    </div>
  );
}
