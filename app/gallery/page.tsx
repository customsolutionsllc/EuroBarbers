import type { Metadata } from "next";
import { gallery } from "@/lib/sample-data";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Barbering style inspiration. These stock photographs are not a portfolio of EuroBarbers client work.",
  alternates: { canonical: "/gallery" },
  robots: { index: false, follow: true }
};

export default function GalleryPage() {
  return (
    <main className="section py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Gallery</p>
      <h1 className="mt-3 font-serif text-5xl font-semibold">Cuts, texture, and detail</h1>
      <p className="mt-4 text-muted-foreground">Style inspiration shown with stock photography, not photographs of our shop or clients.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {gallery.map((src, index) => (
          <img
            key={`${src}-${index}`}
            src={src}
            alt={`Barbering style inspiration ${index + 1} (stock photograph)`}
            width={600}
            height={750}
            loading="lazy"
            className="aspect-[4/5] rounded-lg object-cover"
          />
        ))}
      </div>
    </main>
  );
}
