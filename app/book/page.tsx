import { BookingForm } from "./booking-form";
import type { Metadata } from "next";
import { getActiveBarbers, getActiveServices } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description:
    "Book your barber appointment online at EuroBarbers in Columbus, Ohio. Choose a service, pick your barber or first available, and confirm.",
  alternates: { canonical: "/book" }
};

export default async function BookPage() {
  const [services, barbers] = await Promise.all([getActiveServices(), getActiveBarbers()]);

  return (
    <main className="section py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Reserve</p>
      <h1 className="mt-3 font-serif text-5xl font-semibold">Book your appointment</h1>
      <p className="mt-5 max-w-2xl text-muted-foreground">
        Pick a service, choose a barber or first available, then confirm. The database function is the final authority for availability.
      </p>
      <div className="mt-10">
        <BookingForm services={services} barbers={barbers} />
      </div>
    </main>
  );
}
