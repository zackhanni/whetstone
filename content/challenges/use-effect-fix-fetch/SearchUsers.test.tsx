import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SearchUsers } from "./SearchUsers";
import { __setSearchImpl, type User } from "./api";

type Pending = {
  resolve: (u: User[]) => void;
  reject: (e: Error) => void; // a real failure (network down, 500…), not a cancellation
  aborted: boolean;
  promise: Promise<User[]>;
};

// Install a controllable implementation. We don't module-mock (Sandpack's in-browser Jest
// can't), we just swap the api's impl via the test seam, then drive resolution by hand.
function controllable(): Record<string, Pending> {
  const pending: Record<string, Pending> = {};
  __setSearchImpl((query: string, signal?: AbortSignal) => {
    let resolve!: (u: User[]) => void;
    let reject!: (e: unknown) => void;
    const p: Pending = {
      aborted: false,
      resolve: (u) => resolve(u),
      reject: (e) => reject(e),
      promise: new Promise<User[]>((res, rej) => {
        resolve = res;
        reject = rej;
      }),
    };
    pending[query] = p;
    signal?.addEventListener("abort", () => {
      p.aborted = true;
      reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    });
    return p.promise;
  });
  return pending;
}

describe("SearchUsers", () => {
  it("renders results for the typed query", async () => {
    const pending = controllable();
    render(<SearchUsers />);
    fireEvent.change(screen.getByLabelText("search"), { target: { value: "ann" } });
    pending["ann"].resolve([{ id: 1, name: "Ann Lee" }]);
    expect(await screen.findByText("Ann Lee")).toBeTruthy();
  });

  it("ignores a stale response that resolves after a newer query", async () => {
    const pending = controllable();
    render(<SearchUsers />);
    const input = screen.getByLabelText("search");
    fireEvent.change(input, { target: { value: "a" } }); // slow request
    fireEvent.change(input, { target: { value: "ab" } }); // newer request

    pending["ab"].resolve([{ id: 2, name: "Abby" }]);
    expect(await screen.findByText("Abby")).toBeTruthy();

    // The stale "a" response resolves later — it must NOT overwrite "ab". Give its .then a
    // moment to run before asserting: a waitFor here would pass on its first, too-early check.
    if (!pending["a"].aborted) pending["a"].resolve([{ id: 1, name: "Alice" }]);
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.queryByText("Abby")).toBeTruthy();
  });

  it("aborts the in-flight request when the query changes", async () => {
    const pending = controllable();
    render(<SearchUsers />);
    const input = screen.getByLabelText("search");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    await waitFor(() => expect(pending["a"].aborted).toBe(true));
  });

  it("aborts the in-flight request when the component unmounts", async () => {
    const pending = controllable();
    const { unmount } = render(<SearchUsers />);
    fireEvent.change(screen.getByLabelText("search"), { target: { value: "a" } });
    unmount();
    await waitFor(() => expect(pending["a"].aborted).toBe(true));
  });

  it("shows a failed search in an alert, but not a request it cancelled", async () => {
    const pending = controllable();
    render(<SearchUsers />);
    const alertText = () => screen.queryByRole("alert")?.textContent ?? "";
    const input = screen.getByLabelText("search");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } }); // cancels "a"

    // "a" rejected with an AbortError. That's the cleanup working, not a failure to show.
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(alertText()).toBe("");

    // "ab" fails for real: the user must see it.
    pending["ab"].reject(new Error("Network down"));
    await waitFor(() => expect(alertText()).not.toBe(""));
  });
});
