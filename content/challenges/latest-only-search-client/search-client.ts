import { searchApi } from "./search-api";
import { TIMEOUT_MS } from "./config";

export type SearchState = {
  query: string;
  status: "idle" | "loading" | "success" | "error";
  results: string[];
  error: string | null;
};

export type SearchClient = {
  getState(): SearchState;
  /** Resolves once this search has settled one way or another. Never rejects. */
  search(query: string): Promise<void>;
  /** Abandons the search in flight, if any, and goes back to idle. */
  cancel(): void;
};

const IDLE: SearchState = { query: "", status: "idle", results: [], error: null };

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/*
 * Four bugs, in the order worth fixing them (each has its own failing test):
 *   1. A new search replaces the controller without aborting the previous request.
 *   2. Whichever response arrives LAST is written, even if a newer search has started since.
 *      Aborting alone can't fix this: some requests ignore their signal.
 *   3. cancel() aborts, and the abort is then reported as `status: "error"`. Being cancelled
 *      (or superseded) is not a failure. Decide by your own bookkeeping, not the error.
 *   4. There's no deadline: a hung request stays "loading" forever. Give each request a
 *      `timeoutMs` deadline on top of its own controller, and report a timeout as
 *      "Search timed out", whatever error the request rejects with.
 */

/** `timeoutMs` defaults to TIMEOUT_MS (config.ts), which the tests use. */
export function createSearchClient({ timeoutMs = TIMEOUT_MS }: { timeoutMs?: number } = {}): SearchClient {
  let state: SearchState = IDLE;
  let controller: AbortController | undefined;

  async function search(query: string): Promise<void> {
    controller = new AbortController();
    const { signal } = controller;
    state = { query, status: "loading", results: state.results, error: null };

    try {
      const results = await searchApi(query, signal);
      state = { ...state, status: "success", results };
    } catch (error) {
      state = { ...state, status: "error", results: [], error: messageOf(error) };
    }
  }

  function cancel(): void {
    controller?.abort();
    state = IDLE;
  }

  return { getState: () => state, search, cancel };
}
