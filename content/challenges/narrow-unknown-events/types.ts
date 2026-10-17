/** Read-only support file: the events the webhook can deliver, and what parseEvent returns. */
export type AppEvent =
  | { kind: "signup"; userId: string; email: string }
  | { kind: "payment"; userId: string; amountCents: number }
  | { kind: "cancel"; userId: string; reason?: string };

export type ParseResult = { ok: true; event: AppEvent } | { ok: false; error: string };
