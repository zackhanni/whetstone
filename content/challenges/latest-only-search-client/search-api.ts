const PEOPLE = ["Ann Lee", "Abby Chen", "Marco Diaz", "Priya Patel", "Sam Okafor", "Alice Moreau"];

export type SearchFn = (query: string, signal: AbortSignal) => Promise<string[]>;

/**
 * Default implementation: a fake backend with random latency (so responses come back out of
 * order) that honours the abort signal the way fetch does. (Provided; don't edit.)
 */
let impl: SearchFn = (query, signal) =>
  new Promise<string[]>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      const q = query.trim().toLowerCase();
      resolve(PEOPLE.filter((name) => name.toLowerCase().includes(q)));
    }, 100 + Math.random() * 600);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

export function searchApi(query: string, signal: AbortSignal): Promise<string[]> {
  return impl(query, signal);
}

/**
 * Test seam: lets the grader swap the backend without module mocking, which the in-browser test
 * runner can't do. Not used by the client itself.
 */
export function __setSearchImpl(fn: SearchFn): void {
  impl = fn;
}
