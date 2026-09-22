import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { siteConfig, fullAddress } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Columbus Barber Shop on Sawmill Road",
  description: "Visit EuroBarbers at 7370 Sawmill Road in Columbus, OH 43235 for men's haircuts, kids' cuts and beard shaping. Walk in or call 614-900-6080.",
  alternates: { canonical: "/columbus-oh-barber-shop" },
  openGraph: { url: "/columbus-oh-barber-shop", images: [siteConfig.socialImage] }
};

export default function ColumbusPage() {
  return (
    <main className="section py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Sawmill Road · Columbus, OH 43235</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold">Your Columbus barber shop on Sawmill Road</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          EuroBarbers offers men&apos;s haircuts, kids&apos; cuts for ages 0–12, beard shaping and hair washes at {fullAddress()}. Whether you want a skin fade, a classic scissor cut or a beard line-up, discuss your preferred finish with your barber before the service begins.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg"><a href={siteConfig.phoneHref}>Call {siteConfig.phone}</a></Button>
          <Button asChild size="lg" variant="outline"><a href={siteConfig.mapsUrl} target="_blank" rel="noopener noreferrer">Get directions</a></Button>
        </div>
        <section className="mt-12 rounded-lg border bg-white p-6">
          <h2 className="font-serif text-3xl font-semibold">Plan your visit</h2>
          <address className="mt-4 not-italic">{fullAddress()}</address>
          <p className="mt-2">{siteConfig.hoursLabel}</p>
          <p className="mt-4 leading-7 text-muted-foreground">Walk-ins are welcome. Online booking is not available yet; call the shop to arrange an appointment or ask about current availability. Wait times depend on the day&apos;s appointments and walk-in queue.</p>
        </section>
        <section className="mt-10">
          <h2 className="font-serif text-3xl font-semibold">Haircuts and grooming for your routine</h2>
          <p className="mt-4 leading-7 text-muted-foreground">Choose a haircut for a fresh shape and detailed neckline, a beard service for shaping and clean edges, or a hair wash to complement your visit. Our service menu lists current prices and what each service includes.</p>
          <Link href="/services" className="mt-5 inline-block font-medium text-primary underline underline-offset-4">See services and pricing</Link>
        </section>
        <p className="mt-10 text-muted-foreground">Coming from Dublin? <Link href="/dublin-oh-barber-shop" className="text-primary underline">Find information for Dublin clients</Link>. All services take place at our Columbus shop.</p>
      </div>
    </main>
  );
}
