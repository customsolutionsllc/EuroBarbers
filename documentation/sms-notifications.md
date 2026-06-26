# SMS Notifications

EuroBarbers sends exactly one **event-based** SMS: a "you're next" message when a
walk-in customer reaches the front of the queue. There is no marketing or
reminder SMS in this build.

## The message

Defined as `QUEUE_NEXT_MESSAGE` in [lib/sms.ts](../lib/sms.ts):

> EuroBarbers: You are next in queue. Your barber should be ready in about 10–20
> minutes. Please be nearby.

## When it sends

`sendQueueNextSms(queueId)` is invoked from `POST /api/queue` when a queue entry
is marked **next**. Before sending it checks, in order:

1. **Dedupe** — `walk_in_queue.next_sms_sent` must be false (each entry gets at
   most one queue-next SMS).
2. **Consent** — the customer must have `sms_transactional_consent` and must not
   be `sms_opted_out`, and must have a phone number.
3. **Admin toggle** — `shop_settings.sms_enabled` must be true.
4. **Provider** — `twilioConfigured()` (i.e. `SMS_PROVIDER_ENABLED === "true"`
   plus Twilio credentials).

## Double gating

| Layer | Where | Effect when off |
|-------|-------|-----------------|
| `SMS_PROVIDER_ENABLED` + Twilio creds | env (`twilioConfigured()`) | message **stubbed** (logged, not sent) |
| `shop_settings.sms_enabled` | admin **Settings** page | message **skipped** |

This lets the shop turn SMS on/off from the UI without redeploying, while the env
flag keeps SMS safely stubbed in non-production environments.

## Logging

Every attempt writes a row to `sms_logs` with a `status`:

| Status | Meaning |
|--------|---------|
| `sent` | Delivered to Twilio (with `provider_message_id`) |
| `stubbed` | Provider disabled by env; not sent |
| `skipped` | Skipped by consent/opt-out/admin toggle |
| `failed` | Twilio returned an error |

On a successful or stubbed send, `next_sms_sent` is set so the customer is never
messaged twice for the same queue entry.

## Sending mechanism

Twilio is called via plain REST (`fetch`) with HTTP Basic auth — no SDK
dependency. See `sendQueueNextSms` in [lib/sms.ts](../lib/sms.ts).

## Consent & compliance

Consent is captured at check-in (required) and at booking (optional), stored on
`customers` (`sms_transactional_consent`, `sms_opted_out`). The public
[SMS Policy](../app/sms-policy/page.tsx) page documents this. For production
sending, complete Twilio A2P 10DLC registration (see
[deployment.md](./deployment.md)).
