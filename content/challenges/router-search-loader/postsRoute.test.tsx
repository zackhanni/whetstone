import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { createAppRouter } from "./router";
import { __setImpl, answer, type Post } from "./api";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ROWS: Post[] = [
  { id: 1, title: "React one", tag: "react" },
  { id: 2, title: "CSS one", tag: "css" },
  { id: 3, title: "React two", tag: "react" },
  { id: 4, title: "CSS two", tag: "css" },
  { id: 5, title: "React three", tag: "react" },
];

// A fake server the test controls through the api.ts seam (no module mocking in the sandbox).
// `hold()` parks later requests until `release()`; `nextRequest()` resolves when the next
// request arrives, so a test can wait for it without guessing a delay.
function fakeServer() {
  let gate: Promise<void> | null = null;
  let openGate = () => {};
  let onRequest = () => {};
  __setImpl(async ({ page, tag }) => {
    onRequest();
    if (gate) await gate;
    return answer(ROWS, page, tag);
  });
  return {
    nextRequest() {
      return new Promise<void>((resolve) => {
        onRequest = () => {
          onRequest = () => {};
          resolve();
        };
      });
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

// A fresh QueryClient and router per test; the router starts at `url` in memory.
function renderAt(url: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const router = createAppRouter(queryClient, url);
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, unmount: view.unmount };
}

const heading = () => screen.getByTestId("heading").textContent;
const listText = () => screen.getByTestId("list").textContent ?? "";

describe("posts route", () => {
  it("renders the page and tag from the URL", async () => {
    fakeServer();
    renderAt("/posts?page=2&tag=react");
    await screen.findByTestId("heading");
    expect(heading()).toBe("Page 2 · #react");
    expect(listText()).toContain("React three");
  });

  it("falls back to page 1 when the URL's page isn't a positive integer", async () => {
    fakeServer();
    for (const bad of ["abc", "0", "-3", "1.5"]) {
      const { unmount } = renderAt(`/posts?page=${bad}`);
      await screen.findByTestId("heading");
      expect(heading()).toBe("Page 1");
      expect(listText()).toContain("React one");
      unmount(); // RTL cleans up between tests, not between loop iterations
    }
  });

  it("Next waits for the loader: page 1 stays on screen, no loading flash", async () => {
    const server = fakeServer();
    renderAt("/posts?page=1");
    await screen.findByTestId("heading");

    server.hold();
    const pageTwoRequested = server.nextRequest();
    try {
      fireEvent.click(screen.getByText("Next"));
      // Wait for page 2's request (from the loader, or from a component that suspended) rather
      // than a fixed delay: the router's own pending timer is 1 s, and a throttled tab could
      // stretch a short sleep past it.
      await act(async () => {
        await Promise.race([pageTwoRequested, sleep(3000)]);
      });
      expect(screen.queryByTestId("pending")).toBeNull();
      expect(heading()).toBe("Page 1");
    } finally {
      server.release();
    }
    await waitFor(() => expect(heading()).toBe("Page 2"));
    expect(listText()).toContain("React two");
  });

  it("Next keeps the tag", async () => {
    fakeServer();
    const { router } = renderAt("/posts?page=1&tag=react");
    await screen.findByTestId("heading");

    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(heading()).toBe("Page 2 · #react"));
    expect(listText()).toContain("React three");
    expect(router.state.location.search).toEqual({ page: 2, tag: "react" });
  });
});
