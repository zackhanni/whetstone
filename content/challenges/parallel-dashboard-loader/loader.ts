import { api, type Panel, type User } from "./api";

export const PANELS: Panel[] = ["orders", "notifications", "recommendations"];

export type PanelResult = { status: "ok"; items: string[] } | { status: "error"; message: string };
export type Dashboard = { user: User; panels: Record<Panel, PanelResult> };

/**
 * Loads the user (required), then the three panels. A failed panel is shown as an error box;
 * it must not take the rest of the dashboard down with it.
 *
 * Three bugs, in the order worth fixing them (each has its own failing test):
 *   1. A failed user load is swallowed: the dashboard "loads" with no user, and the real error
 *      is gone. Let it reject with the user service's own error.
 *   2. The panels load one after another. They only need the user, not each other: start all
 *      three at once.
 *   3. One failed panel rejects the whole dashboard. Make each failure that panel's own
 *      `{ status: "error", message }`. (Promise.all alone won't do it: it rejects on the
 *      first failure too.)
 */
export async function loadDashboard(userId: string): Promise<Dashboard> {
  // "Never let one failure crash the page."
  const user = await api.getUser(userId).catch(() => undefined);

  const panels = {} as Record<Panel, PanelResult>;
  for (const panel of PANELS) {
    const items = await api.getPanel(panel, user?.accountId ?? "");
    panels[panel] = { status: "ok", items };
  }

  return { user: user as User, panels };
}
