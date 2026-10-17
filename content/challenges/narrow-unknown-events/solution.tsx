import type { AppEvent, ParseResult } from "./types";

/** typeof null is "object", so rule null out explicitly (and arrays, which are objects too). */
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * A type guard is a promise TypeScript doesn't check. Prove the claim: the key exists AND it
 * holds a number.
 */
function hasAmount(
  x: Record<string, unknown>,
): x is Record<string, unknown> & { amountCents: number } {
  return typeof x.amountCents === "number";
}

export function parseEvent(raw: unknown): ParseResult {
  if (!isRecord(raw)) return { ok: false, error: "body must be an object" };
  const { kind, userId } = raw;
  if (typeof userId !== "string") return { ok: false, error: "userId must be a string" };

  switch (kind) {
    case "signup": {
      const { email } = raw;
      if (typeof email !== "string") return { ok: false, error: "email must be a string" };
      return { ok: true, event: { kind, userId, email } };
    }
    case "payment": {
      if (!hasAmount(raw)) return { ok: false, error: "amountCents must be a number" };
      return { ok: true, event: { kind, userId, amountCents: raw.amountCents } };
    }
    case "cancel": {
      const { reason } = raw;
      if (reason !== undefined && typeof reason !== "string") {
        return { ok: false, error: "reason must be a string" };
      }
      return { ok: true, event: { kind, userId, reason } };
    }
    default:
      // Data from outside can carry any kind. Reject what you don't know instead of casting it.
      return { ok: false, error: `unknown kind: ${String(kind)}` };
  }
}

/** One line for the activity feed. */
export function feedLine(event: AppEvent): string {
  switch (event.kind) {
    case "signup":
      return `${event.email} signed up`;
    case "payment":
      return `${event.userId} paid $${(event.amountCents / 100).toFixed(2)}`;
    case "cancel":
      return event.reason ? `${event.userId} cancelled: ${event.reason}` : `${event.userId} cancelled`;
    default: {
      // Compile-time: adding a kind to AppEvent makes this line an error until it's handled.
      // Runtime: types are erased, so still fail loudly if one slips through.
      const unhandled: never = event;
      throw new Error(`Unhandled event: ${JSON.stringify(unhandled)}`);
    }
  }
}
