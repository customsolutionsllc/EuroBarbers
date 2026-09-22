import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig, fullAddress } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Booking",
  description:
    "Online booking is not available yet. Walk-ins are welcome, or call EuroBarbers in Columbus, Ohio to book your appointment.",
  alternates: { canonical: "/book" }
};

const MAPS_URL =
  "https://www.google.com/maps/place/Euro+Barbers/@40.1154364,-83.0903418,19.5z/data=!4m15!1m8!3m7!1s0x8838ed5b2b0700df:0x79a9e11dfaf1692e!2s7370+Sawmill+Rd,+Columbus,+OH+43235!3b1!8m2!3d40.1153922!4d-83.0894883!16s%2Fg%2F11bw3xbnwz!3m5!1s0x8838edebfe54ba7f:0x577a7db05427fb0a!8m2!3d40.1159669!4d-83.089484!16s%2Fg%2F11zh45v248?entry=ttu";

export default function BookPage() {
  return (
    <main className="section py-20">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Booking</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold">
          Online booking is coming soon
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          We&apos;re not accepting online bookings just yet. In the meantime,
          <span className="font-medium text-foreground"> walk-ins are always welcome</span> —
          or give us a call and we&apos;ll get you scheduled.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <a href={siteConfig.phoneHref}>
              <Phone className="h-4 w-4" />
              Call {siteConfig.phone}
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              <MapPin className="h-4 w-4" />
              Get directions
            </a>
          </Button>
        </div>

        <div className="mt-10 rounded-lg border bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Visit us
          </p>
          <p className="mt-2 text-base text-foreground">{fullAddress()}</p>
          <p className="mt-1 text-sm text-muted-foreground">{siteConfig.hoursLabel}</p>
          <div className="mt-4">
            <Link
              href="/services"
              className="text-sm font-medium text-primary hover:underline"
            >
              View our services &amp; pricing →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
