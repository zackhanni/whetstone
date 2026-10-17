import { matchesAny } from "./glob";
import type { GitEvent, GroupState, Triggers } from "./workflow";

/**
 * A dry run of GitHub Actions: will this workflow start for this event, what happens when runs
 * pile up in one concurrency group, and how many minutes does a run bill? Five bugs, in the
 * order worth fixing them:
 *   1. A pull_request `branches` filter is checked against the PR's own branch.
 *   2. Any pull_request activity starts the workflow, so retargeting a PR looks like it re-runs CI.
 *   3. `paths-ignore` skips the run when ANY changed file is ignored.
 *   4. A new run arriving at a busy group is dropped instead of replacing the one that's waiting.
 *   5. Billed minutes are rounded once for the whole run instead of once per job.
 */

export function shouldRun(on: Triggers, event: GitEvent): boolean {
  if (event.kind === "push") {
    const filters = on.push;
    if (!filters) return false;
    if (filters.branches && !matchesAny(event.branch, filters.branches)) return false;
    return pathsAllow(filters, event.changedFiles);
  }

  const filters = on.pull_request;
  if (!filters) return false;
  if (filters.branches && !matchesAny(event.head, filters.branches)) return false;
  return pathsAllow(filters, event.changedFiles);
}

function pathsAllow(filters: { paths?: string[]; pathsIgnore?: string[] }, files: string[]): boolean {
  if (filters.paths) return files.some((file) => matchesAny(file, filters.paths ?? []));
  if (filters.pathsIgnore) return !files.some((file) => matchesAny(file, filters.pathsIgnore ?? []));
  return true;
}

/** A new run joins the group. Returns the group's next state; never mutates `group`. */
export function queueRun(group: GroupState, runId: string): GroupState {
  if (group.running === null) return { ...group, running: runId };
  if (group.pending === null) return { ...group, pending: runId };
  return { ...group, cancelled: [...group.cancelled, runId] };
}

/** The running run finished: the waiting one, if any, starts. */
export function finishRunning(group: GroupState): GroupState {
  return { ...group, running: group.pending, pending: null };
}

/** Minutes billed for one workflow run on GitHub-hosted runners, given each job's duration. */
export function billedMinutes(jobSeconds: number[]): number {
  const total = jobSeconds.reduce((sum, seconds) => sum + seconds, 0);
  return Math.ceil(total / 60);
}
