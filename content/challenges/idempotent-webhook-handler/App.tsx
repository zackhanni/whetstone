import { useEffect, useState } from "react";
import { handleWebhook, type HandlerDeps } from "./webhook-handler";
import { signDelivery, type WebhookEvent } from "./signature";

const SECRET = "whsec_preview";
const NOW = 1792219294;

async function run(): Promise<string[]> {
  const log: string[] = [];
  let failNext = false;
  const deps: HandlerDeps = {
    secret: SECRET,
    nowSeconds: NOW,
    toleranceSeconds: 300,
    processed: new Set(),
    apply: async (event: WebhookEvent) => {
      if (failNext) {
        failNext = false;
        throw new Error("database unavailable");
      }
      log.push(`   → order ${String(event.data.orderId)} marked paid (event ${event.id})`);
    },
  };
  const send = async (label: string, rawBody: string, t: number) => {
    const status = await handleWebhook({ headers: { "webhook-signature": await signDelivery(SECRET, rawBody, t) }, rawBody }, deps);
    log.push(`${label}: ${status}`);
  };
  const body = (id: string, orderId: string) => JSON.stringify({ id, type: "payment.succeeded", data: { orderId } });

  await send("evt_1, first delivery", body("evt_1", "ord_1"), NOW - 30);
  await send("evt_1, provider retry", body("evt_1", "ord_1"), NOW);
  await send("evt_2, pretty-printed", JSON.stringify({ id: "evt_2", type: "payment.succeeded", data: { orderId: "ord_2" } }, null, 2), NOW);
  await send("evt_3, replayed from two weeks ago", body("evt_3", "ord_3"), NOW - 14 * 86400);
  failNext = true;
  await send("evt_4, database down", body("evt_4", "ord_4"), NOW - 10);
  await send("evt_4, our queue re-runs the stored request", body("evt_4", "ord_4"), NOW - 10);
  return log;
}

export default function App() {
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    run().then((lines) => {
      if (!cancelled) setLog(lines);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>POST /webhooks/payments — deliveries and side effects</h3>
      {log.length === 0 && <div>running…</div>}
      {log.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
