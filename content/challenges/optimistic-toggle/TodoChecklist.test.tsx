import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TodoChecklist, todosKey } from "./TodoChecklist";
import { __setImpl, type Todo } from "./api";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A fake server the test controls through the api.ts seam (no module mocking in the sandbox).
// Like a real one, it reads its rows when a GET *arrives*, so a GET sent before a write answers
// with pre-write data. `holdLists()` / `holdPatches()` park later requests until released.
function fakeServer() {
  const rows: Todo[] = [
    { id: 1, title: "Buy milk", done: false },
    { id: 2, title: "Walk the dog", done: false },
  ];
  const counts = { lists: 0, patches: 0 };
  const heldLists: Array<() => void> = [];
  const heldPatches: Array<() => void> = [];
  let holdingLists = false;
  let holdingPatches = false;
  let failNext = false;

  __setImpl({
    async todos() {
      counts.lists += 1;
      const snapshot = rows.map((t) => ({ ...t }));
      if (holdingLists) await new Promise<void>((resolve) => heldLists.push(resolve));
      return snapshot;
    },
    async patch(id: number, done: boolean) {
      counts.patches += 1;
      const shouldFail = failNext;
      failNext = false;
      if (holdingPatches) await new Promise<void>((resolve) => heldPatches.push(resolve));
      if (shouldFail) throw new Error("409 Conflict");
      const row = rows.find((t) => t.id === id)!;
      row.done = done;
      return { ...row };
    },
  });

  const releaseAll = (held: Array<() => void>) => held.splice(0).forEach((release) => release());
  return {
    rows,
    counts,
    holdLists: () => (holdingLists = true),
    holdPatches: () => (holdingPatches = true),
    failNextPatch: () => (failNext = true),
    releaseLists: () => releaseAll(heldLists),
    releasePatches: () => releaseAll(heldPatches),
    releaseEverything() {
      holdingLists = false;
      holdingPatches = false;
      releaseAll(heldLists);
      releaseAll(heldPatches);
    },
  };
}

// A fresh client per test: no shared cache, no retries, and no garbage-collection timers.
function renderChecklist() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TodoChecklist />
    </QueryClientProvider>,
  );
  return queryClient;
}

const box = (name: string) => screen.getByRole("checkbox", { name }) as HTMLInputElement;

describe("optimistic toggle", () => {
  it("ticks the box at once, before the server answers", async () => {
    const server = fakeServer();
    renderChecklist();
    await screen.findByRole("checkbox", { name: "Buy milk" });

    server.holdPatches();
    try {
      fireEvent.click(box("Buy milk"));
      await waitFor(() => expect(box("Buy milk").checked).toBe(true));
      expect(server.counts.patches).toBe(1);
    } finally {
      server.releaseEverything();
    }
  });

  it("a refetch already in flight doesn't undo the tick when it lands", async () => {
    const server = fakeServer();
    const queryClient = renderChecklist();
    await screen.findByRole("checkbox", { name: "Buy milk" });

    server.holdLists();
    server.holdPatches();
    try {
      // A background refetch reads the server BEFORE the click…
      act(() => {
        void queryClient.invalidateQueries({ queryKey: todosKey });
      });
      await waitFor(() => expect(server.counts.lists).toBe(2));
      fireEvent.click(box("Buy milk"));
      await waitFor(() => expect(box("Buy milk").checked).toBe(true));

      // …and answers AFTER it, with "Buy milk" still not done.
      await act(async () => {
        server.releaseLists();
        await sleep(50);
      });
      expect(box("Buy milk").checked).toBe(true);
    } finally {
      server.releaseEverything();
    }
  });

  it("a failed save un-ticks the box at once and shows the error", async () => {
    const server = fakeServer();
    renderChecklist();
    await screen.findByRole("checkbox", { name: "Buy milk" });

    server.failNextPatch();
    server.holdLists(); // a re-sync can't answer, so only a rollback can un-tick the box
    try {
      fireEvent.click(box("Buy milk"));
      await waitFor(() => expect(server.counts.patches).toBe(1));
      await waitFor(() => expect(box("Buy milk").checked).toBe(false));
    } finally {
      server.releaseEverything();
    }
    // The mutation reports its error once its callbacks — including a returned re-sync — settle.
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("409");
    expect(box("Buy milk").checked).toBe(false);
  });

  it("after a save settles, the list is refetched from the server", async () => {
    const server = fakeServer();
    renderChecklist();
    await screen.findByRole("checkbox", { name: "Buy milk" });

    server.holdPatches();
    fireEvent.click(box("Buy milk"));
    server.rows[1].title = "Walk the cat"; // another user's change, meanwhile
    server.releaseEverything();

    expect(await screen.findByRole("checkbox", { name: "Walk the cat" })).toBeTruthy();
    expect(box("Buy milk").checked).toBe(true);
  });

  it("a failed save re-syncs with the server too", async () => {
    const server = fakeServer();
    renderChecklist();
    await screen.findByRole("checkbox", { name: "Buy milk" });

    server.failNextPatch();
    server.rows[1].title = "Walk the cat"; // another user's change, meanwhile
    fireEvent.click(box("Buy milk"));

    expect(await screen.findByRole("checkbox", { name: "Walk the cat" })).toBeTruthy();
    expect(box("Buy milk").checked).toBe(false);
  });
});
