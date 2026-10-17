export type PollOptions = {
  /** Wait this long after a poll FINISHES before starting the next one. */
  intervalMs: number;
  /** Called with whatever a failed poll threw or rejected with. Polling continues. */
  onError: (error: unknown) => void;
};

/**
 * Runs `task` now, then again `intervalMs` after each run finishes, until `stop()` is called.
 *
 * It doesn't. Fix it in this order (steps 1-3 each have a failing test; step 4 has two tests
 * that pass now and that a naive rewrite breaks):
 *   1. setInterval fires on a fixed beat, so a slow task overlaps the next one. Replace it with
 *      a setTimeout that is scheduled only after the task has finished.
 *   2. Run the first poll immediately instead of waiting a whole interval.
 *   3. A failed poll must be reported AND the loop must carry on: schedule the next poll
 *      outside the try/catch, not inside it.
 *   4. Make stop() work in both states the loop can be in: waiting (a timer is pending) and
 *      working (the task is in flight, so there is no timer to clear yet).
 */
export function startPolling(task: () => Promise<void>, { intervalMs, onError }: PollOptions): () => void {
  const id = setInterval(async () => {
    try {
      await task();
    } catch (error) {
      onError(error);
      clearInterval(id); // "stop hammering a broken server"
    }
  }, intervalMs);

  return () => clearInterval(id);
}
