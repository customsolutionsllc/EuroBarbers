"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type LobbyItem = {
  id: string;
  status: "waiting" | "next" | "in_chair";
  position: number;
  first_name: string;
  last_initial: string;
  barber_name: string | null;
  first_available: boolean;
  service_name: string;
};

const STATUS_LABEL: Record<string, string> = {
  in_chair: "In the chair",
  next: "You're next",
  waiting: "Waiting"
};

export function QueueDisplay({ token }: { token: string }) {
  const [items, setItems] = useState<LobbyItem[]>([]);
  const [invalid, setInvalid] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.rpc("get_lobby_queue", { p_token: token });
    if (error) {
      setInvalid(true);
    } else {
      setInvalid(false);
      setItems((data as LobbyItem[]) ?? []);
    }
    setLoaded(true);
  }, [token]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  if (loaded && invalid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-900 text-white">
        <p className="text-2xl">This display link is invalid.</p>
      </main>
    );
  }

  const inChair = items.filter((i) => i.status === "in_chair");
  const next = items.filter((i) => i.status === "next");
  const waiting = items.filter((i) => i.status === "waiting");

  return (
    <main className="min-h-screen bg-ink-900 px-8 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <h1 className="font-serif text-5xl font-semibold">EuroBarbers</h1>
          <p className="text-xl text-white/60">Now serving</p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <Column title="In the chair" accent="text-emerald-300" items={inChair} />
          <Column title="You're next" accent="text-amber-300" items={next} highlight />
          <Column title="Waiting" accent="text-white/70" items={waiting} />
        </div>

        {loaded && items.length === 0 ? (
          <p className="mt-16 text-center text-3xl text-white/50">
            No one is in the queue right now.
          </p>
        ) : null}
      </div>
    </main>
  );
}

function Column({
  title,
  accent,
  items,
  highlight
}: {
  title: string;
  accent: string;
  items: LobbyItem[];
  highlight?: boolean;
}) {
  return (
    <section>
      <h2 className={`text-2xl font-semibold uppercase tracking-wide ${accent}`}>{title}</h2>
      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li
            key={item.id}
            className={`rounded-2xl border border-white/10 p-6 ${
              highlight ? "bg-amber-500/15" : "bg-white/5"
            }`}
          >
            <p className="font-serif text-4xl font-semibold">
              {item.first_name} {item.last_initial}.
            </p>
            <p className="mt-2 text-lg text-white/60">
              {item.service_name} · {item.first_available ? "First Available" : item.barber_name}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
