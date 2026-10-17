/**
 * Signature plumbing on Web Crypto (every browser; global in Node 19+). The provider sends
 *
 *   webhook-signature: t=<unix seconds>,v1=<hex HMAC-SHA-256 of "<t>.<raw body>">
 *
 * (the same shape Stripe uses). These helpers parse the header and check one HMAC; deciding what
 * to accept is webhook-handler.ts's job.
 *
 * Read-only support file.
 */
const encoder = new TextEncoder();

export type WebhookEvent = { id: string; type: string; data: Record<string, unknown> };

/** Splits "t=…,v1=…[,v1=…]" into the timestamp and every v1 signature; null if malformed. */
export function parseSignatureHeader(header: string | undefined): { timestamp: number; signatures: string[] } | null {
  if (!header) return null;
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=");
    if (key === "t" && /^\d+$/.test(value ?? "")) timestamp = Number(value);
    if (key === "v1" && value) signatures.push(value);
  }
  return timestamp === null || signatures.length === 0 ? null : { timestamp, signatures };
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function hexToBytes(hex: string) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  return Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16));
}

/**
 * True when `signatureHex` is the HMAC-SHA-256 of `message` under `secret`. crypto.subtle.verify
 * does the comparison, so there's no hand-written `===` on secrets to leak timing.
 */
export async function verifyHmacSha256Hex(secret: string, message: string, signatureHex: string): Promise<boolean> {
  const bytes = hexToBytes(signatureHex);
  if (!bytes) return false;
  return crypto.subtle.verify("HMAC", await hmacKey(secret), bytes, encoder.encode(message));
}

/** What the provider does: sign "<t>.<raw body>" and build the header. Used by the tests and the preview. */
export async function signDelivery(secret: string, rawBody: string, timestamp: number): Promise<string> {
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(`${timestamp}.${rawBody}`)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}
