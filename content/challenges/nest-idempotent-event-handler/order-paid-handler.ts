import type { Inbox } from "./inbox";
import type { Shipments } from "./shipments";

/** The event the payments service emits once an order is paid. */
export type OrderPaid = { eventId: string; orderId: string };

/**
 * One delivery of a message. The broker assigns `messageId` per publish, so when the publisher
 * retries after a timeout, the same event arrives again with a NEW messageId.
 */
export type Delivery = { messageId: string; payload: OrderPaid };

/**
 * What the consumer tells the broker. "processed" and "duplicate" acknowledge the delivery;
 * "retry-later" leaves it unacknowledged so it is redelivered. A thrown error is redelivered too.
 */
export type Outcome = "processed" | "duplicate" | "retry-later";

/** How long an in-progress claim lives if the worker holding it dies. */
export const CLAIM_TTL_MS = 60_000;
/** How long a handled event is remembered — longer than the broker could ever redeliver it. */
export const DONE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The shipping service's handler for `order.paid` — in Nest, the body of an
 * `@EventPattern("order.paid")` method. Delivery is at least once, so it must book ONE courier per
 * event however many times the event arrives. Four bugs, in the order worth fixing them:
 *   1. key — it dedupes on messageId, which changes when the publisher retries.
 *   2. race — it checks, then writes, with an await in between, so two concurrent deliveries
 *      both pass the check.
 *   3. failure — it marks the event done before the shipment exists, so a failed (or crashed)
 *      attempt is never retried and the event is lost.
 *   4. in flight — a duplicate that arrives while the first delivery is still working is
 *      acknowledged as if the work were finished.
 */
export function createOrderPaidHandler(deps: { inbox: Inbox; shipments: Shipments }) {
  const { inbox, shipments } = deps;

  return async function onOrderPaid(delivery: Delivery): Promise<Outcome> {
    const key = `shipping:${delivery.messageId}`;

    if ((await inbox.get(key)) !== undefined) return "duplicate";
    await inbox.set(key, "done", DONE_TTL_MS);

    await shipments.create(delivery.payload.orderId);
    return "processed";
  };
}
