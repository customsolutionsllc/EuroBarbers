"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const BARE_PREFIXES = ["/queue-display", "/login", "/admin", "/barber"];
// Exact routes that render full-screen without the public header/footer.
const BARE_EXACT = ["/"];

/**
 * Renders the public site header/footer around page content, except on
 * full-screen or app-shell routes (lobby TV, login, admin, barber) and the
 * under-construction landing page.
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
  const bare =
    BARE_EXACT.includes(pathname) ||
    BARE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <>
      {bare ? null : header}
      {children}
      {bare ? null : footer}
    </>
  );
}
