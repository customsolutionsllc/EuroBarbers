import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { siteConfig, fullAddress } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Barber Shop near Dublin, Ohio",
  description: "Looking for a barber near Dublin, OH? EuroBarbers serves Dublin clients from 7370 Sawmill Road in Columbus. Haircuts, kids' cuts and beard grooming.",
  alternates: { canonical: "/dublin-oh-barber-shop" },
  openGraph: { url: "/dublin-oh-barber-shop", images: [siteConfig.socialImage] }
};

export default function DublinPage() {
  return (
    <main className="section py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Serving Dublin from Sawmill Road</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold">A barber shop near Dublin, Ohio</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">Dublin clients are welcome at EuroBarbers for men&apos;s haircuts, kids&apos; cuts and beard grooming. We have one physical location: {fullAddress()}. We do not operate a separate Dublin branch.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg"><a href={siteConfig.mapsUrl} target="_blank" rel="noopener noreferrer">Directions to our Columbus shop</a></Button>
          <Button asChild size="lg" variant="outline"><a href={siteConfig.phoneHref}>Call {siteConfig.phone}</a></Button>
        </div>
        <section className="mt-12">
          <h2 className="font-serif text-3xl font-semibold">Before you travel from Dublin</h2>
          <p className="mt-4 leading-7 text-muted-foreground">{siteConfig.hoursLabel}. Use the directions link to plan a route from your starting point. Travel times vary; call before setting out if you need a particular barber or have a limited window for your visit.</p>
          <p className="mt-4 leading-7 text-muted-foreground">Walk-ins are welcome, and appointments can be arranged by phone. Online booking is not available yet. For family visits, ask about availability for both adult and kids&apos; haircuts.</p>
        </section>
        <section className="mt-10 rounded-lg border bg-white p-6">
          <h2 className="font-serif text-3xl font-semibold">Choose your service</h2>
          <p className="mt-4 leading-7 text-muted-foreground">Our menu includes precision scissor and clipper cuts, kids&apos; haircuts for ages 0–12, beard shaping with hot-towel preparation, and hair washes. Check prices and service details before your visit.</p>
          <Link href="/services" className="mt-5 inline-block font-medium text-primary underline underline-offset-4">Browse services and pricing</Link>
        </section>
        <p className="mt-10 text-muted-foreground"><Link href="/columbus-oh-barber-shop" className="text-primary underline">More about our Columbus location</Link></p>
      </div>
    </main>
  );
}
