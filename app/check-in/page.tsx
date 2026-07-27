import type { Metadata } from "next";
import { CheckInForm } from "./check-in-form";
import { getActiveBarbers, getActiveServices, getShopPublic } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Walk-in Check-in",
  description: "Join the EuroBarbers walk-in queue from your phone."
};

export default async function CheckInPage() {
  const [services, barbers, shop] = await Promise.all([
    getActiveServices(),
    getActiveBarbers(),
    getShopPublic()
  ]);

  const isOpen = shop?.walk_in_checkin_open ?? true;

  return (
    <main className="section py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Walk-in</p>
      <h1 className="mt-3 font-serif text-5xl font-semibold">Check in to the queue</h1>
      <p className="mt-5 max-w-2xl text-muted-foreground">
        Pick your service and a barber or First Available. We&apos;ll text you when you&apos;re next —
        you only need to be nearby.
      </p>

      <div className="mt-10 max-w-4xl">
        {isOpen ? (
          <CheckInForm services={services} barbers={barbers} />
        ) : (
          <div className="rounded-lg border bg-amber-50 p-8 text-center">
            <h2 className="font-serif text-3xl font-semibold">Walk-in check-in is currently closed.</h2>
            <p className="mt-3 text-muted-foreground">
              Please check back during open hours, or book an appointment online.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
