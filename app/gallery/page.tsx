import type { Metadata } from "next";
import { gallery } from "@/lib/sample-data";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "A look at the cuts, fades, beard work, and detail from EuroBarbers in Columbus, Ohio.",
  alternates: { canonical: "/gallery" }
};

export default function GalleryPage() {
  return (
    <main className="section py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Gallery</p>
      <h1 className="mt-3 font-serif text-5xl font-semibold">Cuts, texture, and detail</h1>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {gallery.concat(gallery.slice(0, 3)).map((src, index) => (
          <img
            key={`${src}-${index}`}
            src={src}
            alt="EuroBarbers gallery"
            className="aspect-[4/5] rounded-lg object-cover"
          />
        ))}
      </div>
    </main>
  );
}
