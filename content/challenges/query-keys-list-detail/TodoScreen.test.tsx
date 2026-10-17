import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TodoScreen, todoKeys } from "./TodoScreen";
import { __setImpl, type Status, type TodoDetail } from "./api";

// A fake server the test controls through the api.ts seam (no module mocking in the sandbox).
// `hold()` makes every later request wait until `release()`, so a test can look at the screen
// while a fetch is still in flight.
function fakeServer() {
  const rows: TodoDetail[] = [
    { id: 1, title: "Buy milk", status: "open", notes: "Oat, not dairy." },
    { id: 2, title: "Walk the dog", status: "open", notes: "Before 9am." },
    { id: 3, title: "File taxes", status: "done", notes: "Filed on the 3rd." },
  ];
  const calls: string[] = [];
  let gate: Promise<void> | null = null;
  let openGate = () => {};
  const wait = () => gate ?? Promise.resolve();

  __setImpl({
    async todos(status: Status) {
      calls.push(`list:${status}`);
      await wait();
      return rows.filter((t) => t.status === status).map(({ id, title, status }) => ({ id, title, status }));
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
    calls,
    rename(id: number, title: string) {
      const row = rows.find((t) => t.id === id);
      if (row) row.title = title;
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

// A fresh client per test: no shared cache, no retries, and no garbage-collection timers.
function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
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

describe("TodoScreen query keys", () => {
  it("shows the selected filter's todos", async () => {
    fakeServer();
    renderScreen();
    await screen.findByText("Buy milk");

    fireEvent.click(filter("Done"));
    expect(await screen.findByText("File taxes")).toBeTruthy();
    expect(screen.queryByText("Buy milk")).toBeNull();
  });

  it("returns to an already-viewed filter's cached list at once", async () => {
    const server = fakeServer();
    renderScreen();
    await screen.findByText("Buy milk");
    fireEvent.click(filter("Done"));
    await screen.findByText("File taxes");

    // The background refetch of "open" can't answer yet, so whatever shows now came from
    // the cache entry for the "open" list.
    server.hold();
    fireEvent.click(filter("Open"));
    try {
      expect(listText()).toContain("Buy milk");
      expect(listText()).not.toContain("File taxes");
    } finally {
      server.release();
    }
  });

  it("shows the details of whichever todo you select", async () => {
    fakeServer();
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: "Buy milk" }));
    await waitFor(() => expect(detailTitle()).toBe("Buy milk"));

    fireEvent.click(screen.getByRole("button", { name: "Walk the dog" }));
    await waitFor(() => expect(detailTitle()).toBe("Walk the dog"));
  });

  it("invalidating todoKeys.all refetches the list and the open detail", async () => {
    const server = fakeServer();
    const queryClient = renderScreen();
    fireEvent.click(await screen.findByRole("button", { name: "Buy milk" }));
    await waitFor(() => expect(detailTitle()).toBe("Buy milk"));

    server.rename(1, "Buy oat milk");
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: todoKeys.all });
    });

    await waitFor(() => expect(listText()).toContain("Buy oat milk"));
    await waitFor(() => expect(detailTitle()).toBe("Buy oat milk"));
  });

  it("invalidating todoKeys.lists() refetches lists but not the detail", async () => {
    const server = fakeServer();
    const queryClient = renderScreen();
    fireEvent.click(await screen.findByRole("button", { name: "Buy milk" }));
    await waitFor(() => expect(detailTitle()).toBe("Buy milk"));
    const count = (call: string) => server.calls.filter((c) => c === call).length;
    const [listsBefore, detailsBefore] = [count("list:open"), count("detail:1")];

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    });

    expect(count("list:open")).toBe(listsBefore + 1);
    expect(count("detail:1")).toBe(detailsBefore);
  });
});
