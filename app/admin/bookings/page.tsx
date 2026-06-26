import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false }
};

type Row = {
  id: string;
  appointment_start: string;
  appointment_end: string;
  status: string;
  customers: { first_name: string; last_name: string; phone: string } | null;
  services: { name: string } | null;
  barbers: { name: string } | null;
};

function fmt(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York"
  }).format(new Date(iso));
}

async function cancelAppointment(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  const supabase = await createServerSupabaseClient();
  await supabase.from("appointments").update({ status: "canceled" }).eq("id", id);
  revalidatePath("/admin/bookings");
}

export default async function AdminBookingsPage() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      "id, appointment_start, appointment_end, status, customers(first_name, last_name, phone), services(name), barbers(name)"
    )
    .gte("appointment_start", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
    .order("appointment_start", { ascending: true })
    .limit(200);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="font-serif text-3xl font-semibold">Upcoming bookings</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Customers cancel or reschedule by calling the shop. Admins can cancel here.
      </p>
      <div className="mt-6 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Service</th>
              <th className="p-3">Barber</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="border-t">
                <td className="p-3 text-muted-foreground" colSpan={7}>
                  No upcoming bookings.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{fmt(row.appointment_start)}</td>
                  <td className="p-3">
                    {row.customers?.first_name} {row.customers?.last_name}
                  </td>
                  <td className="p-3">{row.customers?.phone}</td>
                  <td className="p-3">{row.services?.name}</td>
                  <td className="p-3">{row.barbers?.name}</td>
                  <td className="p-3 capitalize">{row.status}</td>
                  <td className="p-3">
                    {row.status !== "canceled" && row.status !== "completed" ? (
                      <form action={cancelAppointment}>
                        <input type="hidden" name="id" value={row.id} />
                        <button className="text-sm text-red-700 hover:underline" type="submit">
                          Cancel
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
