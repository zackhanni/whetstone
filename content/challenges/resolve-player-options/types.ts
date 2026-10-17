/**
 * Read-only support file. PlayerOptions is what the app stores per user (localStorage + the API,
 * which sends null for "not set"). ResolvedOptions is what the player needs: every field filled.
 */
export type PlayerOptions = {
  volume?: number; // 0..1, and 0 means muted
  startAt?: number; // seconds; 0 means from the beginning
  autoplay?: boolean;
  label?: string | null; // "" means "no label" on purpose; null means "not set"
  retry?: { attempts?: number; delayMs?: number } | null;
  onReady?: () => void;
};

export type ResolvedOptions = {
  volume: number;
  startAt: number;
  autoplay: boolean;
  label: string;
  attempts: number;
  delayMs: number;
};

export const DEFAULTS: ResolvedOptions = {
  volume: 0.8,
  startAt: 0,
  autoplay: true,
  label: "Untitled",
  attempts: 3,
  delayMs: 500,
};
