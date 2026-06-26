import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { QueueBoard } from "@/components/queue-board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Walk-in Queue",
  robots: { index: false, follow: false }
};

export default async function AdminQueuePage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold">Live walk-in queue</h2>
        <p className="text-sm text-muted-foreground">
          Updates in real time. Marking a customer &ldquo;next&rdquo; texts them if SMS is enabled.
        </p>
      </div>
      <QueueBoard role="admin" />
    </div>
  );
}
