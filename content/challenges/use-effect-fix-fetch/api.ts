export type User = { id: number; name: string };

const DIRECTORY: User[] = [
  { id: 1, name: "Ann Lee" },
  { id: 2, name: "Abby Chen" },
  { id: 3, name: "Marco Diaz" },
  { id: 4, name: "Priya Patel" },
  { id: 5, name: "Sam Okafor" },
];

/**
 * Default implementation — simulates a network call with latency and honors the abort
 * signal. (Provided; you don't need to edit this file.)
 */
let impl = (query: string, signal?: AbortSignal): Promise<User[]> =>
  new Promise<User[]>((resolve, reject) => {
    const abortError = () => Object.assign(new Error("Aborted"), { name: "AbortError" });
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      const q = query.trim().toLowerCase();
      resolve(DIRECTORY.filter((u) => u.name.toLowerCase().includes(q)));
    }, 350);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(abortError());
    });
  });

export function searchUsers(query: string, signal?: AbortSignal): Promise<User[]> {
  return impl(query, signal);
}

/**
 * Test seam: lets the grader swap the implementation without module mocking
 * (Sandpack's in-browser Jest can't do `jest.mock`). Not used by the lesson code.
 */
export function __setSearchImpl(fn: typeof impl): void {
  impl = fn;
}
