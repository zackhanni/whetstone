/**
 * A commit graph, reduced to what decides which commits `git rebase` replays.
 *
 * Read-only support file — `commitsToReplay` lives in replay.ts.
 */

export type Commit = {
  id: string;
  parents: string[]; // [] for a root commit, two ids for a merge commit
  message: string;
  /**
   * Stands in for git's patch-id: two commits with the same `patch` make the same change
   * (a cherry-pick, or a one-commit branch squash-merged elsewhere). `null` for merge commits.
   */
  patch: string | null;
};

export type History = {
  commits: Record<string, Commit>;
  branches: Record<string, string>; // branch name → commit id
};

/** A branch name or a commit id → a commit id. */
export function resolve(history: History, rev: string): string {
  if (rev in history.branches) return history.branches[rev];
  if (rev in history.commits) return rev;
  throw new Error(`fatal: invalid upstream '${rev}'`);
}

/** Builds a History from compact rows: [id, parents, patch?]. The message is the id. */
export function makeHistory(
  rows: Array<[string, string[], string?]>,
  branches: Record<string, string>,
): History {
  const commits: Record<string, Commit> = {};
  for (const [id, parents, patch] of rows) {
    commits[id] = {
      id,
      parents,
      message: id,
      patch: parents.length > 1 ? null : (patch ?? `change from ${id}`),
    };
  }
  return { commits, branches };
}
