import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "./api";

// Runner note: in the app, "./solution" is aliased to the learner's edited starter.tsx.
// During authoring we validate the tests against the real reference solution.
import { SearchUsers } from "./solution";

type Pending = {
  promise: Promise<api.User[]>;
  resolve: (users: api.User[]) => void;
  aborted: boolean;
};

/** A promise we can resolve manually, and that rejects with AbortError if its signal aborts. */
function makePending(signal?: AbortSignal): Pending {
  let resolve!: (u: api.User[]) => void;
  let reject!: (e: unknown) => void;
  const pending: Pending = {
    aborted: false,
    resolve: (u) => resolve(u),
    promise: new Promise<api.User[]>((res, rej) => {
      resolve = res;
      reject = rej;
    }),
  };
  signal?.addEventListener("abort", () => {
    pending.aborted = true;
    const err = new Error("Aborted");
    err.name = "AbortError";
    reject(err);
  });
  return pending;
}

describe("SearchUsers", () => {
  let pending: Record<string, Pending>;

  beforeEach(() => {
    pending = {};
    vi.spyOn(api, "searchUsers").mockImplementation((query: string, signal?: AbortSignal) => {
      const p = makePending(signal);
      pending[query] = p;
      return p.promise;
    });
  });

  it("renders results for the typed query", async () => {
    render(<SearchUsers />);
    fireEvent.change(screen.getByLabelText("search"), { target: { value: "ann" } });
    pending["ann"].resolve([{ id: 1, name: "Ann Lee" }]);
    expect(await screen.findByText("Ann Lee")).toBeInTheDocument();
  });

  it("ignores a stale response that resolves after a newer query (race guard)", async () => {
    render(<SearchUsers />);
    const input = screen.getByLabelText("search");

    fireEvent.change(input, { target: { value: "a" } }); // slow request
    fireEvent.change(input, { target: { value: "ab" } }); // newer request

    // The newer request resolves first…
    pending["ab"].resolve([{ id: 2, name: "Abby" }]);
    expect(await screen.findByText("Abby")).toBeInTheDocument();

    // …then the stale one resolves. It must NOT overwrite the newer results.
    if (!pending["a"].aborted) pending["a"].resolve([{ id: 1, name: "Alice" }]);
    await waitFor(() => {
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
      expect(screen.getByText("Abby")).toBeInTheDocument();
    });
  });

  it("aborts the in-flight request when the query changes", async () => {
    render(<SearchUsers />);
    const input = screen.getByLabelText("search");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    await waitFor(() => expect(pending["a"].aborted).toBe(true));
  });
});
