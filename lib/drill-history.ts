// Per-unit drill results, persisted in the browser (localStorage). Solo progress tracking
// until Phase 2 adds real per-user storage.

export type DrillAttempt = { score: number; total: number; timeSec: number; at: number };

const key = (id: string) => `whetstone:drill:${id}`;
const MAX = 10;

export function loadAttempts(id: string): DrillAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(id));
    return raw ? (JSON.parse(raw) as DrillAttempt[]) : [];
  } catch {
    return [];
  }
}

/** Prepend an attempt (newest first), cap the history, persist, and return the new list. */
export function saveAttempt(id: string, attempt: DrillAttempt): DrillAttempt[] {
  const all = [attempt, ...loadAttempts(id)].slice(0, MAX);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(key(id), JSON.stringify(all));
    } catch {
      // ignore quota / private-mode write failures
    }
  }
  return all;
}

/** Best = highest score, ties broken by fastest time. */
export function bestOf(attempts: DrillAttempt[]): DrillAttempt | null {
  if (attempts.length === 0) return null;
  return attempts.reduce((best, a) =>
    a.score > best.score || (a.score === best.score && a.timeSec < best.timeSec) ? a : best,
  );
}
