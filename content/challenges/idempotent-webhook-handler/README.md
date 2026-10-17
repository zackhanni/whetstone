The payment provider calls `POST /webhooks/payments` whenever a payment succeeds, and
`handleWebhook` marks the order paid. Each delivery carries

```text
webhook-signature: t=1792219294,v1=5257a869e7ec…
```

where `v1` is the hex HMAC-SHA-256, keyed with the endpoint secret, of the string
`"<t>.<raw request body>"`. The provider retries any delivery that doesn't get a `2xx` — with a
**new timestamp and a new signature** each time — so the same event can arrive several times, and
a captured delivery could be sent again by anyone.

Support tickets this week:

- Payments whose webhook body was pretty-printed are never marked paid: every delivery is `400`.
- A security review replayed a two-week-old delivery and it was accepted.
- Some orders get two "payment received" emails.
- During yesterday's database blip, deliveries failed with `500`, and our ingestion queue re-ran
  them a minute later — the very same stored requests. Every re-run was answered `200`, yet those
  orders are still unpaid.

`signature.ts` already parses the header and checks an HMAC (`verifyHmacSha256Hex`, which lets Web
Crypto do the comparison). The decisions are yours.

Our ingestion queue hands `handleWebhook` one delivery at a time, so two copies of an event never
run at once here and an in-memory `processed` set is enough. With several workers it wouldn't be:
that's the check-then-act race from the reading, fixed with a unique insert in the database.

## Hints

- Order the checks: signature over the raw bytes → timestamp window → parse → dedupe → work.
- The only thing every delivery of one event has in common is the event's `id`.
- Add to `processed` on the line *after* `apply` succeeded, not before it.
