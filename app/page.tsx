import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionSection } from "@/components/motion-section";
import { ServiceShowcase } from "@/components/service-showcase";

export default function HomePage() {
  return (
    <main>
      <section className="grain -mt-28 min-h-screen text-white">
        <div className="section flex min-h-screen items-center pb-20 pt-28">
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
        <div className="mb-12 mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Services</p>
          <h2 className="mt-2 font-serif text-4xl font-semibold">
            Master barbering in Columbus, Ohio
          </h2>
          <p className="mt-4 text-muted-foreground">
            Backed by 10+ years of European barbering experience, EuroBarbers brings Old-World
            craft and modern precision to Sawmill Road. From skin fades and scissor work to
            beard sculpting and hot-towel detailing, every visit starts with a personal
            consultation and ends with a clean, razor-sharp finish. Proudly serving Columbus,
            Dublin, and the greater 43235 area — walk-ins are always welcome.
          </p>
        </div>

        <ServiceShowcase />
      </MotionSection>
    </main>
  );
}
