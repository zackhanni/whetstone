import { DEFAULTS, type PlayerOptions, type ResolvedOptions } from "./types";

/**
 * Fills every option the user hasn't set with its default. One rule for every field: `??`, so
 * only null and undefined fall back — 0, "" and false are real answers.
 */
export function resolveOptions(saved: PlayerOptions): ResolvedOptions {
  return {
    volume: saved.volume ?? DEFAULTS.volume, // || would turn a muted 0 into 0.8
    startAt: saved.startAt ?? DEFAULTS.startAt, // a spread would copy an explicit undefined
    autoplay: saved.autoplay ?? DEFAULTS.autoplay, // ...and || would turn false into true
    label: saved.label ?? DEFAULTS.label, // a destructuring default skips null; ?? doesn't
    attempts: saved.retry?.attempts ?? DEFAULTS.attempts, // ?. checks at runtime; ! checked nothing
    delayMs: saved.retry?.delayMs ?? DEFAULTS.delayMs,
  };
}

/** Tells the host page the player is ready, if it asked to be told. */
export function signalReady(options: PlayerOptions): void {
  options.onReady?.();
}
