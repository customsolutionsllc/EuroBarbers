import { NextResponse } from "next/server";
import { z } from "zod";
import { sendBookingConfirmation } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

const BookingSchema = z.object({
  serviceId: z.string().min(1),
  barberId: z.string().min(1).nullable().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  customerPhone: z.string().min(7),
  customerEmail: z.string().email().optional().or(z.literal("")),
  startsAt: z.string().datetime(),
  smsConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  notes: z.string().max(500).optional()
});

// Maps Postgres exceptions raised by create_appointment to friendly copy.
const FRIENDLY_ERRORS: Record<string, string> = {
  SERVICE_UNAVAILABLE: "That service is no longer available.",
  BARBER_UNAVAILABLE: "That barber can't perform this service.",
  NO_BARBER_AVAILABLE: "No barber is available at that time. Please pick another slot.",
  OUTSIDE_HOURS: "That time is outside the barber's working hours.",
  BARBER_OFF: "The barber is unavailable at that time.",
  TOO_SOON: "That time is too soon to book. Please pick a later slot.",
  SLOT_TAKEN: "Sorry, that slot was just booked. Please choose another time."
};

function friendlyMessage(raw: string) {
  for (const key of Object.keys(FRIENDLY_ERRORS)) {
    if (raw.includes(key)) {
      return FRIENDLY_ERRORS[key];
    }
  }
  return "We couldn't complete your booking. Please try another time.";
}

export async function POST(request: Request) {
  const parsed = BookingSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking details." }, { status: 400 });
  }

  const input = parsed.data;
  const email = input.customerEmail && input.customerEmail.length > 0 ? input.customerEmail : null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("create_appointment", {
      p_service_id: input.serviceId,
      p_barber_id: input.barberId ?? null,
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_phone: input.customerPhone,
      p_email: email,
      p_starts_at: input.startsAt,
      p_transactional_consent: input.smsConsent ?? false,
      p_marketing_consent: input.marketingConsent ?? false,
      p_notes: input.notes ?? null
    });

    if (error) {
      return NextResponse.json({ error: friendlyMessage(error.message) }, { status: 409 });
    }

    // Email confirmations are only sent when an email is provided (decision #9).
    if (email) {
      await sendBookingConfirmation({
        to: email,
        customerName: `${input.firstName} ${input.lastName}`.trim(),
        serviceName: data?.service_name || "your service",
        barberName: data?.barber_name || "your barber",
        startsAt: input.startsAt
      });
    }

    return NextResponse.json({ booking: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Booking failed." },
      { status: 500 }
    );
  }
}
