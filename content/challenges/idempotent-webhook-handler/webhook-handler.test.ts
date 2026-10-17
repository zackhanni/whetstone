import { handleWebhook, type HandlerDeps } from "./webhook-handler";
import { signDelivery, type WebhookEvent } from "./signature";

const SECRET = "whsec_test";
const NOW = 1792219294; // seconds

/** A compact body: re-serialising it gives the same bytes. */
const compact = (id: string) => JSON.stringify({ id, type: "payment.succeeded", data: { orderId: "ord_42" } });

function setup(failFirst = 0) {
  const applied: WebhookEvent[] = [];
  let failuresLeft = failFirst;
  const deps: HandlerDeps = {
    secret: SECRET,
    nowSeconds: NOW,
    toleranceSeconds: 300,
    processed: new Set(),
    apply: async (event) => {
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw new Error("database unavailable");
      }
      applied.push(event);
    },
  };
  return { deps, applied };
}

async function deliver(deps: HandlerDeps, rawBody: string, timestamp = NOW, secret = SECRET) {
  const signature = await signDelivery(secret, rawBody, timestamp);
  return handleWebhook({ headers: { "webhook-signature": signature }, rawBody }, deps);
}

describe("handleWebhook", () => {
  it("applies a correctly signed delivery once and answers 200", async () => {
    const { deps, applied } = setup();
    const status = await deliver(deps, compact("evt_1"));
    expect(status).toBe(200);
    expect(applied.length).toBe(1);
    expect(applied[0].id).toBe("evt_1");
  });

  it("verifies the raw bytes, so a pretty-printed body is accepted", async () => {
    const { deps, applied } = setup();
    const pretty = JSON.stringify({ id: "evt_2", type: "payment.succeeded", data: { orderId: "ord_42" } }, null, 2);
    const status = await deliver(deps, pretty);
    expect(status).toBe(200);
    expect(applied.length).toBe(1);
  });

  it("rejects a forged or tampered delivery with 400 and applies nothing", async () => {
    const { deps, applied } = setup();
    const forged = await deliver(deps, compact("evt_3"), NOW, "not-the-secret");
    const signature = await signDelivery(SECRET, compact("evt_3"), NOW);
    const tampered = await handleWebhook(
      { headers: { "webhook-signature": signature }, rawBody: compact("evt_3").replace("ord_42", "ord_99") },
      deps,
    );
    const unsigned = await handleWebhook({ headers: {}, rawBody: compact("evt_3") }, deps);
    expect(`${forged} ${tampered} ${unsigned}`).toBe("400 400 400");
    expect(applied.length).toBe(0);
  });

  it("rejects a validly signed delivery older than the tolerance", async () => {
    const { deps, applied } = setup();
    const status = await deliver(deps, compact("evt_4"), NOW - 600);
    expect(status).toBe(400);
    expect(applied.length).toBe(0);
  });

  it("applies a retried event once — new timestamp and signature, same event id", async () => {
    const { deps, applied } = setup();
    const first = await deliver(deps, compact("evt_5"), NOW - 60);
    const retry = await deliver(deps, compact("evt_5"), NOW);
    expect(`${first} ${retry}`).toBe("200 200");
    expect(applied.length).toBe(1);
  });

  it("answers 500 when the work fails, and applies it when the same delivery is re-run", async () => {
    const { deps, applied } = setup(1);
    const rawBody = compact("evt_6");
    const signature = await signDelivery(SECRET, rawBody, NOW);
    const delivery = { headers: { "webhook-signature": signature }, rawBody };
    const first = await handleWebhook(delivery, deps);
    const again = await handleWebhook(delivery, deps);
    expect(`${first} ${again}`).toBe("500 200");
    expect(applied.length).toBe(1);
  });
});
