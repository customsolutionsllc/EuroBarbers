import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAllBarbers } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

function toSpecialties(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function addBarber(formData: FormData) {
  "use server";
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/admin/staff?msg=Name+is+required.");
  }
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("admin_create_barber", {
    p_name: name,
    p_title: String(formData.get("title") ?? ""),
    p_bio: String(formData.get("bio") ?? ""),
    p_specialties: toSpecialties(formData.get("specialties"))
  });
  revalidatePath("/admin/staff");
  redirect("/admin/staff?msg=Barber+added.");
}

export default async function AdminStaffPage({
  searchParams
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  await requireAdmin();
  const { msg } = await searchParams;
  const barbers = await getAllBarbers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Barbers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a barber to manage their info, weekly hours, time off, login, and whether they&apos;re
          bookable.
        </p>
      </div>

      {msg && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-foreground">
          {msg}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {barbers.map((barber) => (
          <Link
            key={barber.id}
            href={`/admin/staff/${barber.id}`}
            className="block rounded-lg border bg-white p-6 transition hover:border-primary hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-serif text-2xl font-semibold">{barber.name}</h2>
              <span
                className={
                  barber.is_active
                    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                    : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                }
              >
                {barber.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {barber.title && <p className="mt-2 text-sm text-muted-foreground">{barber.title}</p>}
            {barber.specialties && barber.specialties.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {barber.specialties.map((s) => (
                  <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {s}
                  </span>
                ))}
              </div>
            )}
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <CalendarClock className="h-4 w-4" /> Manage barber
            </span>
          </Link>
        ))}
        {barbers.length === 0 && (
          <p className="text-sm text-muted-foreground">No barbers found.</p>
        )}
      </div>

      <details className="rounded-lg border border-dashed bg-muted/30">
        <summary className="cursor-pointer list-none px-5 py-4 font-serif text-xl font-semibold">
          + Add a barber
        </summary>
        <form action={addBarber} className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Name
            </span>
            <Input name="name" placeholder="e.g. Sam" required className="mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Title
            </span>
            <Input name="title" placeholder="e.g. Barber" className="mt-1" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Specialties (comma-separated)
            </span>
            <Input name="specialties" placeholder="Fades, Beards, Kids cuts" className="mt-1" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Short bio
            </span>
            <textarea
              name="bio"
              rows={3}
              placeholder="A sentence about this barber…"
              className="mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary">Add barber</Button>
          </div>
        </form>
      </details>
    </div>
  );
}
