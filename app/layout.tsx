import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteChrome } from "@/components/site-chrome";
import { siteConfig, fullAddress } from "@/lib/site-config";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["500", "600", "700"]
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: {
    default: "EuroBarbers | Columbus, OH Barber Shop",
    template: "%s | EuroBarbers"
  },
  description:
    "Luxury barber shop for precision fades, beard work, and classic grooming in Columbus, Ohio. Book online or join the walk-in queue.",
  metadataBase: new URL(siteConfig.url),
  alternates: { canonical: "/" },
  keywords: [
    "barber shop Columbus",
    "barber shop Dublin OH",
    "skin fade Columbus",
    "beard trim",
    "hot towel shave",
    "men's haircut"
  ],
  openGraph: {
    title: "EuroBarbers | Columbus, OH Barber Shop",
    description: "Premium barbering, online booking, and walk-in queue in Columbus, Ohio.",
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "EuroBarbers | Columbus, OH Barber Shop",
    description: "Premium barbering, online booking, and walk-in queue in Columbus, Ohio."
  }
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "BarberShop",
  name: siteConfig.name,
  description:
    "Luxury barber shop for precision fades, beard work, and classic grooming in Columbus, Ohio.",
  url: siteConfig.url,
  telephone: siteConfig.phoneHref.replace("tel:", ""),
  email: siteConfig.email,
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: siteConfig.address.street,
    addressLocality: siteConfig.address.city,
    addressRegion: siteConfig.address.state,
    postalCode: siteConfig.address.zip,
    addressCountry: "US"
  },
  areaServed: siteConfig.serviceAreas.map((a) => a.label.replace(", OH", "")),
  openingHours: "Mo-Su 10:00-19:00",
  // Aggregate address string for crawlers that prefer a flat field.
  knowsAbout: fullAddress()
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <SiteChrome header={<SiteHeader />} footer={<SiteFooter />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
