import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { staff } from "@/lib/sample-data";

export const metadata: Metadata = {
  title: "Our Barbers",
  description:
    "Meet the master barbers at EuroBarbers in Columbus, Ohio. Book your preferred barber online or join the walk-in queue.",
  alternates: { canonical: "/team" }
};

export default function TeamPage() {
  return (
    <main className="section py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Master barbers</p>
      <h1 className="mt-3 font-serif text-5xl font-semibold">Choose your chair</h1>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {staff.map((barber) => (
          <article key={barber.id} className="overflow-hidden rounded-lg border bg-white">
            <img src={barber.image} alt={barber.name} className="h-96 w-full object-cover" />
            <div className="p-6">
              <p className="text-sm uppercase tracking-[0.18em] text-primary">{barber.title}</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold">{barber.name}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{barber.specialties.join(" / ")}</p>
              <Button asChild className="mt-6" variant="outline">
                <Link href={`/book?barber=${barber.id}`}>Book {barber.name.split(" ")[0]}</Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
