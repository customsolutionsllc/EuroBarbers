import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionSection } from "@/components/motion-section";
import { formatCurrency } from "@/lib/utils";
import { gallery, services, staff } from "@/lib/sample-data";

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
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Services</p>
          <h2 className="mt-2 font-serif text-4xl font-semibold">
            Master barbering in Columbus, Ohio
          </h2>
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
                  <h3 className="font-serif text-3xl font-semibold">{service.name}</h3>
                  <p className="mt-2 font-serif text-2xl font-semibold text-primary">
                    {formatCurrency(service.price)}
                  </p>
                  <p className="mt-4 leading-7 text-muted-foreground">{media.seo}</p>
                </div>
                <div className={reverse ? "md:order-1" : ""}>
                  <img
                    src={media.image}
                    alt={media.alt}
                    className="aspect-[4/3] w-full rounded-xl object-cover shadow-lg"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12">
          <Button asChild variant="outline">
            <Link href="/services">View all services &amp; pricing</Link>
          </Button>
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
