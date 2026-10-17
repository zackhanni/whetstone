import { parseSignatureHeader, verifyHmacSha256Hex, type WebhookEvent } from "./signature";

export type Delivery = {
  headers: Record<string, string | undefined>; // lowercase names
  rawBody: string; // the exact bytes received, before any JSON parsing
};

export type HandlerDeps = {
  secret: string;
  nowSeconds: number;
  toleranceSeconds: number;
  /** Event ids whose side effect has been applied. Survives across deliveries. */
  processed: Set<string>;
  /** The side effect — e.g. mark the order paid. May throw. */
  apply: (event: WebhookEvent) => Promise<void>;
};

export async function handleWebhook(delivery: Delivery, deps: HandlerDeps): Promise<number> {
  const parsed = parseSignatureHeader(delivery.headers["webhook-signature"]);
  if (!parsed) return 400;

  // 1. Verify the bytes that were signed — "<t>.<raw body>" — before trusting anything in them.
  // JSON.stringify(JSON.parse(raw)) drops the whitespace, so its bytes differ from what was signed.
  const signedPayload = `${parsed.timestamp}.${delivery.rawBody}`;
  let valid = false;
  for (const signature of parsed.signatures) {
    // Any v1 may match: during a secret rotation the provider signs with each active secret.
    if (await verifyHmacSha256Hex(deps.secret, signedPayload, signature)) valid = true;
  }
  if (!valid) return 400;

  // 2. Replay window. The timestamp is inside the signature, so it can't be altered — an old
  // capture re-sent today is simply too old.
  if (deps.nowSeconds - parsed.timestamp > deps.toleranceSeconds) return 400;

  let event: WebhookEvent;
  try {
    event = JSON.parse(delivery.rawBody);
  } catch {
    return 400;
  }

  // 3. Dedupe on the event id: the one thing that's the same on every delivery of an event. Every
  // retry carries a fresh timestamp and therefore a fresh signature. (Safe as a has-then-add only
  // because deliveries arrive one at a time; concurrent workers need a unique insert instead.)
  if (deps.processed.has(event.id)) return 200; // already applied: acknowledge so retries stop

  // 4. Record only after the work succeeded. Recording first would turn a failed attempt into a
  // permanently skipped event: the retry would find the id and do nothing.
  try {
    await deps.apply(event);
  } catch {
    return 500; // not recorded, so the provider's retry gets another chance
  }
  deps.processed.add(event.id);
  return 200;
}
