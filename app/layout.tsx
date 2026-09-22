import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteChrome } from "@/components/site-chrome";
import { siteConfig } from "@/lib/site-config";

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
    "Men's haircuts, kids' cuts and beard grooming at EuroBarbers, 7370 Sawmill Road, Columbus, OH. Serving Dublin too. Walk in or call 614-900-6080.",
  metadataBase: new URL(siteConfig.url),
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
  openGraph: {
    type: "website",
    images: [siteConfig.socialImage],
    siteName: siteConfig.name,
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"]
  }
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  "@id": `${siteConfig.url}/#business`,
  name: siteConfig.name,
  description:
    "Luxury barber shop for precision fades, beard work, and classic grooming in Columbus, Ohio.",
  url: siteConfig.url,
  telephone: siteConfig.phoneHref.replace("tel:", ""),
  priceRange: "$$",
  image: `${siteConfig.url}/opengraph-image`,
  logo: `${siteConfig.url}/icon.png`,
  hasMap: siteConfig.mapsUrl,
  address: {
    "@type": "PostalAddress",
    streetAddress: siteConfig.address.street,
    addressLocality: siteConfig.address.city,
    addressRegion: siteConfig.address.state,
    postalCode: siteConfig.address.zip,
    addressCountry: "US"
  },
  areaServed: siteConfig.serviceAreas.map((area) => ({ "@type": "City", name: area.label })),
  openingHoursSpecification: [{
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: siteConfig.hours.opens,
    closes: siteConfig.hours.closes
  }]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd).replace(/</g, "\\u003c") }}
        />
        <SiteChrome header={<SiteHeader />} footer={<SiteFooter />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
