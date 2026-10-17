type AnyFn = (...args: any[]) => void;

export interface Debounced<F extends AnyFn> {
  (this: ThisParameterType<F>, ...args: Parameters<F>): void;
  cancel(): void;
  flush(): void;
}

export interface Throttled<F extends AnyFn> {
  (this: ThisParameterType<F>, ...args: Parameters<F>): void;
  cancel(): void;
}

/*
 * Both utilities "work" in a quick manual test. Six bugs, in the order worth fixing them
 * (each has its own failing test):
 *   1. debounce loses `this`: the wrapper must be able to receive the caller's `this` and
 *      pass it on to fn.
 *   2. debounced.cancel() forgets the handle but the pending run still fires.
 *   3. debounced.flush() runs fn, then the pending timer runs it again.
 *   4. After a run has fired, debounced.flush() runs fn again. "Is a run pending?" must become
 *      false when the timer fires.
 *   5. throttle's trailing run uses the arguments of the call that started the timer, not the
 *      latest call's.
 *   6. throttle has no cancel() for dropping a pending trailing run.
 */

/** Runs `fn` once, `wait` ms after the last call, with the last call's `this` and arguments. */
export function debounce<F extends AnyFn>(fn: F, wait: number): Debounced<F> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<F> | undefined;

  const debounced = ((...args: Parameters<F>): void => {
    lastArgs = args;
    clearTimeout(timer);
    timer = setTimeout(() => fn(...(lastArgs as Parameters<F>)), wait);
  }) as Debounced<F>;

  debounced.cancel = () => {
    timer = undefined;
  };

  debounced.flush = () => {
    if (timer !== undefined) fn(...(lastArgs as Parameters<F>));
  };

  return debounced;
}

/**
 * Runs the first call immediately, then at most once per `wait` ms. Calls that arrive while the
 * window is closed collapse into one trailing run with the latest `this` and arguments.
 */
export function throttle<F extends AnyFn>(fn: F, wait: number): Throttled<F> {
  let lastRun = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const throttled = function (this: ThisParameterType<F>, ...args: Parameters<F>): void {
    const remaining = wait - (Date.now() - lastRun);
    if (remaining <= 0 && timer === undefined) {
      lastRun = Date.now();
      fn.apply(this, args);
    } else if (timer === undefined) {
      timer = setTimeout(() => {
        lastRun = Date.now();
        timer = undefined;
        fn.apply(this, args);
      }, Math.max(remaining, 0));
    }
  } as Throttled<F>;

  return throttled;
}
