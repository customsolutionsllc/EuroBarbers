import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionSection } from "@/components/motion-section";
import { ServiceShowcase } from "@/components/service-showcase";
import { siteConfig, fullAddress } from "@/lib/site-config";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", images: [siteConfig.socialImage] }
};

export default function HomePage() {
  return (
    <main>
      <section className="grain -mt-28 min-h-screen text-white">
        <div className="section flex min-h-screen items-center pb-20 pt-28">
          <div className="min-w-0 max-w-3xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-gold-200">
              Columbus & Dublin, Ohio
            </p>
            <h1 className="font-serif text-5xl font-semibold leading-[0.95] tracking-normal sm:text-7xl lg:text-8xl">
              EuroBarbers
              <span className="mt-5 block font-sans text-2xl leading-snug tracking-normal sm:text-3xl">Your barber shop in Columbus, Ohio</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
              Men&apos;s haircuts, kids&apos; cuts and beard grooming on Sawmill Road. Walk in or call to arrange your visit — serving Columbus and Dublin from one shop.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/book">Book appointment <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/35 text-white hover:bg-white/10">
                <Link href="/services">View services</Link>
              </Button>
            </div>
            <p className="mt-8 text-white/80">{fullAddress()} · {siteConfig.hoursLabel}</p>
            <a href={siteConfig.phoneHref} className="mt-3 inline-block text-gold-200 underline underline-offset-4">Call {siteConfig.phone}</a>
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
