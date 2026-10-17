import { useEffect, useState } from "react";
import { createOrderPaidHandler } from "./order-paid-handler";
import { FakeInbox } from "./inbox";
import { FakeShipments } from "./shipments";

/** Delivers order.paid the way an at-least-once broker does, and counts the parcels booked. */
export default function App() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const inbox = new FakeInbox();
      const shipments = new FakeShipments();
      const onOrderPaid = createOrderPaidHandler({ inbox, shipments });
      const payload = { eventId: "order-paid:ord_1", orderId: "ord_1" };
      const out: string[] = [];

      out.push(`first delivery -> ${await onOrderPaid({ messageId: "m1", payload })}`);
      out.push(`publisher retry, new messageId -> ${await onOrderPaid({ messageId: "m2", payload })}`);
      const both = await Promise.all([
        onOrderPaid({ messageId: "m3", payload: { eventId: "order-paid:ord_2", orderId: "ord_2" } }),
        onOrderPaid({ messageId: "m3", payload: { eventId: "order-paid:ord_2", orderId: "ord_2" } }),
      ]);
      out.push(`two concurrent deliveries of ord_2 -> ${both.join(", ")}`);
      out.push(`parcels booked: ord_1 x${shipments.count("ord_1")}, ord_2 x${shipments.count("ord_2")}`);
      if (!cancelled) setLines(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>order.paid consumer</h3>
      {lines.length === 0 ? <div>running…</div> : lines.map((line) => <div key={line}>{line}</div>)}
    </div>
  );
}
