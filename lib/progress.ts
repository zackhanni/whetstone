// Per-unit learning progress, persisted in the browser (localStorage) as ONE versioned blob
// under a single key. Loaded once by ProgressProvider and shared via context — so the dashboard
// does a single read/parse instead of one per component. Local-first for now; designed to
// migrate to per-user Supabase storage later by swapping the loader/writer, keeping ProgressMap.

export type UnitProgress = {
  visited: boolean;
  answered: number;
  total: number;
  completed: boolean;
  at: number; // last-activity timestamp, for "continue where you left off"
};

export type ProgressMap = Record<string, UnitProgress>;

const KEY = "whetstone:progress";
// Bump when the *meaning* of stored data changes structurally; add a case in `readMap`.
// This versioned-blob + readMap() migration is what Zustand's persist({ version, migrate })
// would formalize once we outgrow Context — see docs/zustand-migration.md.
const VERSION = 1;

type Stored = { v: number; units: ProgressMap };

function isValidProgress(v: unknown): v is UnitProgress {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.visited === "boolean" &&
    typeof p.completed === "boolean" &&
    typeof p.answered === "number" &&
    Number.isFinite(p.answered) &&
    typeof p.total === "number" &&
    Number.isFinite(p.total) &&
    typeof p.at === "number" &&
    Number.isFinite(p.at)
  );
}

/** Clamp to a non-negative integer; malformed values fall back to 0. */
const clampCount = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** Keep only well-formed entries from a parsed map — defends against corrupt/legacy data. */
function sanitizeMap(parsed: unknown): ProgressMap {
  if (typeof parsed !== "object" || parsed === null) return {};
  const out: ProgressMap = {};
  for (const [id, v] of Object.entries(parsed)) {
    if (isValidProgress(v)) out[id] = v;
  }
  return out;
}

function persist(units: ProgressMap): void {
  const payload: Stored = { v: VERSION, units };
  window.localStorage.setItem(KEY, JSON.stringify(payload));
}

/** One-time upgrade: fold any legacy per-unit keys (`whetstone:progress:<id>`) into the blob. */
function migrateLegacy(): ProgressMap {
  const prefix = `${KEY}:`; // trailing ":" — never matches the blob key itself
  const out: ProgressMap = {};
  const legacyKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    legacyKeys.push(k);
    const raw = window.localStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isValidProgress(parsed)) out[k.slice(prefix.length)] = parsed;
    } catch {
      // One corrupt legacy entry must not abort migrating (or cleaning up) the rest — it's
      // still in legacyKeys, so it gets removed below and won't re-trigger on the next load.
    }
  }
  if (legacyKeys.length) {
    persist(out);
    for (const k of legacyKeys) window.localStorage.removeItem(k);
  }
  return out;
}

/** Parse whatever is under KEY into a ProgressMap, tolerating versioned + pre-version shapes. */
function readMap(): ProgressMap {
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return migrateLegacy();
  const parsed: unknown = JSON.parse(raw);
  // Current shape: { v, units }. sanitizeMap drops anything that doesn't match UnitProgress,
  // so a newer/unknown version's extra data degrades gracefully instead of corrupting.
  if (parsed && typeof parsed === "object" && "units" in parsed) {
    return sanitizeMap((parsed as { units: unknown }).units);
  }
  // Pre-version bare map (earlier build) — accept it; the next write re-wraps it with `v`.
  return sanitizeMap(parsed);
}

/** Read the whole progress map at once (one localStorage entry, one parse). Client-only. */
export function loadAllProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    return readMap();
  } catch {
    return {};
  }
}

/** Merge one unit's engagement, staying valid even if the unit's question count changed. */
export function nextEntry(
  prev: UnitProgress | undefined,
  answered: number,
  total: number,
  now: number,
): UnitProgress {
  // Always the unit's CURRENT question count, even 0: falling back to the stored total would
  // leave a unit that became cards-only stuck incomplete. (The only caller, UnitView, always
  // passes the real count.)
  const effTotal = clampCount(total);
  // High-water mark so refreshing mid-drill doesn't lose progress — but never above the
  // *current* total, so removing questions can't leave a stale >100% / falsely-complete entry.
  const bestAnswered = Math.min(effTotal, Math.max(prev?.answered ?? 0, clampCount(answered)));
  return {
    visited: true,
    answered: bestAnswered,
    total: effTotal,
    // Recompute against the current total (not sticky): adding questions correctly reverts a
    // unit to in-progress; removing them can complete it. Never latched to stale content.
    // A unit with no questions (only cards) has nothing to answer, so visiting completes it —
    // otherwise its track could never reach 100% and "Continue" would point at it forever.
    completed: effTotal > 0 ? bestAnswered >= effTotal : true,
    at: now,
  };
}

/**
 * Record engagement with a unit and persist the whole map. Reads localStorage as the source of
 * truth (not an in-memory copy) so it can't clobber other units if effects fire before the
 * provider has hydrated. Returns the updated map for the provider to hold. Client-only.
 */
export function recordProgress(id: string, answered: number, total: number): ProgressMap {
  if (typeof window === "undefined") return {};
  const prev = loadAllProgress();
  const next: ProgressMap = { ...prev, [id]: nextEntry(prev[id], answered, total, Date.now()) };
  try {
    persist(next);
  } catch {
    // ignore quota / private-mode write failures
  }
  return next;
}
