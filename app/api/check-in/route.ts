import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const CheckInSchema = z.object({
  serviceId: z.string().min(1),
  preferredBarberId: z.string().min(1).nullable().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  smsConsent: z.boolean(),
  marketingConsent: z.boolean().optional()
});

const FRIENDLY_ERRORS: Record<string, string> = {
  WALK_IN_CLOSED: "Walk-in check-in is currently closed.",
  CONSENT_REQUIRED: "Please agree to receive text updates so we can notify you when you're next.",
  SERVICE_UNAVAILABLE: "That service is no longer available."
};

function friendlyMessage(raw: string) {
  for (const key of Object.keys(FRIENDLY_ERRORS)) {
    if (raw.includes(key)) {
      return FRIENDLY_ERRORS[key];
    }
  }
  return "We couldn't add you to the queue. Please see the front desk.";
}

export async function POST(request: Request) {
  const parsed = CheckInSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid check-in details." }, { status: 400 });
  }

  const input = parsed.data;
  const email = input.email && input.email.length > 0 ? input.email : null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("join_walk_in_queue", {
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_phone: input.phone,
      p_email: email,
      p_service_id: input.serviceId,
      p_preferred_barber_id: input.preferredBarberId ?? null,
      p_transactional_consent: input.smsConsent,
      p_marketing_consent: input.marketingConsent ?? false
    });

    if (error) {
      const status = error.message.includes("WALK_IN_CLOSED") ? 409 : 400;
      return NextResponse.json({ error: friendlyMessage(error.message) }, { status });
    }

    return NextResponse.json(
      {
        position: data?.position ?? null,
        alreadyInQueue: data?.already_in_queue ?? false
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check-in failed." },
      { status: 500 }
    );
  }
}
