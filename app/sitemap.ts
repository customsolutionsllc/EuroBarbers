import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");

  const routes = [
    "",
    "/services",
    "/book",
    "/check-in",
    "/columbus-oh-barber-shop",
    "/dublin-oh-barber-shop",
    "/terms",
    "/privacy",
    "/sms-policy"
  ];

  return routes.map((path) => ({
    url: `${base}${path}`,
  }));
}
