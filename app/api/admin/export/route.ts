import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const type = new URL(request.url).searchParams.get("type") ?? "check_ins";
  const supabase = await createServerSupabaseClient();

  let rows: Record<string, unknown>[] = [];

  if (type === "customers") {
    const { data, error } = await supabase
      .from("customers")
      .select(
        "first_name, last_name, phone, email, sms_transactional_consent, sms_marketing_consent, sms_opted_out, last_seen_at, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    rows = (data ?? []) as Record<string, unknown>[];
  } else if (type === "check_ins") {
    const { data, error } = await supabase
      .from("check_ins")
      .select(
        "checked_in_at, status, check_in_type, completed_at, customers(first_name, last_name, phone, email), services(name), served:barbers!check_ins_served_by_barber_id_fkey(name)"
      )
      .order("checked_in_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    rows = ((data ?? []) as Record<string, unknown>[]).map((r) => {
      const customer = (r.customers ?? {}) as Record<string, unknown>;
      const service = (r.services ?? {}) as Record<string, unknown>;
      const served = (r.served ?? {}) as Record<string, unknown>;
      return {
        checked_in_at: r.checked_in_at,
        status: r.status,
        type: r.check_in_type,
        completed_at: r.completed_at,
        first_name: customer.first_name ?? "",
        last_name: customer.last_name ?? "",
        phone: customer.phone ?? "",
        email: customer.email ?? "",
        service: service.name ?? "",
        served_by: served.name ?? ""
      };
    });
  } else {
    return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
  }

  const csv = toCsv(rows);
  const filename = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
