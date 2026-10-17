import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onTodoCreated, onTodoRenamed } from "./cache-sync";
import { TodoScreen } from "./TodoScreen";
import { __setImpl, type Status, type Todo } from "./api";

// A fake server the test controls through the api.ts seam (no module mocking in the sandbox).
// `hold()` parks every later request until `release()`, so a test can tell data written into
// the cache apart from data that needed a request.
function fakeServer() {
  const rows: Todo[] = [
    { id: 1, title: "Buy milk", status: "open" },
    { id: 2, title: "Walk the dog", status: "open" },
    { id: 3, title: "File taxes", status: "done" },
  ];
  const calls: string[] = [];
  let gate: Promise<void> | null = null;
  let openGate = () => {};
  const wait = () => gate ?? Promise.resolve();

  __setImpl({
    async todos(status: Status) {
      calls.push(`list:${status}`);
      await wait();
      return rows.filter((t) => t.status === status).map((t) => ({ ...t }));
    },
    async todo(id: number) {
      calls.push(`detail:${id}`);
      await wait();
      const row = rows.find((t) => t.id === id);
      if (!row) throw new Error(`Todo ${id} not found`);
      return { ...row };
    },
  });

  return {
    count: (call: string) => calls.filter((c) => c === call).length,
    rename(id: number, title: string): Todo {
      const row = rows.find((t) => t.id === id)!;
      row.title = title;
      return { ...row };
    },
    add(todo: Todo) {
      rows.push(todo);
    },
    hold() {
      gate = new Promise<void>((resolve) => {
        openGate = resolve;
      });
    },
    release() {
      gate = null;
      openGate();
    },
  };
}

// A fresh client per test, configured like the app: data stays fresh for 60 s, so nothing
// refetches by itself during a test — only what the handlers ask for.
function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: false, gcTime: Infinity } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TodoScreen />
    </QueryClientProvider>,
  );
  return queryClient;
}

const listText = () => screen.getByTestId("list").textContent ?? "";
const detailTitle = () => screen.getByTestId("detail-title").textContent;
const filter = (name: "Open" | "Done") => screen.getByRole("button", { name });

describe("cache sync handlers", () => {
  it("a pushed rename shows in the list on screen, without a request", async () => {
    const server = fakeServer();
    const queryClient = renderScreen();
    await screen.findByText("Buy milk");
    const listsBefore = server.count("list:open");

    const renamed = server.rename(1, "Buy oat milk");
    server.hold();
    try {
      act(() => onTodoRenamed(queryClient, renamed));
      await waitFor(() => expect(listText()).toContain("Buy oat milk"));
      expect(server.count("list:open")).toBe(listsBefore);
    } finally {
      server.release();
    }
  });

  it("a pushed rename shows in the open detail, without a request", async () => {
    const server = fakeServer();
    const queryClient = renderScreen();
    fireEvent.click(await screen.findByRole("button", { name: "Buy milk" }));
    await waitFor(() => expect(detailTitle()).toBe("Buy milk"));
    const detailsBefore = server.count("detail:1");

    const renamed = server.rename(1, "Buy oat milk");
    server.hold();
    try {
      act(() => onTodoRenamed(queryClient, renamed));
      await waitFor(() => expect(detailTitle()).toBe("Buy oat milk"));
      expect(server.count("detail:1")).toBe(detailsBefore);
    } finally {
      server.release();
    }
  });

  it("a created todo appears in the list on screen, which stays up while it refreshes", async () => {
    const server = fakeServer();
    const queryClient = renderScreen();
    await screen.findByText("Buy milk");

    server.add({ id: 8, title: "Water plants", status: "open" });
    server.hold();
    try {
      act(() => onTodoCreated(queryClient));
      // The refetch can't answer yet: the current rows must stay on screen meanwhile.
      await waitFor(() => expect(server.count("list:open")).toBe(2));
      expect(screen.queryByTestId("list-loading")).toBeNull();
      expect(listText()).toContain("Buy milk");
    } finally {
      server.release();
    }

    await waitFor(() => expect(listText()).toContain("Water plants"));
  });

  it("a created todo appears in a hidden list when it's shown again — fetched only then", async () => {
    const server = fakeServer();
    const queryClient = renderScreen();
    await screen.findByText("Buy milk");
    fireEvent.click(filter("Done"));
    await screen.findByText("File taxes");
    fireEvent.click(filter("Open")); // the "done" list is now cached but hidden
    await screen.findByText("Buy milk");

    server.add({ id: 9, title: "Renew passport", status: "done" });
    act(() => onTodoCreated(queryClient));
    await waitFor(() => expect(server.count("list:open")).toBe(2));
    expect(server.count("list:done")).toBe(1);

    server.hold();
    try {
      fireEvent.click(filter("Done"));
      // Shown again: its cached rows appear at once while the refetch runs in the background.
      await waitFor(() => expect(server.count("list:done")).toBe(2));
      expect(screen.queryByTestId("list-loading")).toBeNull();
      expect(listText()).toContain("File taxes");
    } finally {
      server.release();
    }
    await waitFor(() => expect(listText()).toContain("Renew passport"));
  });
});
