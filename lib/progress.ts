// Per-unit learning progress, persisted in the browser (localStorage). Local-first for now;
// designed to migrate to per-user Supabase storage later without changing the UI.

export type UnitProgress = {
  visited: boolean;
  answered: number;
  total: number;
  completed: boolean;
  at: number; // last-activity timestamp, for "continue where you left off"
};

const key = (id: string) => `whetstone:progress:${id}`;

export function loadProgress(id: string): UnitProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(id));
    return raw ? (JSON.parse(raw) as UnitProgress) : null;
  } catch {
    return null;
  }
}

/**
 * Record engagement with a unit: marks it visited, keeps the high-water mark of answered
 * items, and flips `completed` once every assessment item has been answered. Client-only.
 */
export function recordProgress(id: string, answered: number, total: number): void {
  if (typeof window === "undefined") return;
  const prev = loadProgress(id);
  const bestAnswered = Math.max(prev?.answered ?? 0, answered);
  const effTotal = total || prev?.total || 0;
  const next: UnitProgress = {
    visited: true,
    answered: bestAnswered,
    total: effTotal,
    completed: (prev?.completed ?? false) || (effTotal > 0 && bestAnswered >= effTotal),
    at: Date.now(),
  };
  try {
    window.localStorage.setItem(key(id), JSON.stringify(next));
  } catch {
    // ignore quota / private-mode write failures
  }
}
