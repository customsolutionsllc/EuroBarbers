import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dublin, OH Barber Shop",
  description:
    "EuroBarbers welcomes Dublin, Ohio clients for precision fades, beard craft, hot towel shaves, and classic grooming. Book online or join the walk-in queue.",
  alternates: { canonical: "/dublin-oh-barber-shop" }
};

export default function DublinPage() {
  return (
    <main className="section py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Local SEO</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold">Dublin, Ohio barber shop</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Premium appointments for Dublin clients who want precise service, reliable scheduling, and a polished barber shop experience.
          </p>
          <Button asChild className="mt-8" size="lg"><Link href="/book">Book in Dublin</Link></Button>
        </div>
        <img
          src="https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=80"
          alt="Dublin barber shop"
          className="aspect-[4/3] rounded-lg object-cover"
        />
      </div>
    </main>
  );
}
