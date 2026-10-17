The shipping service consumes `order.paid` events and books a courier for each one. In Nest this
is the body of an `@EventPattern("order.paid")` handler; here it's a plain function so the
sandbox can run it. The broker delivers **at least once**: a publisher retries after a timeout
(same event, new `messageId`), and the broker redelivers anything that wasn't acknowledged — a
crash, an error, or a `"retry-later"` outcome. Booking a courier is not idempotent on its own:
call it twice and the customer gets two parcels.

`inbox.ts` is the consumer's inbox in Redis, shared by every replica of the service: `get`,
`set`, `delete`, and `setIfAbsent` — Redis's `SET key value NX PX ttl`, the one operation that
checks and writes as a single atomic step. Every call is a network round trip, so every call
awaits. `shipments.ts` books couriers, and can be told to fail once, to wait until the test
releases it (a slow courier API), or to hang forever (a worker that died mid-call). `clock.ts`
lets the tests step past a TTL.

The handler survives a demo where every event arrives exactly once. Under real delivery it books
duplicate parcels, and sometimes none:

1. **The wrong key.** It dedupes on `messageId`, which is new for every publish.
2. **Check, then act.** Two deliveries can both read "not seen" before either writes.
3. **Done too early.** It records the event as done *before* booking, so if booking fails — or the
   worker dies — every redelivery is skipped as a duplicate and the order never ships.
4. **In-flight duplicates.** A delivery that arrives while the first one is still booking is
   acknowledged as a duplicate. If the first attempt then fails, nothing is left to retry it.

## Hints

- The dedupe key must be the same for every delivery of an event, so build it from the event's
  data (`payload.eventId`) — never from something assigned per send. Prefix it with the
  consumer's name, so another service handling the same event keeps its own record.
- Use two states: claim with `"in-progress"` and a short TTL (`CLAIM_TTL_MS`), and write
  `"done"` with `DONE_TTL_MS` only after the shipment exists.
- `setIfAbsent` resolving `false` means someone else holds the key. Read it: `"done"` can be
  acknowledged, anything else should come back later.
- On failure, delete the claim before rethrowing — otherwise the redelivery finds it and waits for
  `CLAIM_TTL_MS` for nothing.
