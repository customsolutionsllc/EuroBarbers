"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export type StaffQueueItem = {
  id: string;
  status: "waiting" | "next" | "in_chair" | "completed" | "canceled" | "no_show";
  position: number;
  first_name: string;
  last_initial: string;
  phone: string | null;
  service_name: string;
  preferred_barber_name: string | null;
  served_by_name: string | null;
  first_available: boolean;
  checked_in_at: string;
  next_sms_sent: boolean;
};

type QueueBoardProps = {
  role: "admin" | "barber";
  barberId?: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  waiting: "bg-slate-100 text-slate-700",
  next: "bg-amber-100 text-amber-800",
  in_chair: "bg-emerald-100 text-emerald-800"
};

export function QueueBoard({ role, barberId }: QueueBoardProps) {
  const [items, setItems] = useState<StaffQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const { data, error: rpcError } = await supabase.rpc("get_staff_queue");
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setError("");
      setItems((data as StaffQueueItem[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel("walk_in_queue_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "walk_in_queue" },
        () => refetch()
      )
      .subscribe();

    // Fallback polling in case realtime is unavailable.
    const interval = setInterval(refetch, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [refetch]);

  async function act(body: Record<string, unknown>, id: string) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Action failed.");
      }
      await refetch();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading queue…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} in queue</p>
        <div className="flex items-center gap-3">
          {role === "barber" && barberId ? (
            <Button
              size="sm"
              onClick={() => act({ action: "takeNext", barberId }, "take-next")}
              disabled={busyId === "take-next"}
            >
              Take next customer
            </Button>
          ) : null}
          <button
            type="button"
            onClick={refetch}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-muted-foreground">
          The queue is empty.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 font-serif text-lg text-white">
                  {item.position}
                </span>
                <div>
                  <p className="font-medium">
                    {item.first_name} {item.last_initial}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.service_name} ·{" "}
                    {item.first_available
                      ? "First Available"
                      : item.preferred_barber_name ?? "Assigned"}
                    {item.phone ? ` · ${item.phone}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    STATUS_STYLES[item.status] ?? "bg-slate-100"
                  )}
                >
                  {item.status.replace("_", " ")}
                  {item.status === "next" && item.next_sms_sent ? " · texted" : ""}
                </span>

                {item.status === "waiting" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() => act({ action: "setStatus", queueId: item.id, status: "next" }, item.id)}
                  >
                    Mark next
                  </Button>
                ) : null}
                {item.status !== "in_chair" && item.status !== "waiting" ? null : null}
                {item.status === "next" || item.status === "waiting" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() =>
                      act({ action: "setStatus", queueId: item.id, status: "in_chair" }, item.id)
                    }
                  >
                    In chair
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  disabled={busyId === item.id}
                  onClick={() =>
                    act({ action: "setStatus", queueId: item.id, status: "completed" }, item.id)
                  }
                >
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === item.id}
                  onClick={() =>
                    act({ action: "setStatus", queueId: item.id, status: "no_show" }, item.id)
                  }
                >
                  No-show
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
