import { createSearchClient } from "./search-client";
import { __setSearchImpl } from "./search-api";
import { TIMEOUT_MS } from "./config";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Request = { resolve: (results: string[]) => void; reject: (error: unknown) => void; signal: AbortSignal };

/**
 * Installs a backend whose responses the test settles by hand, in any order. By default each
 * request rejects with `signal.reason` when its signal aborts, as fetch does. With
 * `honourSignal: false` it ignores the signal, like a cache or an SDK that can't be cancelled.
 * With `wrapAbort: true` it rejects with its own `Error` instead, as many HTTP clients do.
 */
function controllable({ honourSignal = true, wrapAbort = false }: { honourSignal?: boolean; wrapAbort?: boolean } = {}) {
  const requests: Record<string, Request> = {};
  __setSearchImpl(
    (query, signal) =>
      new Promise<string[]>((resolve, reject) => {
        requests[query] = { resolve, reject, signal };
        if (!honourSignal) return;
        const onAbort = () => reject(wrapAbort ? new Error("request cancelled") : signal.reason);
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
      }),
  );
  return requests;
}

describe("createSearchClient", () => {
  it("shows a search's results", async () => {
    const requests = controllable();
    const client = createSearchClient();
    const done = client.search("ann");
    expect(client.getState().status).toBe("loading");
    requests["ann"].resolve(["Ann Lee"]);
    await done;
    const state = client.getState();
    expect(state.status).toBe("success");
    expect(state.query).toBe("ann");
    expect(state.results.join(",")).toBe("Ann Lee");
  });

  it("aborts the previous request when a new search starts", async () => {
    const requests = controllable();
    const client = createSearchClient();
    void client.search("a");
    void client.search("ab");
    await sleep(5);
    expect(requests["a"].signal.aborted).toBe(true);
    expect(requests["ab"].signal.aborted).toBe(false);
  });

  it("never lets an older response overwrite a newer one, even if the request ignores its signal", async () => {
    const requests = controllable({ honourSignal: false });
    const client = createSearchClient();
    const first = client.search("a");
    const second = client.search("ab");
    requests["ab"].resolve(["Abby Chen"]);
    await second;
    requests["a"].resolve(["Alice Moreau"]); // the older request finishes last
    await first;
    const state = client.getState();
    expect(state.query).toBe("ab");
    expect(state.results.join(",")).toBe("Abby Chen");
  });

  it("does not report a superseded search as an error, even when the request wraps the abort", async () => {
    // The aborted request rejects with a plain Error("request cancelled"), not an AbortError,
    // so only your own bookkeeping can tell that it was superseded.
    controllable({ wrapAbort: true });
    const client = createSearchClient();
    void client.search("a");
    void client.search("ab");
    await sleep(5); // the first request has been aborted (or is still pending) by now
    const state = client.getState();
    expect(state.error).toBe(null);
    expect(state.status).toBe("loading");
    expect(state.query).toBe("ab");
  });

  it("cancel() aborts the request in flight and returns to idle without an error", async () => {
    const requests = controllable();
    const client = createSearchClient();
    void client.search("a");
    client.cancel();
    await sleep(5);
    expect(requests["a"].signal.aborted).toBe(true);
    const state = client.getState();
    expect(state.status).toBe("idle");
    expect(state.error).toBe(null);
  });

  it("stays idle after cancel(), even if the cancelled request still resolves", async () => {
    const requests = controllable({ honourSignal: false });
    const client = createSearchClient();
    const done = client.search("a");
    client.cancel();
    requests["a"].resolve(["Ann Lee"]); // it ignored the abort and finished anyway
    await done;
    const state = client.getState();
    expect(state.status).toBe("idle");
    expect(state.results.length).toBe(0);
  });

  it("aborts a search that takes longer than TIMEOUT_MS and reports a timeout", async () => {
    const requests = controllable(); // never settled by the test: only an abort can end it
    const client = createSearchClient();
    void client.search("slow");
    await sleep(TIMEOUT_MS * 2 + 20);
    // Giving up on the request isn't enough (that's all Promise.race does): it must be aborted.
    expect(requests["slow"].signal.aborted).toBe(true);
    const state = client.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBe("Search timed out");
  });

  it("reports a real failure with its own message", async () => {
    const requests = controllable();
    const client = createSearchClient();
    const done = client.search("a");
    requests["a"].reject(new Error("search service down"));
    await done;
    const state = client.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBe("search service down");
  });
});
