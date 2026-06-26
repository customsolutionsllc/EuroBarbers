import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const adminNav = [
  ["Dashboard", "/admin"],
  ["Calendar", "/admin/calendar"],
  ["Bookings", "/admin/bookings"],
  ["Queue", "/admin/queue"],
  ["Staff", "/admin/staff"],
  ["Services", "/admin/services"],
  ["Reports", "/admin/reports"],
  ["Settings", "/admin/settings"]
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <main className="section py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Admin</p>
          <h1 className="font-serif text-4xl font-semibold">Shop command center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {profile.fullName || profile.email}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <nav className="flex flex-wrap gap-2">
            {adminNav.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-md border bg-white px-3 py-2 text-sm font-medium hover:border-primary"
              >
                {label}
              </Link>
            ))}
          </nav>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-muted-foreground hover:text-foreground" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
      {children}
    </main>
  );
}
