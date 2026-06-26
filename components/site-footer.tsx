import Link from "next/link";
import { siteConfig, fullAddress } from "@/lib/site-config";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-ink-900 text-white">
      <div className="section grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-3xl font-semibold">{siteConfig.name}</p>
          <p className="mt-3 max-w-md text-sm text-white/70">{siteConfig.tagline}</p>
          <address className="mt-4 not-italic text-sm text-white/70">
            {fullAddress()}
            <br />
            <a href={siteConfig.phoneHref} className="hover:text-white">
              {siteConfig.phone}
            </a>
          </address>
        </div>
        <div>
          <p className="font-semibold">Service areas</p>
          <div className="mt-3 space-y-2 text-sm text-white/70">
            {siteConfig.serviceAreas.map((area) => (
              <Link key={area.href} href={area.href} className="block hover:text-white">
                {area.label}
              </Link>
            ))}
          </div>
          <p className="mt-6 font-semibold">Hours</p>
          <p className="mt-3 text-sm text-white/70">{siteConfig.hoursLabel}</p>
        </div>
        <div>
          <p className="font-semibold">Visit</p>
          <div className="mt-3 space-y-2 text-sm text-white/70">
            <Link href="/book" className="block hover:text-white">
              Book online
            </Link>
            <Link href="/check-in" className="block hover:text-white">
              Walk-in check-in
            </Link>
            <Link href="/services" className="block hover:text-white">
              Services
            </Link>
            <Link href="/team" className="block hover:text-white">
              Team
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="section flex flex-col gap-4 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-4">
            {siteConfig.legal.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
