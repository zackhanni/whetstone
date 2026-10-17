import { matchesAny } from "./glob";
import type { GitEvent, GroupState, PullRequestActivity, Triggers } from "./workflow";

/** What `on: pull_request` listens for when the workflow doesn't list `types`. */
const DEFAULT_PR_ACTIVITY: PullRequestActivity[] = ["opened", "synchronize", "reopened"];

export function shouldRun(on: Triggers, event: GitEvent): boolean {
  if (event.kind === "push") {
    const filters = on.push;
    if (!filters) return false;
    if (filters.branches && !matchesAny(event.branch, filters.branches)) return false;
    return pathsAllow(filters, event.changedFiles);
  }

  const filters = on.pull_request;
  if (!filters) return false;
  // Changing a PR's base branch is an `edited` event, which isn't a default type — so a PR
  // retargeted onto main doesn't start main's CI until something pushes to it or it's reopened.
  if (!(filters.types ?? DEFAULT_PR_ACTIVITY).includes(event.activity)) return false;
  // `branches` on pull_request means "PRs that TARGET these branches": match the base. A PR
  // stacked on another feature branch never matches `branches: [main]`.
  if (filters.branches && !matchesAny(event.base, filters.branches)) return false;
  return pathsAllow(filters, event.changedFiles);
}

function pathsAllow(filters: { paths?: string[]; pathsIgnore?: string[] }, files: string[]): boolean {
  // `paths`: run if at least one changed file matches.
  if (filters.paths) return files.some((file) => matchesAny(file, filters.paths ?? []));
  // `paths-ignore`: skip only when EVERY changed file matches — one file outside the
  // ignored patterns is enough to run.
  if (filters.pathsIgnore) return !files.every((file) => matchesAny(file, filters.pathsIgnore ?? []));
  return true;
}

/** A new run joins the group. Returns the group's next state; never mutates `group`. */
export function queueRun(group: GroupState, runId: string): GroupState {
  if (group.running === null) return { ...group, running: runId };
  // At most one run waits. A newer run doesn't queue behind it; it takes its place, and the
  // older waiting run is cancelled — newest commit wins.
  const cancelled = group.pending === null ? group.cancelled : [...group.cancelled, group.pending];
  return { ...group, pending: runId, cancelled };
}

/** The running run finished: the waiting one, if any, starts. */
export function finishRunning(group: GroupState): GroupState {
  return { ...group, running: group.pending, pending: null };
}

/** Minutes billed for one workflow run on GitHub-hosted runners, given each job's duration. */
export function billedMinutes(jobSeconds: number[]): number {
  // GitHub rounds each JOB up to a whole minute, so four 40-second jobs bill 4 minutes, not 3.
  return jobSeconds.reduce((sum, seconds) => sum + Math.ceil(seconds / 60), 0);
}
