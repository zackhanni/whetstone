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

export function createOrderPaidHandler(deps: { inbox: Inbox; shipments: Shipments }) {
  const { inbox, shipments } = deps;

  return async function onOrderPaid(delivery: Delivery): Promise<Outcome> {
    // The event's own id: the same on every delivery of this event, a publisher's retry included.
    // The "shipping:" prefix is this consumer's name — another consumer of order.paid (say, the
    // email service) keeps its own records and still handles every event once.
    const key = `shipping:${delivery.payload.eventId}`;

    // Claim the event in ONE atomic step (Redis: SET key in-progress NX PX 60000). Of any number
    // of concurrent deliveries, exactly one gets `true`.
    const claimed = await inbox.setIfAbsent(key, "in-progress", CLAIM_TTL_MS);
    if (!claimed) {
      // Finished: safe to acknowledge. Still in progress (or the claim just expired): don't
      // acknowledge — if the first attempt fails, this delivery is the one that must retry.
      return (await inbox.get(key)) === "done" ? "duplicate" : "retry-later";
    }

    try {
      await shipments.create(delivery.payload.orderId);
    } catch (err) {
      // Release the claim so the redelivery can do the work, then let the broker redeliver.
      await inbox.delete(key);
      throw err;
    }

    // Only now is the event done. If this worker dies before reaching this line, the claim
    // expires after CLAIM_TTL_MS and a redelivery takes over.
    await inbox.set(key, "done", DONE_TTL_MS);
    return "processed";
  };
}
