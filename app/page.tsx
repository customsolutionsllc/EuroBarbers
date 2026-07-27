import Image from "next/image";
import type { Metadata } from "next";
import { MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

/**
 * Temporary under-construction landing page.
 *
 * The full marketing/booking site is preserved at /preview while the public
 * launch content is finalized. This keeps visitors from reaching pages with
 * information that isn't ready yet, while still giving them a way to reach us.
 */

const BANNER_IMAGE =
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=2200&q=80";

const MAPS_URL =
  "https://www.google.com/maps/place/Euro+Barbers/@40.1154364,-83.0903418,19.5z/data=!4m15!1m8!3m7!1s0x8838ed5b2b0700df:0x79a9e11dfaf1692e!2s7370+Sawmill+Rd,+Columbus,+OH+43235!3b1!8m2!3d40.1153922!4d-83.0894883!16s%2Fg%2F11bw3xbnwz!3m5!1s0x8838edebfe54ba7f:0x577a7db05427fb0a!8m2!3d40.1159669!4d-83.089484!16s%2Fg%2F11zh45v248?entry=ttu";

export const metadata: Metadata = {
  title: "EuroBarbers | Coming Soon",
  description:
    "Our new website is under construction. Call EuroBarbers or visit us in Columbus, OH.",
  robots: { index: false, follow: false }
};

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-900 text-white">
      {/* Blurred banner backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 scale-110 bg-cover bg-center blur-xl"
        style={{ backgroundImage: `url("${BANNER_IMAGE}")` }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-ink-900/85 via-ink-900/75 to-ink-900/90"
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
        <Image
          src="/logo2.png"
          alt="EuroBarbers"
          width={180}
          height={180}
          priority
          className="mb-10 h-36 w-36 rounded-full object-contain shadow-2xl ring-1 ring-gold-400/30 sm:h-44 sm:w-44"
        />

        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-gold-200 sm:text-sm">
          Columbus, Ohio
        </p>

        <h1 className="font-serif text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
          Website Under Construction
        </h1>

        <p className="mt-6 max-w-xl text-base leading-8 text-white/80 sm:text-lg">
          We&apos;re putting the finishing touches on something worth the wait.
          In the meantime, please feel free to reach out — we&apos;d love to
          take care of you.
        </p>

        {/* Contact actions */}
        <div className="mt-10 flex w-full max-w-2xl flex-col items-stretch gap-4 sm:flex-row sm:justify-center">
          <a
            href={siteConfig.phoneHref}
            className="group inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-lg bg-gold-400 px-8 py-4 text-base font-semibold text-ink-900 shadow-lg transition hover:bg-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-200"
          >
            <Phone className="h-5 w-5 shrink-0" />
            +1 (614) 900-6080
          </a>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-lg border border-white/25 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:border-gold-200/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-200"
          >
            <MapPin className="h-5 w-5 shrink-0 text-gold-200" />
            7370 Sawmill Rd, Columbus, OH 43235
          </a>
        </div>

        <p className="mt-12 text-sm text-white/55">
          &copy; {new Date().getFullYear()} {siteConfig.name}. Thank you for your patience.
        </p>
      </div>
    </main>
  );
}
