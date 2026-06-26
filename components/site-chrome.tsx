"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const BARE_PREFIXES = ["/queue-display", "/login", "/admin", "/barber"];

/**
 * Renders the public site header/footer around page content, except on
 * full-screen or app-shell routes (lobby TV, login, admin, barber).
 */
export function SiteChrome({
  header,
  footer,
  children
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const bare = BARE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <>
      {bare ? null : header}
      {children}
      {bare ? null : footer}
    </>
  );
}
