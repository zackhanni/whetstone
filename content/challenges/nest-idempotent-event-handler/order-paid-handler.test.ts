import { createOrderPaidHandler, CLAIM_TTL_MS, type Delivery } from "./order-paid-handler";
import { FakeInbox } from "./inbox";
import { FakeShipments } from "./shipments";
import { clock } from "./clock";

function setup() {
  clock.reset();
  const inbox = new FakeInbox();
  const shipments = new FakeShipments();
  return { inbox, shipments, onOrderPaid: createOrderPaidHandler({ inbox, shipments }) };
}

const orderPaid = (messageId: string, orderId = "ord_1"): Delivery => ({
  messageId,
  payload: { eventId: `order-paid:${orderId}`, orderId },
});

/**
 * Wait until a condition holds. Timers are real, and a background tab slows them to about one tick
 * a second, so poll against a generous deadline rather than sleeping for a fixed time.
 */
async function until(condition: () => boolean, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(condition()).toBe(true);
}

describe("onOrderPaid", () => {
  it("books one shipment for a new event", async () => {
    const { shipments, onOrderPaid } = setup();
    expect(await onOrderPaid(orderPaid("m1"))).toBe("processed");
    expect(shipments.count("ord_1")).toBe(1);
  });

  it("handles two different events independently", async () => {
    const { shipments, onOrderPaid } = setup();
    await onOrderPaid(orderPaid("m1", "ord_1"));
    await onOrderPaid(orderPaid("m2", "ord_2"));
    expect(shipments.booked.join(",")).toBe("ord_1,ord_2");
  });

  it("treats a publisher retry (same event, new messageId) as a duplicate", async () => {
    const { shipments, onOrderPaid } = setup();
    expect(await onOrderPaid(orderPaid("m1"))).toBe("processed");
    expect(await onOrderPaid(orderPaid("m1-retry"))).toBe("duplicate");
    expect(shipments.count("ord_1")).toBe(1);
  });

  it("still remembers a handled event once CLAIM_TTL_MS has passed", async () => {
    const { shipments, onOrderPaid } = setup();
    expect(await onOrderPaid(orderPaid("m1"))).toBe("processed");
    clock.advance(CLAIM_TTL_MS + 1); // a retry with backoff, or a replay, arrives much later
    expect(await onOrderPaid(orderPaid("m1-retry"))).toBe("duplicate");
    expect(shipments.count("ord_1")).toBe(1);
  });

  it("books one shipment when two deliveries of an event arrive at the same time", async () => {
    const { shipments, onOrderPaid } = setup();
    await Promise.all([onOrderPaid(orderPaid("m1")), onOrderPaid(orderPaid("m1"))]);
    expect(shipments.count("ord_1")).toBe(1);
  });

  it("lets the redelivery of a failed attempt do the work", async () => {
    const { shipments, onOrderPaid } = setup();
    shipments.failNext();
    let failed = false;
    try {
      await onOrderPaid(orderPaid("m1"));
    } catch {
      failed = true;
    }
    expect(failed).toBe(true); // the error reaches the broker, which redelivers

    expect(await onOrderPaid(orderPaid("m1"))).toBe("processed");
    expect(shipments.count("ord_1")).toBe(1);
  });

  it("lets a redelivery take over after CLAIM_TTL_MS when a worker died mid-delivery", async () => {
    const { shipments, onOrderPaid } = setup();
    shipments.hangNext();
    void onOrderPaid(orderPaid("m1")); // this worker never finishes
    await until(() => shipments.started === 1);

    clock.advance(CLAIM_TTL_MS + 1);
    expect(await onOrderPaid(orderPaid("m1"))).toBe("processed");
    expect(shipments.count("ord_1")).toBe(1);
  });

  it("sends a duplicate that arrives mid-delivery back for redelivery, and acks it once done", async () => {
    const { shipments, onOrderPaid } = setup();
    const finishBooking = shipments.holdNext(); // the courier API answers when the test says so
    const first = onOrderPaid(orderPaid("m1"));
    await until(() => shipments.started === 1); // the first delivery is booking the courier

    expect(await onOrderPaid(orderPaid("m1"))).toBe("retry-later");
    finishBooking();
    expect(await first).toBe("processed");
    expect(await onOrderPaid(orderPaid("m1"))).toBe("duplicate");
    expect(shipments.count("ord_1")).toBe(1);
  });
});
