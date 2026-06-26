/**
 * Single source of truth for the shop's public business details (NAP),
 * hours, and SEO service areas. Reflects the locked product decisions:
 * one physical location, 10 AM–7 PM, America/New_York.
 *
 * Placeholder values are noted; replace before launch (see open-questions.md).
 */
export const siteConfig = {
  name: "EuroBarbers",
  tagline: "Precision cuts, beard craft, and a private-club booking experience.",
  phone: "614-900-6080",
  phoneHref: "tel:+16149006080",
  // Placeholder until confirmed.
  email: "hello@eurobarbers.com",
  address: {
    street: "7370 Sawmill Road",
    city: "Columbus",
    state: "OH",
    zip: "43235"
  },
  timezone: "America/New_York",
  // Open daily 10 AM–7 PM (placeholder; confirm exact days/hours).
  hoursLabel: "Open daily 10 AM – 7 PM",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://eurobarbers.example.com",
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
