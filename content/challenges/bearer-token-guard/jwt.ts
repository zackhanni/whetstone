/**
 * Byte-level JWT helpers on Web Crypto (in every browser, and global in Node 19+). They encode,
 * decode and check an HMAC — they make no decisions. Deciding what to trust is authenticate.ts.
 *
 * Read-only support file.
 */
const encoder = new TextEncoder();

export function base64urlToBytes(segment: string) {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/"); // atob accepts missing padding
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decodes a header or payload segment to its JSON value, or null if it isn't base64url JSON. */
export function decodeSegment(segment: string): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(base64urlToBytes(segment)));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

/** True when `signature` (base64url) is the HMAC-SHA-256 of `signingInput` under `secret`. */
export async function verifyHs256(signingInput: string, signature: string, secret: string): Promise<boolean> {
  let bytes;
  try {
    bytes = base64urlToBytes(signature);
  } catch {
    return false;
  }
  return crypto.subtle.verify("HMAC", await hmacKey(secret), bytes, encoder.encode(signingInput));
}

/** Builds a compact JWS — used by the tests and the preview to mint tokens. */
export async function makeToken(header: object, payload: object, secret: string): Promise<string> {
  const h = bytesToBase64url(encoder.encode(JSON.stringify(header)));
  const p = bytesToBase64url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(`${h}.${p}`)));
  return `${h}.${p}.${bytesToBase64url(sig)}`;
}
