/**
 * A settable clock, so the grader can step past a TTL without waiting for it. The fake inbox reads
 * the time from here instead of Date.now(). (Read-only support file.)
 */
let current = 0;

export const clock = {
  now: (): number => current,
  advance(ms: number): void {
    current += ms;
  },
  reset(): void {
    current = 0;
  },
};
