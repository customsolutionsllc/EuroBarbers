"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { services } from "@/lib/sample-data";

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

export function ServiceShowcase() {
  return (
    <div className="space-y-14 overflow-x-clip md:space-y-20">
      {services.map((service, i) => {
        const media = serviceMedia[service.id];
        const reverse = i % 2 === 1;
        return (
          <motion.div
            key={service.id}
            className="grid items-center gap-8 md:grid-cols-2 md:gap-12"
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className={reverse ? "md:order-2" : ""}>
              <h3 className="font-serif text-3xl font-semibold">{service.name}</h3>
              <p className="mt-2 font-serif text-2xl font-semibold text-primary">
                {formatCurrency(service.price)}
              </p>
              <p className="mt-4 leading-7 text-muted-foreground">
                {media?.seo ?? service.description}
              </p>
            </div>
            <div className={reverse ? "md:order-1" : ""}>
              {media ? (
                <Image
                  src={media.image}
                  alt={media.alt}
                  width={800}
                  height={600}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="aspect-[4/3] w-full rounded-xl object-cover shadow-lg"
                />
              ) : null}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
