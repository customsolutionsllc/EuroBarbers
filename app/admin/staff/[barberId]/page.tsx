import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUsername, usernameToEmail } from "@/lib/staff-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/confirm-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Barber Schedule",
  robots: { index: false, follow: false }
};

const TIME_ZONE = "America/New_York";

const DAYS: { value: number; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" }
];

type Barber = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  specialties: string[] | null;
  is_active: boolean;
  auth_user_id: string | null;
};
type Availability = { day_of_week: number; start_time: string; end_time: string; is_available: boolean };
type TimeOff = { id: string; start_datetime: string; end_datetime: string; reason: string | null };

function toSpecialties(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function hhmm(time: string | null | undefined) {
  return time ? time.slice(0, 5) : "";
}

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

function fmtRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: TIME_ZONE
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE
  });
  // Detect a whole-day block (midnight to midnight in shop tz).
  const startTime = timeFmt.format(start);
  const endDayStart = new Date(end.getTime() - 1);
  if (startTime === "12:00 AM") {
    const startDay = dateFmt.format(start);
    const lastDay = dateFmt.format(endDayStart);
    return startDay === lastDay ? `${startDay} · All day` : `${startDay} → ${lastDay} · All day`;
  }
  return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

async function saveDay(formData: FormData) {
  "use server";
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const barberId = String(formData.get("barberId"));
  const day = Number(formData.get("day"));
  const working = formData.get("working") === "on";
  await supabase.rpc("admin_set_barber_day", {
    p_barber_id: barberId,
    p_day: day,
    p_is_working: working,
    p_start: String(formData.get("start") ?? ""),
    p_end: String(formData.get("end") ?? "")
  });
  revalidatePath(`/admin/staff/${barberId}`);
}

async function addTimeOff(formData: FormData) {
  "use server";
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const barberId = String(formData.get("barberId"));
  await supabase.rpc("admin_add_time_off", {
    p_barber_id: barberId,
    p_start_date: String(formData.get("startDate") ?? ""),
    p_end_date: String(formData.get("endDate") ?? ""),
    p_all_day: formData.get("allDay") === "on",
    p_start_time: String(formData.get("startTime") ?? ""),
    p_end_time: String(formData.get("endTime") ?? ""),
    p_reason: String(formData.get("reason") ?? "")
  });
  revalidatePath(`/admin/staff/${barberId}`);
}

async function deleteTimeOff(formData: FormData) {
  "use server";
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const barberId = String(formData.get("barberId"));
  await supabase.rpc("admin_delete_time_off", { p_id: String(formData.get("id")) });
  revalidatePath(`/admin/staff/${barberId}`);
}

async function setActive(formData: FormData) {
  "use server";
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const barberId = String(formData.get("barberId"));
  await supabase.rpc("admin_set_barber_active", {
    p_barber_id: barberId,
    p_active: formData.get("active") === "on"
  });
  revalidatePath(`/admin/staff/${barberId}`);
  revalidatePath("/admin/staff");
}

async function saveInfo(formData: FormData) {
  "use server";
  await requireAdmin();
  const barberId = String(formData.get("barberId"));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_update_barber", {
    p_id: barberId,
    p_name: String(formData.get("name") ?? ""),
    p_title: String(formData.get("title") ?? ""),
    p_bio: String(formData.get("bio") ?? ""),
    p_specialties: toSpecialties(formData.get("specialties"))
  });
  revalidatePath(`/admin/staff/${barberId}`);
  revalidatePath("/admin/staff");
  redirect(`/admin/staff/${barberId}?msg=${encodeURIComponent(error ? "Could not save info." : "Barber info saved.")}`);
}

async function setLogin(formData: FormData) {
  "use server";
  await requireAdmin();
  const barberId = String(formData.get("barberId"));
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isValidUsername(username)) {
    redirect(
      `/admin/staff/${barberId}?msg=${encodeURIComponent(
        "Username must be 3–30 characters: letters, numbers, dot, dash, underscore."
      )}`
    );
  }
  if (password.length < 8) {
    redirect(
      `/admin/staff/${barberId}?msg=${encodeURIComponent("Password must be at least 8 characters.")}`
    );
  }

  const admin = createAdminClient();
  const { data: barber } = await admin
    .from("barbers")
    .select("id, name, auth_user_id")
    .eq("id", barberId)
    .single();
  if (!barber) {
    redirect(`/admin/staff/${barberId}?msg=${encodeURIComponent("Barber not found.")}`);
  }

  const email = usernameToEmail(username);
  let userId = (barber as { auth_user_id: string | null }).auth_user_id;

  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      email,
      password,
      email_confirm: true,
      user_metadata: { username }
    });
    if (error) {
      redirect(
        `/admin/staff/${barberId}?msg=${encodeURIComponent(
          "Could not update login — that username may already be taken."
        )}`
      );
    }
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username }
    });
    if (error || !data.user) {
      redirect(
        `/admin/staff/${barberId}?msg=${encodeURIComponent(
          "Could not create login — that username may already be taken."
        )}`
      );
    }
    userId = data.user.id;
  }

  await admin
    .from("profiles")
    .upsert(
      { id: userId, role: "barber", barber_id: barberId, full_name: (barber as { name: string }).name },
      { onConflict: "id" }
    );
  await admin.from("barbers").update({ auth_user_id: userId }).eq("id", barberId);

  revalidatePath(`/admin/staff/${barberId}`);
  redirect(`/admin/staff/${barberId}?msg=${encodeURIComponent(`Login saved. Username: ${username}`)}`);
}

