import { loadDashboard } from "./loader";
import { __setApi, type Panel } from "./api";
import { REQUEST_MS } from "./config";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Wraps a promise in a promise-like that notes when someone starts listening to it. `await`,
 * `.then`, `.catch` and the `Promise` combinators all end up calling `then`, so `listened` says
 * whether the loader had a handler attached before the failure happened.
 */
function watch<T>(promise: Promise<T>) {
  const watched = {
    listened: false,
    then<A = T, B = never>(
      onFulfilled?: ((value: T) => A | PromiseLike<A>) | null,
      onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
    ): Promise<A | B> {
      watched.listened = true;
      return promise.then(onFulfilled, onRejected);
    },
    catch<B = never>(onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null): Promise<T | B> {
      return watched.then(undefined, onRejected);
    },
    finally(onFinally?: (() => void) | null): Promise<T> {
      watched.listened = true;
      return promise.finally(onFinally);
    },
  };
  return watched;
}

/** Installs a fake backend that records panel requests and how many run at once. */
function fakeBackend({ failUser = false, failPanel }: { failUser?: boolean; failPanel?: Panel } = {}) {
  const stats = {
    panelRequests: [] as string[],
    inFlight: 0,
    maxInFlight: 0,
    /** Was a handler already attached to the failing panel when it failed? */
    failureHadHandler: undefined as boolean | undefined,
  };
  __setApi({
    async getUser(userId) {
      await sleep(REQUEST_MS);
      if (failUser) throw new Error("user service down");
      return { id: userId, name: "Ada", accountId: `acct-${userId}` };
    },
    getPanel(panel, accountId) {
      stats.panelRequests.push(`${panel}:${accountId}`);
      stats.inFlight += 1;
      stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
      if (panel === failPanel) {
        // A service that's down tends to fail fast, before the other panels have answered.
        const failure = watch(
          sleep(REQUEST_MS / 4).then(() => {
            stats.inFlight -= 1;
            stats.failureHadHandler = failure.listened;
            throw new Error(`${panel} service down`);
          }),
        );
        return failure as unknown as Promise<string[]>;
      }
      return sleep(REQUEST_MS).then(() => {
        stats.inFlight -= 1;
        return [`${panel}-1`, `${panel}-2`];
      });
    },
  });
  return stats;
}

describe("loadDashboard", () => {
  it("loads the user and all three panels", async () => {
    const stats = fakeBackend();
    const dashboard = await loadDashboard("u1");
    expect(dashboard.user.name).toBe("Ada");
    expect(JSON.stringify(dashboard.panels.orders)).toBe(JSON.stringify({ status: "ok", items: ["orders-1", "orders-2"] }));
    expect(dashboard.panels.notifications.status).toBe("ok");
    expect(dashboard.panels.recommendations.status).toBe("ok");
    // Panels are keyed by the accountId that getUser returned, not the userId.
    expect(stats.panelRequests.sort().join(",")).toBe(
      "notifications:acct-u1,orders:acct-u1,recommendations:acct-u1",
    );
  });

  it("rejects with the user service's own error when the user can't be loaded", async () => {
    const stats = fakeBackend({ failUser: true });
    let caught: unknown;
    try {
      await loadDashboard("u1");
    } catch (error) {
      caught = error;
    }
    expect((caught as Error | undefined)?.message).toBe("user service down");
    expect(stats.panelRequests.length).toBe(0);
  });

  it("requests the three panels at the same time", async () => {
    const stats = fakeBackend();
    await loadDashboard("u1");
    expect(stats.maxInFlight).toBe(3);
  });

  it("turns a failed panel into an error entry and still loads everything else", async () => {
    fakeBackend({ failPanel: "notifications" });
    let dashboard: Awaited<ReturnType<typeof loadDashboard>> | undefined;
    let caught: unknown;
    try {
      dashboard = await loadDashboard("u1");
    } catch (error) {
      caught = error;
    }
    expect((caught as Error | undefined)?.message).toBe(undefined); // the load itself must not reject
    expect(dashboard?.user.name).toBe("Ada");
    expect(JSON.stringify(dashboard?.panels.notifications)).toBe(
      JSON.stringify({ status: "error", message: "notifications service down" }),
    );
    expect(dashboard?.panels.orders.status).toBe("ok");
    expect(dashboard?.panels.recommendations.status).toBe("ok");
  });

  it("is already handling a panel's failure when it happens, even while other panels load", async () => {
    // Notifications fails before orders answers. Awaiting the started panels one at a time
    // attaches its handler too late: an unhandled rejection in between (Node 15+ exits on one).
    const stats = fakeBackend({ failPanel: "notifications" });
    await loadDashboard("u1").catch(() => undefined); // the previous test covers the result
    expect(stats.failureHadHandler).toBe(true);
  });
});
