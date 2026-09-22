"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const nav = [
  ["Home", "/preview"],
  ["Services", "/services"]
];

export function SiteHeader() {
  const pathname = usePathname() ?? "";
  const isHome = pathname === "/preview" || pathname === "/";
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
      <div className="section flex h-28 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo-t.png"
            alt="EuroBarbers"
            width={240}
            height={360}
            priority
            className={`w-auto object-contain transition-all duration-300 ${
              overDark ? "h-48 self-start mt-3" : "h-24"
            }`}
          />
          <span
            className={`font-serif text-2xl font-semibold transition-colors ${
              overDark ? "text-gold-200" : "text-foreground"
            }`}
          >
            EuroBarbers
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 md:flex">
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
        </div>
      </div>
    </header>
  );
}
