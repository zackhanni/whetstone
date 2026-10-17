import { api, type Panel, type User } from "./api";

export const PANELS: Panel[] = ["orders", "notifications", "recommendations"];

export type PanelResult = { status: "ok"; items: string[] } | { status: "error"; message: string };
export type Dashboard = { user: User; panels: Record<Panel, PanelResult> };

const messageOf = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason));

/**
 * Loads the user (required), then the three panels. A failed panel is shown as an error box;
 * it must not take the rest of the dashboard down with it.
 */
export async function loadDashboard(userId: string): Promise<Dashboard> {
  // Required, and the panels need its accountId: load it first, and let a failure reject the
  // whole load with the real error. There's nothing useful to show without a user.
  const user = await api.getUser(userId);

  // The panels don't depend on each other, so start all three at once. allSettled waits for
  // every one, and turns each failure into data instead of rejecting the whole load.
  const results = await Promise.allSettled(PANELS.map((panel) => api.getPanel(panel, user.accountId)));

  const panels = {} as Record<Panel, PanelResult>;
  results.forEach((result, i) => {
    panels[PANELS[i]] =
      result.status === "fulfilled"
        ? { status: "ok", items: result.value }
        : { status: "error", message: messageOf(result.reason) };
  });

  return { user, panels };
}
