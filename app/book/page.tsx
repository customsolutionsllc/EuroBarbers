import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig, fullAddress } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Booking",
  description:
    "Online booking is not available yet. Walk-ins are welcome, or call EuroBarbers in Columbus, Ohio to book your appointment.",
  alternates: { canonical: "/book" },
  openGraph: { url: "/book", images: [siteConfig.socialImage] }
};


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
            <a href={siteConfig.mapsUrl} target="_blank" rel="noopener noreferrer">
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
