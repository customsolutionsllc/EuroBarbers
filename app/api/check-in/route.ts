import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonRequest } from "@/lib/http";

const CheckInSchema = z.object({
  serviceId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  preferredBarberId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/).nullable().optional(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(7).max(30).regex(/^\+?[0-9().\s-]+$/),
  email: z.string().trim().max(254).email().optional().or(z.literal("")),
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
  const body = await readJsonRequest(request);
  if (body.response) return body.response;
  const parsed = CheckInSchema.safeParse(body.data);

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
  } catch {
    return NextResponse.json(
      { error: "Check-in failed. Please see the front desk." },
      { status: 500 }
    );
  }
}
