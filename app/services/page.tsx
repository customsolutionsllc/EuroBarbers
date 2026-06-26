import Link from "next/link";
import type { Metadata } from "next";
import { ServiceCard } from "@/components/service-card";
import { Button } from "@/components/ui/button";
import { services } from "@/lib/sample-data";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description:
    "Men's haircuts, skin fades, beard trims, hot towel shaves, kids' cuts, and line-ups at EuroBarbers in Columbus, Ohio.",
  alternates: { canonical: "/services" }
};

export default function ServicesPage() {
  return (
    <main className="section py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Menu</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold">Services priced for precision</h1>
        <p className="mt-5 text-muted-foreground">
          Each service includes consultation time and buffer time so the calendar stays realistic.
        </p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {services.map((service) => <ServiceCard key={service.id} service={service} />)}
      </div>
      <Button asChild className="mt-10" size="lg">
        <Link href="/book">Reserve a time</Link>
      </Button>
    </main>
  );
}
