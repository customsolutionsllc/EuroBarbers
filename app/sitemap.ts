import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();

  const routes = [
    "",
    "/services",
    "/team",
    "/gallery",
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
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/book" || path === "/check-in" ? 0.9 : 0.7
  }));
}
