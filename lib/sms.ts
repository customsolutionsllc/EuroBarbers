import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const QUEUE_NEXT_MESSAGE =
  "EuroBarbers: You are next in queue. Your barber should be ready in about 10–20 minutes. Please be nearby.";

type SmsResult = {
  sent: boolean;
  status: "sent" | "stubbed" | "skipped" | "failed";
  reason?: string;
};

function twilioConfigured() {
  return (
    process.env.SMS_PROVIDER_ENABLED === "true" &&
    Boolean(process.env.TWILIO_ACCOUNT_SID) &&
    Boolean(process.env.TWILIO_AUTH_TOKEN) &&
    Boolean(process.env.TWILIO_PHONE_NUMBER)
  );
}

/**
 * Sends the one-time "you are next" SMS for a walk-in queue entry.
 *
 * Sending is gated by:
 *  - shop_settings.sms_enabled (admin master switch), and
 *  - the SMS_PROVIDER_ENABLED env flag + Twilio credentials.
 *
 * When the provider is not enabled, the message is "stubbed": it is logged to
 * sms_logs (status = 'stubbed') but never actually sent. The send is also
 * de-duplicated via walk_in_queue.next_sms_sent.
 */
export async function sendQueueNextSms(queueId: string): Promise<SmsResult> {
  const supabase = createAdminClient();

  const { data: queue } = await supabase
    .from("walk_in_queue")
    .select("id, customer_id, next_sms_sent, customers(phone, sms_transactional_consent, sms_opted_out)")
    .eq("id", queueId)
    .single();

  if (!queue) {
    return { sent: false, status: "skipped", reason: "QUEUE_ITEM_NOT_FOUND" };
  }

  if (queue.next_sms_sent) {
    return { sent: false, status: "skipped", reason: "ALREADY_SENT" };
  }

  const customer = (queue.customers ?? null) as unknown as
    | { phone: string; sms_transactional_consent: boolean; sms_opted_out: boolean }
    | null;
  if (!customer?.phone || !customer.sms_transactional_consent || customer.sms_opted_out) {
    return { sent: false, status: "skipped", reason: "NO_CONSENT" };
  }

  const { data: settings } = await supabase
    .from("shop_settings")
    .select("sms_enabled")
    .eq("id", true)
    .single();

  const smsEnabled = settings?.sms_enabled ?? false;

  async function log(status: string, providerMessageId: string | null) {
    await supabase.from("sms_logs").insert({
      customer_id: queue!.customer_id,
      queue_id: queue!.id,
      phone: customer!.phone,
      message: QUEUE_NEXT_MESSAGE,
      sms_type: "queue_next",
      provider: "twilio",
      provider_message_id: providerMessageId,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null
    });
  }

  async function markSent() {
    await supabase.from("walk_in_queue").update({ next_sms_sent: true }).eq("id", queue!.id);
  }

  // Master switch off — record intent but do not send.
  if (!smsEnabled) {
    await log("skipped", null);
    return { sent: false, status: "skipped", reason: "SMS_DISABLED" };
  }

  // Provider not configured — stub the send (built but switched off).
  if (!twilioConfigured()) {
    await log("stubbed", null);
    await markSent();
    return { sent: false, status: "stubbed", reason: "PROVIDER_DISABLED" };
  }

  try {
    const sid = process.env.TWILIO_ACCOUNT_SID as string;
    const token = process.env.TWILIO_AUTH_TOKEN as string;
    const from = process.env.TWILIO_PHONE_NUMBER as string;

    const body = new URLSearchParams({
      To: customer.phone,
      From: from,
      Body: QUEUE_NEXT_MESSAGE
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      }
    );

    if (!response.ok) {
      await log("failed", null);
      return { sent: false, status: "failed", reason: `HTTP_${response.status}` };
    }

    const json = (await response.json()) as { sid?: string };
    await log("sent", json.sid ?? null);
    await markSent();
    return { sent: true, status: "sent" };
  } catch (error) {
    await log("failed", null);
    return { sent: false, status: "failed", reason: error instanceof Error ? error.message : "ERROR" };
  }
}
