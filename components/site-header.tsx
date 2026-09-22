"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  ["Home", "/"],
  ["Services", "/services"],
  ["We are Hiring", "/we-are-hiring"],
  ["Contact Us", "/contact-us"]
];

export function SiteHeader() {
  const pathname = usePathname() ?? "";
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // On the homepage the header floats over the dark hero until it is
      // scrolled roughly past that hero; elsewhere it is solid immediately.
      const threshold = isHome ? window.innerHeight - 120 : 8;
      setScrolled(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const overDark = isHome && !scrolled;

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        overDark ? "bg-transparent" : "border-b bg-background/92 backdrop-blur"
      }`}
    >
      <div className="section flex h-28 items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <Image
            src="/logo-t.png"
            alt="EuroBarbers"
            width={240}
            height={360}
            priority
            className={`w-auto object-contain transition-all duration-300 ${
              overDark ? "h-20 self-start mt-3 sm:h-48" : "h-16 sm:h-24"
            }`}
          />
          <span
            className={`font-serif text-sm font-semibold transition-colors min-[360px]:text-base sm:text-2xl ${
              overDark ? "text-gold-200" : "text-foreground"
            }`}
          >
            EuroBarbers
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-6">
          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
            {nav.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  overDark
                    ? "text-gold-200/90 hover:text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Button
            asChild
            variant={overDark ? "outline" : "default"}
            className={overDark ? "border-white/40 text-white hover:bg-white/10" : ""}
          >
            <Link href="/book">Reserve</Link>
          </Button>
          <details
            className="group relative lg:hidden"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary
              aria-label="Navigation menu"
              className={`flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden ${
                overDark ? "border-white/40 text-white" : "border-input text-foreground"
              }`}
            >
              <Menu className="h-5 w-5 group-open:hidden" aria-hidden="true" />
              <X className="hidden h-5 w-5 group-open:block" aria-hidden="true" />
            </summary>
            <nav aria-label="Mobile navigation" className="absolute right-0 top-full mt-3 hidden w-64 max-w-[calc(100vw-2rem)] gap-1 rounded-lg border bg-background p-2 text-foreground shadow-lg group-open:grid">
              {nav.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
                  aria-current={pathname === href ? "page" : undefined}
                  className="rounded-md px-4 py-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
