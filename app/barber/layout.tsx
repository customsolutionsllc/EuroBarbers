import Link from "next/link";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BarberLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();

  return (
    <main className="section py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Barber</p>
          <h1 className="font-serif text-4xl font-semibold">My day</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {profile.fullName || profile.email}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {profile.role === "admin" ? (
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          ) : null}
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
