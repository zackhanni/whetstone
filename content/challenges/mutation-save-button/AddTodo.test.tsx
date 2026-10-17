import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddTodoForm, useAddTodo } from "./AddTodo";
import { TodoList } from "./TodoList";
import { __setImpl, type Todo } from "./api";

// A gate parks requests until it's opened, so a test can look at the screen mid-request.
function gate() {
  let promise: Promise<void> | null = null;
  let open = () => {};
  return {
    close() {
      promise = new Promise<void>((resolve) => {
        open = resolve;
      });
    },
    open() {
      promise = null;
      open();
    },
    wait: () => promise ?? Promise.resolve(),
  };
}

// A fake server the test controls through the api.ts seam (no module mocking in the sandbox).
function fakeServer() {
  const rows: Todo[] = [{ id: 1, title: "Buy milk" }];
  const creates = gate();
  const lists = gate();
  let failNext = false;
  const counts = { creates: 0, listFetches: 0 };

  __setImpl({
    async todos() {
      counts.listFetches += 1;
      await lists.wait();
      return rows.map((t) => ({ ...t }));
    },
    async create(title: string) {
      counts.creates += 1;
      const shouldFail = failNext;
      failNext = false;
      await creates.wait();
      if (shouldFail) throw new Error("500 Internal Server Error");
      const todo = { id: rows.length + 1, title };
      rows.push(todo);
      return { ...todo };
    },
  });

  return { counts, creates, lists, failNextCreate: () => (failNext = true) };
}

// A fresh client per test: no shared cache, no retries, and no garbage-collection timers.
function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// Any component that calls the hook — not just the form.
function QuickAdd() {
  const addTodo = useAddTodo();
  return (
    <button type="button" onClick={() => addTodo.mutate("Call mum")}>
      Quick add
    </button>
  );
}

const input = () => screen.getByLabelText("New todo") as HTMLInputElement;
const save = () => screen.getByTestId("save") as HTMLButtonElement;
const listText = () => screen.queryByTestId("list")?.textContent ?? "";
const type = (value: string) => fireEvent.change(input(), { target: { value } });

describe("AddTodoForm and useAddTodo", () => {
  it("useAddTodo refreshes the list after a save, whichever component calls it", async () => {
    fakeServer();
    renderWithClient(
      <>
        <TodoList />
        <QuickAdd />
      </>,
    );
    await waitFor(() => expect(listText()).toContain("Buy milk"));

    fireEvent.click(screen.getByRole("button", { name: "Quick add" }));
    await waitFor(() => expect(listText()).toContain("Call mum"));
  });

  it("stays pending — button disabled — until the refreshed list shows the new todo", async () => {
    const server = fakeServer();
    renderWithClient(
      <>
        <TodoList />
        <AddTodoForm />
      </>,
    );
    await waitFor(() => expect(listText()).toContain("Buy milk"));

    server.lists.close(); // the refetch after the save can't answer yet
    type("Water plants");
    fireEvent.click(save());
    try {
      await waitFor(() => expect(server.counts.listFetches).toBe(2));
      expect(save().disabled).toBe(true);
      expect(listText()).not.toContain("Water plants");
    } finally {
      server.lists.open();
    }
    await waitFor(() => expect(listText()).toContain("Water plants"));
    await waitFor(() => expect(save().disabled).toBe(false));
  });

  it("a second click while saving doesn't send a second request", async () => {
    const server = fakeServer();
    renderWithClient(<AddTodoForm />);

    server.creates.close();
    type("Water plants");
    fireEvent.click(save());
    await waitFor(() => expect(save().textContent).toBe("Saving…"));
    fireEvent.click(save());
    server.creates.open();

    await waitFor(() => expect(save().textContent).toBe("Save"));
    expect(server.counts.creates).toBe(1);
  });

  it("a failed save keeps what the user typed and shows the error", async () => {
    const server = fakeServer();
    renderWithClient(<AddTodoForm />);

    server.failNextCreate();
    type("Water plants");
    fireEvent.click(save());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("500");
    expect(input().value).toBe("Water plants");
  });

  it("a successful save clears the input", async () => {
    fakeServer();
    renderWithClient(<AddTodoForm />);

    type("Water plants");
    fireEvent.click(save());

    await waitFor(() => expect(input().value).toBe(""));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
