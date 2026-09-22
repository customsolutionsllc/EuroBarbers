import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { MotionSection } from "@/components/motion-section";
import { ServiceShowcase } from "@/components/service-showcase";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description:
    "Men's haircuts, kids' cuts, beard shaping, and hair wash at EuroBarbers on Sawmill Road in Columbus, Ohio.",
  alternates: { canonical: "/services" },
  openGraph: { url: "/services", images: [siteConfig.socialImage] }
};

export default function ServicesPage() {
  return (
    <main>
      <MotionSection className="section py-16">
        <div className="mb-12 mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Services</p>
          <h1 className="mt-2 font-serif text-5xl font-semibold">
            Master barbering in Columbus, Ohio
          </h1>
          <p className="mt-4 text-muted-foreground">
            Backed by 10+ years of European barbering experience, EuroBarbers brings Old-World
            craft and modern precision to Sawmill Road. From skin fades and scissor work to
            beard sculpting and hot-towel detailing, every visit starts with a personal
            consultation and ends with a clean, razor-sharp finish. Proudly serving Columbus,
            Dublin, and the greater 43235 area — walk-ins are always welcome.
          </p>
        </div>

        <ServiceShowcase />

        <div className="mt-12 text-center">
          <Button asChild size="lg" variant="outline">
            <Link href="/book">Plan your visit</Link>
          </Button>
        </div>
      </MotionSection>
    </main>
  );
}
