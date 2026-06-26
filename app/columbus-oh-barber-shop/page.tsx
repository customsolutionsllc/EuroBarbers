import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Columbus, OH Barber Shop",
  description:
    "EuroBarbers serves Columbus, Ohio with premium fades, classic cuts, beard grooming, hot towel shaves, and easy online booking or walk-in queue.",
  alternates: { canonical: "/columbus-oh-barber-shop" }
};

export default function ColumbusPage() {
  return (
    <main className="section py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Local SEO</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold">Columbus, Ohio barber shop</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            EuroBarbers serves Columbus clients with premium fades, classic cuts, beard grooming, and a booking experience designed around real staff availability.
          </p>
          <Button asChild className="mt-8" size="lg"><Link href="/book">Book in Columbus</Link></Button>
        </div>
        <img
          src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80"
          alt="Columbus barber shop"
          className="aspect-[4/3] rounded-lg object-cover"
        />
      </div>
    </main>
  );
}
