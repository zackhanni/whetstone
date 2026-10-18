// Per-unit drill results, persisted in the browser (localStorage). Solo progress tracking
// until Phase 2 adds real per-user storage.

export type DrillAttempt = {
  score: number;
  total: number;
  timeSec: number;
  at: number; // Date.now() when the drill finished
};

// `id` is the unit's "track/unit" id, so the stored key is `whetstone:drill:<track>/<unit>`.
const storageKey = (id: string) => `whetstone:drill:${id}`;
const MAX_ATTEMPTS = 10;

function isValidAttempt(v: unknown): v is DrillAttempt {
  if (typeof v !== "object" || v === null) return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.score === "number" &&
    Number.isFinite(a.score) &&
    typeof a.total === "number" &&
    Number.isFinite(a.total) &&
    typeof a.timeSec === "number" &&
    Number.isFinite(a.timeSec) &&
    typeof a.at === "number" &&
    Number.isFinite(a.at)
  );
}

export function loadAttempts(id: string): DrillAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Defend against corrupted/legacy values: bestOf/slice assume a well-formed array.
    return Array.isArray(parsed) ? parsed.filter(isValidAttempt) : [];
  } catch {
    return [];
  }
}

/** Prepend an attempt (newest first), cap the history, persist, and return the new list. */
export function saveAttempt(id: string, attempt: DrillAttempt): DrillAttempt[] {
  const all = [attempt, ...loadAttempts(id)].slice(0, MAX_ATTEMPTS);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey(id), JSON.stringify(all));
    } catch {
      // ignore quota / private-mode write failures
    }
  }
  return all;
}

/** Whether `a` beats `b`: a higher score, or the same score in less time. */
export function isBetterAttempt(a: DrillAttempt, b: DrillAttempt): boolean {
  return a.score > b.score || (a.score === b.score && a.timeSec < b.timeSec);
}

/** Best = highest score, ties broken by fastest time. */
export function bestOf(attempts: DrillAttempt[]): DrillAttempt | null {
  if (attempts.length === 0) return null;
  return attempts.reduce((best, a) => (isBetterAttempt(a, best) ? a : best));
}
