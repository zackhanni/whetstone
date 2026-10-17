import type { AppEvent, ParseResult } from "./types";

/**
 * Turns an untrusted webhook body into a typed AppEvent, and writes the activity-feed line for
 * one. It all compiles. Four bugs, in the order worth fixing them:
 *   1. isRecord lets `null` through, so a `null` body crashes parseEvent instead of being rejected.
 *   2. hasAmount checks that the key exists, not that it holds a number — and TypeScript trusts a
 *      type guard's claim without checking it.
 *   3. parseEvent's `default` casts an unknown `kind` into an AppEvent instead of rejecting it.
 *   4. feedLine's `default` hides the missing "cancel" case; it should fail the build instead (and
 *      fail loudly at runtime for a kind that slips past the types).
 */

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object";
}

function hasAmount(
  x: Record<string, unknown>,
): x is Record<string, unknown> & { amountCents: number } {
  return "amountCents" in x;
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
      return { ok: true, event: raw as AppEvent };
  }
}

/** One line for the activity feed. */
export function feedLine(event: AppEvent): string {
  switch (event.kind) {
    case "signup":
      return `${event.email} signed up`;
    case "payment":
      return `${event.userId} paid $${(event.amountCents / 100).toFixed(2)}`;
    default:
      return "Unknown event";
  }
}
