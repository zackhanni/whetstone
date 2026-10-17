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

/**
 * Handles one webhook delivery and returns the HTTP status to answer with. Four bugs, in the
 * order worth fixing them:
 *   1. the signature is checked against a re-serialised body, not the bytes that were signed
 *   2. a validly signed delivery from long ago is accepted (no replay window)
 *   3. duplicates are recognised by their signature, which changes on every retry
 *   4. the event is recorded as processed before the work has succeeded
 */
export async function handleWebhook(delivery: Delivery, deps: HandlerDeps): Promise<number> {
  const header = delivery.headers["webhook-signature"];
  const parsed = parseSignatureHeader(header);
  if (!parsed) return 400;

  let event: WebhookEvent;
  try {
    event = JSON.parse(delivery.rawBody);
  } catch {
    return 400;
  }

  const signedPayload = `${parsed.timestamp}.${JSON.stringify(event)}`;
  let valid = false;
  for (const signature of parsed.signatures) {
    if (await verifyHmacSha256Hex(deps.secret, signedPayload, signature)) valid = true;
  }
  if (!valid) return 400;

  const dedupeKey = header ?? "";
  if (deps.processed.has(dedupeKey)) return 200;
  deps.processed.add(dedupeKey);

  try {
    await deps.apply(event);
  } catch {
    return 500;
  }
  return 200;
}
