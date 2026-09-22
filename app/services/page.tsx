import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { MotionSection } from "@/components/motion-section";
import { formatCurrency } from "@/lib/utils";
import { services } from "@/lib/sample-data";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description:
    "Men's haircuts, kids' cuts, beard shaping, and hair wash at EuroBarbers on Sawmill Road in Columbus, Ohio.",
  alternates: { canonical: "/services" }
};

const serviceMedia: Record<string, { image: string; alt: string; seo: string }> = {
  "mens-haircut": {
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=80",
    alt: "Master barber giving a precision men's haircut in Columbus, Ohio",
    seo: "Precision men's haircuts shaped by a master barber with over 10 years of experience across Europe. From tight skin fades and classic scissor cuts to modern tapers and textured crops, every haircut at EuroBarbers begins with a personal consultation and ends with a clean, razor-sharp finish. Conveniently located on Sawmill Road, we proudly serve Columbus, Dublin, and the greater 43235 area."
  },
  "kids-haircut": {
    image:
      "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1600&q=80",
    alt: "Kids haircut at a friendly barber shop near Dublin, Ohio",
    seo: "Kids' haircuts (ages 0–12) in a calm, welcoming setting. Our European-trained barbers keep younger clients comfortable and relaxed while delivering clean, easy-to-style cuts that parents love. Bring the whole family to our Sawmill Road barber shop serving Columbus and Dublin, Ohio."
  },
  "beard-shave-shape": {
    image:
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1600&q=80",
    alt: "Beard shaping and hot-towel straight-razor line-up in Columbus, Ohio",
    seo: "Expert beard shaping, line-ups, and hot-towel straight-razor detailing rooted in over a decade of Old-World barbering craft. We sculpt and define your beard for a crisp, polished finish tailored to your face. Visit EuroBarbers on Sawmill Road for standout beard grooming in Columbus and Dublin, OH."
  },
  "hair-wash": {
    image:
      "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1600&q=80",
    alt: "Relaxing hair wash and scalp refresh at a Columbus, Ohio barber shop",
    seo: "Finish your visit with a relaxing hair wash and invigorating scalp refresh — a thorough cleanse and towel dry that pairs perfectly with any haircut or beard service. Experience premium, European-inspired grooming at our Columbus, OH barber shop on Sawmill Road."
  }
};

export default function ServicesPage() {
  return (
    <main>
      <MotionSection className="section py-16">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Services</p>
          <h1 className="mt-2 font-serif text-5xl font-semibold">
            Master barbering in Columbus, Ohio
          </h1>
          <p className="mt-4 text-muted-foreground">
            Backed by 10+ years of European barbering experience, delivered right here on
            Sawmill Road for Columbus and Dublin, Ohio.
          </p>
        </div>

        <div className="space-y-14 md:space-y-20">
          {services.map((service, i) => {
            const media = serviceMedia[service.id];
            const reverse = i % 2 === 1;
            return (
              <div key={service.id} className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
                <div className={reverse ? "md:order-2" : ""}>
                  <h2 className="font-serif text-3xl font-semibold">{service.name}</h2>
                  <p className="mt-2 font-serif text-2xl font-semibold text-primary">
                    {formatCurrency(service.price)}
                  </p>
                  <p className="mt-4 leading-7 text-muted-foreground">
                    {media?.seo ?? service.description}
                  </p>
                </div>
                <div className={reverse ? "md:order-1" : ""}>
                  {media ? (
                    <img
                      src={media.image}
                      alt={media.alt}
                      className="aspect-[4/3] w-full rounded-xl object-cover shadow-lg"
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12">
          <Button asChild size="lg" variant="outline">
            <Link href="/team">Meet the team</Link>
          </Button>
        </div>
      </MotionSection>
    </main>
  );
}
