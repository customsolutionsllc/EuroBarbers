import { ImageResponse } from "next/og";
import { siteConfig, fullAddress } from "@/lib/site-config";

export const alt = "EuroBarbers — barber shop on Sawmill Road in Columbus, Ohio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: "#10151b", color: "#f5f1e8", padding: "72px", border: "16px solid #bf9b56" }}>
      <div style={{ display: "flex", fontSize: 28, color: "#d9ba78", letterSpacing: 5 }}>COLUMBUS, OHIO · SAWMILL ROAD</div>
      <div style={{ display: "flex", fontSize: 100, fontWeight: 700, marginTop: 30 }}>{siteConfig.name}</div>
      <div style={{ display: "flex", fontSize: 34, marginTop: 18 }}>Haircuts · Beard grooming · Walk-ins welcome</div>
      <div style={{ display: "flex", fontSize: 26, marginTop: 48 }}>{fullAddress()}</div>
      <div style={{ display: "flex", fontSize: 28, color: "#d9ba78", marginTop: 14 }}>{siteConfig.phone} · {siteConfig.hoursLabel}</div>
    </div>,
    size
  );
}
