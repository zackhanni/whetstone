import type { FieldRule, Schema, ValidationResult } from "./order-dto";

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

/**
 * transform: query strings and form bodies carry everything as text, so a field declared
 * `int`/`boolean` is coerced before it's validated. An unconvertible string is left alone so
 * checkRule reports the type error instead of silently producing NaN.
 */
function coerce(value: unknown, rule: FieldRule): unknown {
  if (typeof value !== "string") return value;
  if (rule.type === "int" && /^-?\d+$/.test(value.trim())) return Number(value);
  if (rule.type === "boolean" && (value === "true" || value === "false")) return value === "true";
  return value;
}

export function validateBody<T>(schema: Schema, raw: Record<string, unknown>): ValidationResult<T> {
  const value: Record<string, unknown> = {};
  const errors: string[] = [];

  // Iterate the SCHEMA, not the body: that's what makes whitelisting and required-field
  // checks fall out for free — a key the client sent but the DTO doesn't declare is never read.
  for (const [key, rule] of Object.entries(schema)) {
    const incoming = coerce(raw[key], rule);

    if (incoming === undefined) {
      if (!rule.optional) errors.push(`${key} is required`);
      continue;
    }

    const problem = checkRule(key, incoming, rule);
    if (problem) {
      errors.push(problem);
      continue; // keep going: the client should get every failure in one response
    }

    value[key] = incoming;
  }

  if (errors.length > 0) return { ok: false, status: 400, errors };
  return { ok: true, value: value as T };
}
