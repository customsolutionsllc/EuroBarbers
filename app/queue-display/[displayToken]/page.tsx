import type { Metadata } from "next";
import { QueueDisplay } from "./queue-display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lobby Queue",
  robots: { index: false, follow: false }
};

export default async function QueueDisplayPage({
  params
}: {
  params: Promise<{ displayToken: string }>;
}) {
  const { displayToken } = await params;
  return <QueueDisplay token={displayToken} />;
}
