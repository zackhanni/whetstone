import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TodoList } from "./TodoList";
import { __setImpl, PAGE_SIZE, type Todo } from "./api";

// A fake server the test controls through the api.ts seam (no module mocking in the sandbox).
// `hold()` parks every later request until `release()`; `failNext()` makes the next one reject.
function fakeServer(rows: Todo[]) {
  let gate: Promise<void> | null = null;
  let openGate = () => {};
  let fail = false;

  __setImpl(async (page: number) => {
    const shouldFail = fail;
    fail = false;
    if (gate) await gate;
    if (shouldFail) throw new Error("503 Service Unavailable");
    const start = (page - 1) * PAGE_SIZE;
    return { items: rows.slice(start, start + PAGE_SIZE), hasMore: start + PAGE_SIZE < rows.length };
  });

  return {
    hold() {
      gate = new Promise<void>((resolve) => {
        openGate = resolve;
      });
    },
    release() {
      gate = null;
      openGate();
    },
    failNext() {
      fail = true;
    },
  };
}

const FIVE_TODOS: Todo[] = [
  { id: 1, title: "Buy milk" },
  { id: 2, title: "Walk the dog" },
  { id: 3, title: "File taxes" },
  { id: 4, title: "Book dentist" },
  { id: 5, title: "Call mum" },
];

// A fresh client per test: no shared cache, no retries, and no garbage-collection timers.
function renderList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TodoList />
    </QueryClientProvider>,
  );
}

const listText = () => screen.queryByTestId("list")?.textContent ?? "";
const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("TodoList query states", () => {
  it("shows a loading state on the first load, then the list", async () => {
    const server = fakeServer(FIVE_TODOS);
    server.hold();
    renderList();
    try {
      expect(screen.getByTestId("loading")).toBeTruthy();
      expect(screen.queryByTestId("empty")).toBeNull();
    } finally {
      server.release();
    }
    await waitFor(() => expect(listText()).toContain("Buy milk"));
  });

  it("keeps the list on screen during a background refetch", async () => {
    const server = fakeServer(FIVE_TODOS);
    renderList();
    await waitFor(() => expect(listText()).toContain("Buy milk"));

    server.hold();
    fireEvent.click(button("Refresh"));
    try {
      await waitFor(() => expect(screen.queryByTestId("refreshing")).toBeTruthy());
      expect(listText()).toContain("Buy milk");
      expect(screen.queryByTestId("loading")).toBeNull();
    } finally {
      server.release();
    }
    await waitFor(() => expect(screen.queryByTestId("refreshing")).toBeNull());
  });

  it("keeps the list and adds an error banner when a refetch fails", async () => {
    const server = fakeServer(FIVE_TODOS);
    renderList();
    await waitFor(() => expect(listText()).toContain("Buy milk"));

    server.failNext();
    fireEvent.click(button("Refresh"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("503");
    expect(listText()).toContain("Buy milk");
  });

  it("shows the error instead of a list when the first load fails", async () => {
    const server = fakeServer(FIVE_TODOS);
    server.failNext();
    renderList();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("503");
    expect(screen.queryByTestId("list")).toBeNull();
    expect(screen.queryByTestId("loading")).toBeNull();
  });

  it("keeps the current page on screen while the next one loads, with Next disabled", async () => {
    const server = fakeServer(FIVE_TODOS);
    renderList();
    await waitFor(() => expect(listText()).toContain("Buy milk"));

    server.hold();
    fireEvent.click(button("Next"));
    try {
      await waitFor(() => expect(screen.getByTestId("page").textContent).toContain("Page 2"));
      expect(listText()).toContain("Buy milk");
      expect(screen.queryByTestId("loading")).toBeNull();
      expect(button("Next").disabled).toBe(true);
    } finally {
      server.release();
    }

    await waitFor(() => expect(listText()).toContain("File taxes"));
    expect(button("Next").disabled).toBe(false);
  });

  it("shows 'No todos' only once an empty list has loaded", async () => {
    const server = fakeServer([]);
    server.hold();
    renderList();
    try {
      expect(screen.queryByTestId("empty")).toBeNull();
    } finally {
      server.release();
    }
    await waitFor(() => expect(screen.queryByTestId("empty")).toBeTruthy());
  });
});
