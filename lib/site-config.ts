/**
 * Single source of truth for the shop's public business details (NAP),
 * hours, and service areas. One physical location in America/New_York.
 * Keep these details aligned with the verified Google Business Profile.
 */
export const siteConfig = {
  name: "EuroBarbers",
  tagline: "Precision haircuts and beard grooming on Sawmill Road in Columbus, Ohio.",
  phone: "614-900-6080",
  phoneHref: "tel:+16149006080",
  address: {
    street: "7370 Sawmill Road",
    city: "Columbus",
    state: "OH",
    zip: "43235"
  },
  timezone: "America/New_York",
  hours: { opens: "11:00", closes: "20:00" },
  get hoursLabel() {
    const format = (time: string) => {
      const [hour, minute] = time.split(":").map(Number);
      return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${hour >= 12 ? "PM" : "AM"}`;
    };
    return `Open daily ${format(this.hours.opens)} – ${format(this.hours.closes)}`;
  },
  url: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://eurobarbers.com").origin,
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=EuroBarbers%207370%20Sawmill%20Road%20Columbus%20OH%2043235",
  socialImage: {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "EuroBarbers — Columbus, Ohio barber shop"
  },
  // SEO service areas (not separate locations).
  serviceAreas: [
    { label: "Columbus, OH", href: "/columbus-oh-barber-shop" },
    { label: "Dublin, OH", href: "/dublin-oh-barber-shop" }
  ],
  legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "SMS Policy", href: "/sms-policy" }
  ]
} as const;

export function fullAddress() {
  const { street, city, state, zip } = siteConfig.address;
  return `${street}, ${city}, ${state} ${zip}`;
}
