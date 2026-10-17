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

/** Runs `fn` once, `wait` ms after the last call, with the last call's `this` and arguments. */
export function debounce<F extends AnyFn>(fn: F, wait: number): Debounced<F> {
  // Set while a run is pending, and only then: flush() relies on that.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<F> | undefined;
  let lastThis: ThisParameterType<F> | undefined;

  function invoke(): void {
    const args = lastArgs as Parameters<F>;
    const thisArg = lastThis;
    timer = lastArgs = lastThis = undefined; // nothing is pending any more
    fn.apply(thisArg, args);
  }

  // A `function`, not an arrow: it has to receive the caller's `this` to pass it on.
  const debounced = function (this: ThisParameterType<F>, ...args: Parameters<F>): void {
    lastArgs = args; // overwritten on every call, so the run sees the latest
    lastThis = this;
    clearTimeout(timer);
    timer = setTimeout(invoke, wait);
  } as Debounced<F>;

  debounced.cancel = () => {
    clearTimeout(timer); // forgetting the handle isn't enough: the timer must be cleared
    timer = lastArgs = lastThis = undefined;
  };

  debounced.flush = () => {
    if (timer === undefined) return; // nothing pending
    clearTimeout(timer); // or the timer fires again later: two runs for one burst
    invoke();
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
  let pendingArgs: Parameters<F> | undefined;
  let pendingThis: ThisParameterType<F> | undefined;

  function run(thisArg: ThisParameterType<F> | undefined, args: Parameters<F>): void {
    lastRun = Date.now(); // trailing runs restart the window too
    fn.apply(thisArg, args);
  }

  const throttled = function (this: ThisParameterType<F>, ...args: Parameters<F>): void {
    const remaining = wait - (Date.now() - lastRun);
    if (remaining <= 0 && timer === undefined) {
      run(this, args); // window open: leading run
      return;
    }
    // Window closed: remember only the latest call. The timer reads these when it fires,
    // rather than closing over the arguments of whichever call happened to create it.
    pendingArgs = args;
    pendingThis = this;
    if (timer === undefined) {
      timer = setTimeout(() => {
        const args = pendingArgs as Parameters<F>;
        const thisArg = pendingThis;
        timer = pendingArgs = pendingThis = undefined;
        run(thisArg, args);
      }, Math.max(remaining, 0));
    }
  } as Throttled<F>;

  throttled.cancel = () => {
    clearTimeout(timer);
    timer = pendingArgs = pendingThis = undefined;
  };

  return throttled;
}
