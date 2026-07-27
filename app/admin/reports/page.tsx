import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reports",
  robots: { index: false, follow: false }
};

type Reports = {
  start: string;
  end: string;
  total_check_ins: number;
  completed: number;
  no_show: number;
  canceled: number;
  total_appointments: number;
  unique_customers: number;
  returning_customers: number;
  by_dow: Record<string, number>;
  by_hour: Record<string, number>;
  by_barber: { name: string; count: number }[];
  by_service: { name: string; count: number }[];
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TZ = "America/New_York";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

function minusDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function isValidIso(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export default async function AdminReportsPage({
  searchParams
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const today = todayIso();
  const end = isValidIso(sp.end) ? sp.end : today;
  const start = isValidIso(sp.start) ? sp.start : minusDays(end, 29);

  const presets = [
    { label: "Last 7 days", start: minusDays(today, 6), end: today },
    { label: "Last 30 days", start: minusDays(today, 29), end: today },
    { label: "Last 90 days", start: minusDays(today, 89), end: today },
    { label: "This year", start: `${today.slice(0, 4)}-01-01`, end: today }
  ];

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.rpc("get_admin_reports", { p_start: start, p_end: end });
  const reports = data as Reports | null;

  const rangeControls = (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const active = p.start === start && p.end === end;
          return (
            <a
              key={p.label}
              href={`/admin/reports?start=${p.start}&end=${p.end}`}
              className={
                active
                  ? "rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  : "rounded-md border px-3 py-2 text-sm font-medium hover:border-primary"
              }
            >
              {p.label}
            </a>
          );
        })}
      </div>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From</span>
          <input
            type="date"
            name="start"
            defaultValue={start}
            max={today}
            className="mt-1 block rounded-md border border-input bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To</span>
          <input
            type="date"
            name="end"
            defaultValue={end}
            max={today}
            className="mt-1 block rounded-md border border-input bg-white px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-ink-700"
        >
          Apply range
        </button>
      </form>
    </div>
  );

  if (!reports) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">{start} to {end}</p>
        </div>
        {rangeControls}
        <p className="text-muted-foreground">No report data available for this range.</p>
      </div>
    );
  }

  const stats = [
    { label: "Check-ins (visits)", value: reports.total_check_ins },
    { label: "Appointments", value: reports.total_appointments },
    { label: "Unique customers", value: reports.unique_customers },
    { label: "Returning customers", value: reports.returning_customers },
    { label: "Completed", value: reports.completed },
    { label: "No-shows", value: reports.no_show }
  ];

  const dowMax = Math.max(0, ...DOW.map((_, i) => reports.by_dow[String(i)] ?? 0));
  const hours = Array.from({ length: 24 }, (_, h) => h).filter(
    (h) => (reports.by_hour[String(h)] ?? 0) > 0
  );
  const hourMax = Math.max(0, ...hours.map((h) => reports.by_hour[String(h)] ?? 0));
  const barberMax = Math.max(0, ...reports.by_barber.map((b) => b.count));
  const serviceMax = Math.max(0, ...reports.by_service.map((s) => s.count));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">
            {reports.start} to {reports.end}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/export?type=check_ins"
            className="rounded-md border bg-white px-3 py-2 text-sm font-medium hover:border-primary"
          >
            Export check-ins (CSV)
          </a>
          <a
            href="/api/admin/export?type=customers"
            className="rounded-md border bg-white px-3 py-2 text-sm font-medium hover:border-primary"
          >
            Export customers (CSV)
          </a>
        </div>
      </div>

      {rangeControls}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-white p-6">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-serif text-4xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6">
          <h3 className="font-semibold">Busiest days of week</h3>
          <div className="mt-4 space-y-2">
            {DOW.map((label, i) => (
              <Bar key={label} label={label} value={reports.by_dow[String(i)] ?? 0} max={dowMax} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="font-semibold">Busiest hours</h3>
          <div className="mt-4 space-y-2">
            {hours.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              hours.map((h) => (
                <Bar
                  key={h}
                  label={`${h}:00`}
                  value={reports.by_hour[String(h)] ?? 0}
                  max={hourMax}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="font-semibold">Demand by barber</h3>
          <div className="mt-4 space-y-2">
            {reports.by_barber.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              reports.by_barber.map((b) => (
                <Bar key={b.name} label={b.name.slice(0, 8)} value={b.count} max={barberMax} />
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="font-semibold">Demand by service</h3>
          <div className="mt-4 space-y-2">
            {reports.by_service.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              reports.by_service.map((s) => (
                <Bar key={s.name} label={s.name.slice(0, 8)} value={s.count} max={serviceMax} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
