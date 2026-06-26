"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Barber, Service } from "@/lib/types";
import { cn } from "@/lib/utils";

type CheckInFormProps = {
  services: Service[];
  barbers: Barber[];
};

export function CheckInForm({ services, barbers }: CheckInFormProps) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState<string>("any");
  const [smsConsent, setSmsConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  const [alreadyInQueue, setAlreadyInQueue] = useState(false);

  const service = useMemo(
    () => services.find((item) => item.id === serviceId),
    [services, serviceId]
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!smsConsent) {
      setStatus("error");
      setMessage("Please agree to text updates so we can notify you when you're next.");
      return;
    }
    setStatus("saving");
    setMessage("");
    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        preferredBarberId: barberId === "any" ? null : barberId,
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        phone: form.get("phone"),
        email: form.get("email") || "",
        smsConsent
      })
    });

    const body = await response.json().catch(() => null);

    if (response.ok) {
      setStatus("done");
      setPosition(body?.position ?? null);
      setAlreadyInQueue(Boolean(body?.alreadyInQueue));
      return;
    }

    setStatus("error");
    setMessage(body?.error || "We couldn't add you to the queue. Please see the front desk.");
  }

  if (status === "done") {
    return (
      <div className="rounded-lg border bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-4 font-serif text-3xl font-semibold">
          {alreadyInQueue ? "You're already in line" : "You're checked in!"}
        </h2>
        {position ? (
          <p className="mt-3 text-lg">
            Your place in line: <span className="font-semibold">#{position}</span>
          </p>
        ) : null}
        <p className="mt-3 text-muted-foreground">
          We&apos;ll text you when you&apos;re next. Please stay nearby.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Service</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
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
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Barber</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
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
            <span className="mt-2 block text-sm text-muted-foreground">Whoever is open first.</span>
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
          <CardTitle>3. Your details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="firstName" placeholder="First name" required />
            <Input name="lastName" placeholder="Last name" required />
          </div>
          <Input name="phone" type="tel" placeholder="Mobile phone" required />
          <Input name="email" type="email" placeholder="Email (optional)" />
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={smsConsent}
              onChange={(event) => setSmsConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Text me when I&apos;m next in line. Message and data rates may apply. Reply STOP to opt
              out. Consent is not a condition of service.
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Joining the queue for <span className="font-medium text-foreground">{service?.name}</span>.
      </div>

      <Button className="w-full" size="lg" disabled={status === "saving"}>
        {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Join the queue
      </Button>

      {message ? <p className="text-sm text-red-700">{message}</p> : null}
    </form>
  );
}
