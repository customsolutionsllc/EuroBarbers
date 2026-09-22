import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const QuerySchema = z.object({
  serviceId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  barberId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/).nullable().optional(),
  date: z.string().date()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    serviceId: searchParams.get("serviceId") ?? "",
    barberId: searchParams.get("barberId"),
    date: searchParams.get("date") ?? ""
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid availability query." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_available_slots", {
      p_service_id: parsed.data.serviceId,
      p_barber_id: parsed.data.barberId ?? null,
      p_date: parsed.data.date
    });

    if (error) {
      return NextResponse.json({ error: "Availability lookup failed." }, { status: 503 });
    }

    // De-duplicate ISO timestamps across barbers (first-available view).
    const slots = Array.from(new Set((data as string[] | null) ?? [])).sort();

    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json(
      { error: "Availability lookup failed." },
      { status: 500 }
    );
  }
}
