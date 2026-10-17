import { REQUEST_MS } from "./config";

export type User = { id: string; name: string; accountId: string };
export type Panel = "orders" | "notifications" | "recommendations";

export type DashboardApi = {
  getUser(userId: string): Promise<User>;
  /** Panels are keyed by the user's `accountId`, which only `getUser` can tell you. */
  getPanel(panel: Panel, accountId: string): Promise<string[]>;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Default implementation: a fake backend with a little latency. (Provided; don't edit.) */
let impl: DashboardApi = {
  async getUser(userId) {
    await sleep(REQUEST_MS);
    return { id: userId, name: "Ada Lovelace", accountId: `acct-${userId}` };
  },
  async getPanel(panel, accountId) {
    await sleep(REQUEST_MS);
    return [`${panel} #1 for ${accountId}`, `${panel} #2 for ${accountId}`];
  },
};

export const api: DashboardApi = {
  getUser: (userId) => impl.getUser(userId),
  getPanel: (panel, accountId) => impl.getPanel(panel, accountId),
};

/**
 * Test seam: lets the grader (and the preview) swap the backend without module mocking, which
 * the in-browser test runner can't do. Not used by the loader itself.
 */
export function __setApi(next: DashboardApi): void {
  impl = next;
}
