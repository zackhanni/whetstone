/**
 * The parts of a GitHub Actions workflow and its triggering event that decide whether a run
 * starts, gets cancelled, and what it costs. Field names follow the YAML (`paths-ignore` becomes
 * `pathsIgnore`).
 *
 * Read-only support file — the logic lives in ci-planner.ts.
 */

export type Filters = {
  branches?: string[]; // glob patterns; see glob.ts
  paths?: string[];
  pathsIgnore?: string[];
};

/** The `on:` section — only the two events this challenge models. */
export type Triggers = {
  push?: Filters;
  pull_request?: Filters & {
    types?: PullRequestActivity[]; // when omitted: opened, synchronize, reopened
  };
};

export type PullRequestActivity = "opened" | "synchronize" | "reopened" | "edited" | "closed";

export type PushEvent = {
  kind: "push";
  branch: string; // the branch that was pushed to
  changedFiles: string[];
};

export type PullRequestEvent = {
  kind: "pull_request";
  activity: PullRequestActivity; // "edited" covers a title/body change AND a changed base branch
  base: string; // the branch the PR wants to merge INTO
  head: string; // the PR's own branch
  changedFiles: string[];
};

export type GitEvent = PushEvent | PullRequestEvent;

/** One concurrency group, `cancel-in-progress` unset and the default `queue: single`. */
export type GroupState = {
  running: string | null; // at most one run executes
  pending: string | null; // at most one run waits
  cancelled: string[]; // every run this group has cancelled, oldest first
};

export const emptyGroup = (): GroupState => ({ running: null, pending: null, cancelled: [] });
