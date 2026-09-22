"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const BARE_PREFIXES = ["/queue-display", "/login", "/admin", "/barber"];
// Exact routes that render full-screen without the public header/footer.
const BARE_EXACT = ["/construction"];

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

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <div className="flex-1">{children}</div>
      {footer}
    </div>
  );
}