async function removeBarber(formData: FormData) {
  "use server";
  await requireAdmin();
  const barberId = String(formData.get("barberId"));
  const supabase = await createServerSupabaseClient();
  const { data: barber } = await supabase
    .from("barbers")
    .select("auth_user_id")
    .eq("id", barberId)
    .single();

  const { error } = await supabase.rpc("admin_delete_barber", { p_id: barberId });
  if (error) {
    redirect(
      `/admin/staff/${barberId}?msg=${encodeURIComponent(
        "Can't delete a barber with appointment or visit history. Set them to Inactive instead."
      )}`
    );
  }

  const authUserId = (barber as { auth_user_id: string | null } | null)?.auth_user_id;
  if (authUserId) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(authUserId);
  }

  revalidatePath("/admin/staff");
  redirect("/admin/staff?msg=Barber+removed.");
}

export default async function BarberSchedulePage({
  params,
  searchParams
}: {
  params: Promise<{ barberId: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  await requireAdmin();
  const { barberId } = await params;
  const { msg } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const { data: barberData } = await supabase
    .from("barbers")
    .select("id, name, title, bio, specialties, is_active, auth_user_id")
    .eq("id", barberId)
    .single();

  const barber = barberData as Barber | null;
  if (!barber) {
    notFound();
  }

  let currentUsername: string | null = null;
  if (barber.auth_user_id) {
    const admin = createAdminClient();
    const { data: authData } = await admin.auth.admin.getUserById(barber.auth_user_id);
    const email = authData.user?.email ?? null;
    currentUsername = email ? email.split("@")[0] : null;
  }

  const [{ data: availData }, { data: timeOffData }] = await Promise.all([
    supabase
      .from("barber_availability")
      .select("day_of_week, start_time, end_time, is_available")
      .eq("barber_id", barberId)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("barber_time_off")
      .select("id, start_datetime, end_datetime, reason")
      .eq("barber_id", barberId)
      .gte("end_datetime", new Date().toISOString())
      .order("start_datetime", { ascending: true })
  ]);

  const availability = (availData ?? []) as Availability[];
  const timeOff = (timeOffData ?? []) as TimeOff[];
  const byDay = new Map<number, Availability>();
  for (const row of availability) {
    if (!byDay.has(row.day_of_week)) byDay.set(row.day_of_week, row);
  }

  const today = todayIso();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/staff"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to barbers
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-semibold">{barber.name}</h1>
          {barber.title && <p className="text-sm text-muted-foreground">{barber.title}</p>}
        </div>
        <form action={setActive} className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
          <input type="hidden" name="barberId" value={barber.id} />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="active"
              defaultChecked={barber.is_active}
              className="h-5 w-5"
            />
            Active (bookable)
          </label>
          <Button type="submit" variant="outline" size="sm">
            Save
          </Button>
        </form>
      </div>

      {msg && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-foreground">
          {msg}
        </p>
      )}

      {/* Barber info */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="font-serif text-2xl font-semibold">Barber info</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Name, title, specialties, and bio shown on the public site.
        </p>
        <form action={saveInfo} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="barberId" value={barber.id} />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Name
            </span>
            <Input name="name" defaultValue={barber.name} required className="mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Title
            </span>
            <Input name="title" defaultValue={barber.title ?? ""} className="mt-1" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Specialties (comma-separated)
            </span>
            <Input
              name="specialties"
              defaultValue={(barber.specialties ?? []).join(", ")}
              placeholder="Fades, Beards, Kids cuts"
              className="mt-1"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Short bio
            </span>
            <textarea
              name="bio"
              rows={3}
              defaultValue={barber.bio ?? ""}
              className="mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Save info</Button>
          </div>
        </form>
      </section>

      {/* Weekly hours */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="font-serif text-2xl font-semibold">Weekly hours</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the working window for each day. Uncheck a day to mark the barber off — those days
          immediately stop showing online booking slots.
        </p>
        <div className="mt-5 space-y-3">
          {DAYS.map((day) => {
            const row = byDay.get(day.value);
            const working = row ? row.is_available : false;
            return (
              <form
                key={day.value}
                action={saveDay}
                className="flex flex-wrap items-center gap-3 rounded-md border p-3"
              >
                <input type="hidden" name="barberId" value={barber.id} />
                <input type="hidden" name="day" value={day.value} />
                <label className="flex w-40 items-center gap-2 font-medium">
                  <input type="checkbox" name="working" defaultChecked={working} className="h-5 w-5" />
                  {day.label}
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    name="start"
                    defaultValue={hhmm(row?.start_time) || "10:00"}
                    className="h-10 rounded-md border px-2"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="time"
                    name="end"
                    defaultValue={hhmm(row?.end_time) || "19:00"}
                    className="h-10 rounded-md border px-2"
                  />
                </div>
                <Button type="submit" variant="outline" size="sm">
                  Save
                </Button>
              </form>
            );
          })}
        </div>
      </section>

      {/* Time off */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="font-serif text-2xl font-semibold">Time off</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Block days or hours (sick day, vacation, appointment). Customers cannot book these times.
        </p>

        <form action={addTimeOff} className="mt-5 grid gap-4 rounded-md border p-4 sm:grid-cols-2">
          <input type="hidden" name="barberId" value={barber.id} />
          <label className="text-sm">
            <span className="mb-1 block font-medium">Start date</span>
            <input
              type="date"
              name="startDate"
              min={today}
              defaultValue={today}
              required
              className="h-11 w-full rounded-md border px-3"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">End date</span>
            <input
              type="date"
              name="endDate"
              min={today}
              defaultValue={today}
              className="h-11 w-full rounded-md border px-3"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
            <input type="checkbox" name="allDay" defaultChecked className="h-5 w-5" />
            All day (whole day off)
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Start time</span>
            <span className="mb-1 block text-xs text-muted-foreground">Only used if not all day</span>
            <input type="time" name="startTime" defaultValue="12:00" className="h-11 w-full rounded-md border px-3" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">End time</span>
            <span className="mb-1 block text-xs text-muted-foreground">Only used if not all day</span>
            <input type="time" name="endTime" defaultValue="13:00" className="h-11 w-full rounded-md border px-3" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Reason (optional)</span>
            <input
              type="text"
              name="reason"
              placeholder="Vacation, sick, personal…"
              className="h-11 w-full rounded-md border px-3"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Add time off</Button>
          </div>
        </form>

        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming time off
          </h3>
          <ul className="mt-3 space-y-2">
            {timeOff.length === 0 ? (
              <li className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No upcoming time off.
              </li>
            ) : (
              timeOff.map((block) => (
                <li
                  key={block.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{fmtRange(block.start_datetime, block.end_datetime)}</p>
                    {block.reason && (
                      <p className="text-sm text-muted-foreground">{block.reason}</p>
                    )}
                  </div>
                  <form action={deleteTimeOff}>
                    <input type="hidden" name="barberId" value={barber.id} />
                    <input type="hidden" name="id" value={block.id} />
                    <button type="submit" className="text-sm text-red-700 hover:underline">
                      Remove
                    </button>
                  </form>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {/* Login & access */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="font-serif text-2xl font-semibold">Login &amp; access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentUsername
            ? "This barber can sign in with the username below. Set a new password or username any time."
            : "Create a username and password so this barber can sign in (no email needed)."}
        </p>
        {currentUsername && (
          <p className="mt-3 inline-block rounded-md bg-muted px-3 py-1.5 text-sm">
            Current username: <span className="font-semibold">{currentUsername}</span>
          </p>
        )}
        <form action={setLogin} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="barberId" value={barber.id} />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Username
            </span>
            <Input
              name="username"
              defaultValue={currentUsername ?? ""}
              placeholder="e.g. marko"
              autoCapitalize="none"
              required
              className="mt-1"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {currentUsername ? "New password" : "Password"}
            </span>
            <Input
              name="password"
              type="text"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              className="mt-1"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">{currentUsername ? "Update login" : "Create login"}</Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Tip: write the password down for the barber. They sign in at <span className="font-medium">/login</span> with
          their username and this password.
        </p>
      </section>

      {/* Danger zone */}
      <section className="rounded-lg border border-red-200 bg-red-50/40 p-6">
        <h2 className="font-serif text-2xl font-semibold text-red-800">Remove barber</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently deletes this barber and their login. If they have appointment or visit history,
          deletion is blocked — set them to Inactive instead (toggle at the top).
        </p>
        <form action={removeBarber} className="mt-4">
          <input type="hidden" name="barberId" value={barber.id} />
          <ConfirmButton
            variant="destructive"
            confirmMessage={`Permanently remove ${barber.name}? This cannot be undone.`}
          >
            Delete barber
          </ConfirmButton>
        </form>
      </section>
    </div>
  );
}
