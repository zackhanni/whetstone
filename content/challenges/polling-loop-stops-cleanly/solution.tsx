export type PollOptions = {
  /** Wait this long after a poll FINISHES before starting the next one. */
  intervalMs: number;
  /** Called with whatever a failed poll threw or rejected with. Polling continues. */
  onError: (error: unknown) => void;
};

/**
 * Runs `task` now, then again `intervalMs` after each run finishes, until `stop()` is called.
 */
export function startPolling(task: () => Promise<void>, { intervalMs, onError }: PollOptions): () => void {
  let stopped = false;
  // The timer for the next poll. While a poll is in flight it still holds the timer that already
  // fired, which is harmless: clearTimeout on a fired timer does nothing.
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async (): Promise<void> => {
    try {
      await task();
    } catch (error) {
      onError(error); // report it; one failed poll must not end the loop
    }
    // stop() may have been called while `task` was in flight. There was no timer to clear
    // then, so this flag is the only thing that stops the loop from rescheduling itself.
    if (stopped) return;
    timer = setTimeout(tick, intervalMs); // schedule only after this poll has finished
  };

  void tick(); // first poll right away

  return () => {
    stopped = true;
    clearTimeout(timer); // cancels a poll that's waiting; a no-op if none is
  };
}
