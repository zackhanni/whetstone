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

/** `timeoutMs` defaults to TIMEOUT_MS (config.ts), which the tests use. */
export function createSearchClient({ timeoutMs = TIMEOUT_MS }: { timeoutMs?: number } = {}): SearchClient {
  let state: SearchState = IDLE;
  // The newest search's controller. Only that search may write to `state`.
  let current: AbortController | undefined;

  async function search(query: string): Promise<void> {
    current?.abort(); // the previous search is stale now: stop its request
    const controller = new AbortController();
    current = controller;
    state = { query, status: "loading", results: state.results, error: null };

    // Two ways to stop: a newer search or cancel() (our controller), or the deadline.
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);

    try {
      const results = await searchApi(query, signal);
      // Not every request honours its signal, and an abort can't un-fulfil a promise.
      // The identity check is what guarantees a stale result is never written.
      if (controller !== current) return;
      state = { query, status: "success", results, error: null };
    } catch (error) {
      // Superseded or cancelled: whoever aborted it owns the state now. Not an error.
      // (Checking our own bookkeeping works whatever the abort reason was.)
      if (controller !== current) return;
      const timedOut = (error as { name?: unknown } | null)?.name === "TimeoutError";
      state = { query, status: "error", results: [], error: timedOut ? "Search timed out" : messageOf(error) };
    }
  }

  function cancel(): void {
    current?.abort();
    current = undefined; // no search is current, so nothing in flight may write
    state = IDLE;
  }

  return { getState: () => state, search, cancel };
}
