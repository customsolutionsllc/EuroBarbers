import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendQueueNextSms } from "@/lib/sms";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setStatus"),
    queueId: z.string().uuid(),
    status: z.enum(["waiting", "next", "in_chair", "completed", "canceled", "no_show"])
  }),
  z.object({
    action: z.literal("takeNext"),
    barberId: z.string().uuid()
  })
]);

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const parsed = ActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  try {
    if (parsed.data.action === "takeNext") {
      // Barbers can only take their own next customer.
      const barberId =
        profile.role === "admin" ? parsed.data.barberId : profile.barberId ?? parsed.data.barberId;
      if (profile.role !== "admin" && profile.barberId !== barberId) {
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });
      }

      const { data, error } = await supabase.rpc("take_next_customer", { p_barber_id: barberId });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (data?.found && data?.id) {
        await sendQueueNextSms(data.id as string);
      }
      return NextResponse.json({ result: data });
    }

    const { queueId, status } = parsed.data;
    const { data, error } = await supabase.rpc("update_walk_in_status", {
      p_queue_id: queueId,
      p_status: status,
      p_served_by_barber_id: profile.role === "barber" ? profile.barberId : null
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (status === "next") {
      await sendQueueNextSms(queueId);
    }
    return NextResponse.json({ result: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action failed." },
      { status: 500 }
    );
  }
}
