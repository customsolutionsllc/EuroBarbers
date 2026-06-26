import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false }
};

type Settings = {
  sms_enabled: boolean;
  walk_in_checkin_open: boolean;
  queue_display_token: string | null;
};

async function updateToggles(formData: FormData) {
  "use server";
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  await supabase
    .from("shop_settings")
    .update({
      sms_enabled: formData.get("sms_enabled") === "on",
      walk_in_checkin_open: formData.get("walk_in_checkin_open") === "on"
    })
    .eq("id", true);
  revalidatePath("/admin/settings");
}

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("shop_settings")
    .select("sms_enabled, walk_in_checkin_open, queue_display_token")
    .eq("id", true)
    .single();

  const settings = (data as Settings | null) ?? {
    sms_enabled: false,
    walk_in_checkin_open: true,
    queue_display_token: null
  };

  const displayUrl = settings.queue_display_token
    ? `/queue-display/${settings.queue_display_token}`
    : null;

  return (
    <div className="max-w-2xl space-y-8">
      <form action={updateToggles} className="space-y-6 rounded-lg border bg-white p-6">
        <h2 className="font-serif text-2xl font-semibold">Shop controls</h2>

        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="block font-medium">Walk-in check-in open</span>
            <span className="block text-sm text-muted-foreground">
              Turn off to show &ldquo;Walk-in check-in is currently closed.&rdquo; on the public page.
            </span>
          </span>
          <input
            type="checkbox"
            name="walk_in_checkin_open"
            defaultChecked={settings.walk_in_checkin_open}
            className="mt-1 h-5 w-5"
          />
        </label>

        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="block font-medium">SMS enabled</span>
            <span className="block text-sm text-muted-foreground">
              Master switch for all outgoing texts. Texts also require Twilio to be configured.
            </span>
          </span>
          <input
            type="checkbox"
            name="sms_enabled"
            defaultChecked={settings.sms_enabled}
            className="mt-1 h-5 w-5"
          />
        </label>

        <Button type="submit">Save settings</Button>
      </form>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="font-serif text-2xl font-semibold">Lobby TV display</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Open this secret link on the lobby TV. It shows the live queue without a login and never
          reveals phone numbers, emails, or full last names.
        </p>
        {displayUrl ? (
          <code className="mt-4 block break-all rounded-md bg-muted px-3 py-2 text-sm">
            {displayUrl}
          </code>
        ) : (
          <p className="mt-4 text-sm text-amber-700">
            No display token set yet. It is generated when the database is seeded.
          </p>
        )}
      </div>
    </div>
  );
}
