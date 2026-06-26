"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Barber, Service } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type BookingFormProps = {
  services: Service[];
  barbers: Barber[];
};

const TIME_ZONE = "America/New_York";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatSlotLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE
  }).format(new Date(iso));
}

export function BookingForm({ services, barbers }: BookingFormProps) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState<string>("any");
  const [date, setDate] = useState(todayIso());
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const service = useMemo(
    () => services.find((item) => item.id === serviceId),
    [services, serviceId]
  );
  const selectedBarber = barbers.find((item) => item.id === barberId);

  const loadSlots = useCallback(async () => {
    if (!serviceId || !date) {
      return;
    }
    setSlotsLoading(true);
    setSelectedSlot("");
    try {
      const params = new URLSearchParams({ serviceId, date });
      if (barberId !== "any") {
        params.set("barberId", barberId);
      }
      const response = await fetch(`/api/availability?${params.toString()}`);
      const body = await response.json().catch(() => null);
      setSlots(response.ok ? (body?.slots ?? []) : []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [serviceId, barberId, date]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) {
      setStatus("error");
      setMessage("Please pick an available time.");
      return;
    }
    setStatus("saving");
    setMessage("");
    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        barberId: barberId === "any" ? null : barberId,
        startsAt: selectedSlot,
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        customerPhone: form.get("phone"),
        customerEmail: form.get("email") || "",
        smsConsent
      })
    });

    if (response.ok) {
      setStatus("done");
      setMessage(
        "Appointment confirmed. We'll see you soon — a confirmation email is on its way if you provided one."
      );
      loadSlots();
      return;
    }

    const body = await response.json().catch(() => null);
    setStatus("error");
    setMessage(body?.error || "That time is no longer available.");
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Service</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {services.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setServiceId(item.id)}
                className={cn(
                  "rounded-lg border bg-white p-4 text-left transition hover:border-primary",
                  serviceId === item.id && "border-primary ring-2 ring-primary/20"
                )}
              >
                <span className="font-serif text-2xl font-semibold">{item.name}</span>
                <span className="mt-2 block text-sm text-muted-foreground">
                  {item.duration_minutes} min
                </span>
                <span className="mt-4 block font-semibold">{formatCurrency(item.price_cents)}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Barber</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setBarberId("any")}
              className={cn(
                "rounded-lg border bg-white p-4 text-left",
                barberId === "any" && "border-primary ring-2 ring-primary/20"
              )}
            >
              <UserRound className="h-5 w-5 text-primary" />
              <span className="mt-3 block font-serif text-2xl font-semibold">First Available</span>
              <span className="mt-2 block text-sm text-muted-foreground">Fastest available chair.</span>
            </button>
            {barbers.map((barber) => (
              <button
                type="button"
                key={barber.id}
                onClick={() => setBarberId(barber.id)}
                className={cn(
                  "rounded-lg border bg-white p-4 text-left",
                  barberId === barber.id && "border-primary ring-2 ring-primary/20"
                )}
              >
                <span className="font-serif text-2xl font-semibold">{barber.name}</span>
                <span className="mt-2 block text-sm text-muted-foreground">{barber.title}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Time</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="mb-2 block text-sm font-medium" htmlFor="date">
              Date
            </label>
            <Input
              id="date"
              type="date"
              min={todayIso()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <div className="mt-5">
              {slotsLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
                </p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No open times for this day. Try another date or barber.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "h-11 rounded-md border bg-white text-sm font-medium",
                        selectedSlot === slot && "border-primary bg-primary text-white"
                      )}
                    >
                      {formatSlotLabel(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="h-fit rounded-lg border bg-white p-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-3xl font-semibold">Confirm</h2>
        </div>
        <div className="mt-6 space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Service:</span> {service?.name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Barber:</span>{" "}
            {selectedBarber?.name || "First available"}
          </p>
          <p>
            <span className="text-muted-foreground">When:</span> {date}{" "}
            {selectedSlot ? `at ${formatSlotLabel(selectedSlot)}` : "— pick a time"}
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input name="firstName" placeholder="First name" required />
          <Input name="lastName" placeholder="Last name" required />
        </div>
        <div className="mt-4 space-y-4">
          <Input name="phone" type="tel" placeholder="Phone" required />
          <Input name="email" type="email" placeholder="Email (optional)" />
        </div>
        <label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={smsConsent}
            onChange={(event) => setSmsConsent(event.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            Text me appointment updates at this number. Message and data rates may apply. Consent is
            not a condition of booking.
          </span>
        </label>
        <Button className="mt-6 w-full" size="lg" disabled={status === "saving" || !selectedSlot}>
          {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Confirm booking
        </Button>
        {message ? (
          <p
            className={cn(
              "mt-4 flex gap-2 text-sm",
              status === "error" ? "text-red-700" : "text-emerald-700"
            )}
          >
            {status === "done" ? <CheckCircle2 className="h-4 w-4" /> : null}
            {message}
          </p>
        ) : null}
      </aside>
    </form>
  );
}
