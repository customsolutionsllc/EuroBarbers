import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const nav = [
  ["Services", "/services"],
  ["Team", "/team"],
  ["Gallery", "/gallery"],
  ["Book", "/book"],
  ["Check-in", "/check-in"]
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/92 backdrop-blur">
      <div className="section flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo-t.png"
            alt="EuroBarbers"
            width={80}
            height={120}
            priority
            className="h-11 w-auto object-contain"
          />
          <span className="font-serif text-2xl font-semibold">EuroBarbers</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
        <Button asChild>
          <Link href="/book">Reserve</Link>
        </Button>
      </div>
    </header>
  );
}
