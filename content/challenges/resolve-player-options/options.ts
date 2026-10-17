import { DEFAULTS, type PlayerOptions, type ResolvedOptions } from "./types";

/**
 * Fills every option the user hasn't set with its default. Four bugs, in the order worth fixing:
 *   1. retry settings — a user who never opened "Retry" has no `retry` object, and the `!` only
 *      silenced the compiler.
 *   2. volume — a muted player (volume 0) comes back at 0.8.
 *   3. label — `null` from the API slips past the destructuring default (the `as` hid it).
 *   4. autoplay / startAt — a field present as `undefined` overwrites its default in the spread.
 * And signalReady crashes for a player with no onReady callback.
 */
export function resolveOptions(saved: PlayerOptions): ResolvedOptions {
  const merged = { ...DEFAULTS, ...saved };
  const { label = DEFAULTS.label } = saved;

  return {
    volume: saved.volume || DEFAULTS.volume,
    startAt: merged.startAt,
    autoplay: merged.autoplay,
    label: label as string,
    attempts: saved.retry!.attempts ?? DEFAULTS.attempts,
    delayMs: saved.retry!.delayMs ?? DEFAULTS.delayMs,
  };
}

/** Tells the host page the player is ready, if it asked to be told. */
export function signalReady(options: PlayerOptions): void {
  options.onReady!();
}
