import type { FieldRule, Schema, ValidationResult } from "./order-dto";

/**
 * A hand-rolled ValidationPipe. Four bugs, in the order worth fixing them:
 *   1. whitelist — the value is a copy of the raw body, so unknown keys reach the handler.
 *   2. transform — a declared `int`/`boolean` arriving as a string is rejected instead of coerced.
 *   3. every failure — it returns on the first problem, so clients fix one field per round-trip.
 *   4. required fields — it only looks at keys the client sent, so a missing one is never checked.
 */

/** Checks one already-coerced value against its rule. Returns a message, or null when valid. */
function checkRule(key: string, value: unknown, rule: FieldRule): string | null {
  if (rule.type === "string") {
    if (typeof value !== "string") return `${key} must be a string`;
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return `${key} must be at most ${rule.maxLength} characters`;
    }
    return null;
  }

  if (rule.type === "int") {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      return `${key} must be an integer`;
    }
    if (rule.min !== undefined && value < rule.min) return `${key} must be at least ${rule.min}`;
    if (rule.max !== undefined && value > rule.max) return `${key} must be at most ${rule.max}`;
    return null;
  }

  if (typeof value !== "boolean") return `${key} must be a boolean`;
  return null;
}

export function validateBody<T>(schema: Schema, raw: Record<string, unknown>): ValidationResult<T> {
  const value: Record<string, unknown> = { ...raw };

  for (const key of Object.keys(raw)) {
    const rule = schema[key];
    if (!rule) continue;

    const problem = checkRule(key, value[key], rule);
    if (problem) return { ok: false, status: 400, errors: [problem] };
  }

  return { ok: true, value: value as T };
}
