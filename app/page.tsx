import Link from "next/link";
import { ArrowRight, CalendarDays, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionSection } from "@/components/motion-section";
import { ServiceCard } from "@/components/service-card";
import { gallery, services, staff } from "@/lib/sample-data";

export default function HomePage() {
  return (
    <main>
      <section className="grain min-h-[calc(100vh-4rem)] text-white">
        <div className="section flex min-h-[calc(100vh-4rem)] items-center py-20">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-gold-200">
              Columbus & Dublin, Ohio
            </p>
            <h1 className="font-serif text-6xl font-semibold leading-[0.95] tracking-normal sm:text-7xl lg:text-8xl">
              EuroBarbers
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
              Premium cuts, beard work, hot towel service, and conflict-safe booking for clients who treat grooming like an appointment worth keeping.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/book">Book appointment <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/35 text-white hover:bg-white/10">
                <Link href="/services">View services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <MotionSection className="section py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Custom booking",
              text: "Choose a barber or let the system find the first available chair.",
              Icon: CalendarDays
            },
            {
              title: "No double booking",
              text: "Booking writes go through a database-backed conflict check.",
              Icon: ShieldCheck
            },
            {
              title: "Luxury service",
              text: "Fade work, beard sculpting, hot towels, and premium packages.",
              Icon: Sparkles
            }
          ].map(({ title, text, Icon }) => (
            <div key={title} className="rounded-lg border bg-white p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="mt-5 font-serif text-2xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </MotionSection>

      <MotionSection className="section py-10">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Services</p>
            <h2 className="mt-2 font-serif text-4xl font-semibold">Built for the chair</h2>
          </div>
          <Button asChild variant="outline"><Link href="/services">All services</Link></Button>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {services.map((service) => <ServiceCard key={service.id} service={service} />)}
        </div>
      </MotionSection>

      <MotionSection className="section py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {staff.map((barber) => (
            <article key={barber.id} className="overflow-hidden rounded-lg border bg-white">
              <img src={barber.image} alt={barber.name} className="h-80 w-full object-cover" />
              <div className="p-6">
                <p className="text-sm uppercase tracking-[0.18em] text-primary">{barber.title}</p>
                <h3 className="mt-2 font-serif text-3xl font-semibold">{barber.name}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{barber.specialties.join(" / ")}</p>
              </div>
            </article>
          ))}
        </div>
      </MotionSection>

      <section className="py-16">
        <div className="section grid grid-cols-2 gap-4 md:grid-cols-3">
          {gallery.map((src) => (
            <img key={src} src={src} alt="Barber shop work" className="aspect-[4/3] rounded-lg object-cover" />
          ))}
        </div>
      </section>
    </main>
  );
}
