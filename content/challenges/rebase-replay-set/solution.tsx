import { resolve, type History } from "./history";

/** Every commit reachable from `start`, through every parent of every merge. */
function reachable(history: History, start: string): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...history.commits[id].parents);
  }
  return seen;
}

/**
 * Which commits does `git rebase <upstream> <branch>` replay, and in what order?
 * Returns commit ids in replay order — the order of the `pick` lines in `git rebase -i`.
 *
 * The set is `git log upstream..branch`: reachable from the branch, not from upstream. Merge
 * commits are dropped, and so is any commit whose change upstream already has. What's left is
 * replayed oldest first, each commit after its parents.
 */
export function commitsToReplay(history: History, upstream: string, branch: string): string[] {
  const inUpstream = reachable(history, resolve(history, upstream));
  const inBranch = reachable(history, resolve(history, branch));

  // Changes upstream has that the branch doesn't — git's "patch already upstream" check.
  const upstreamPatches = new Set<string>();
  for (const id of inUpstream) {
    const patch = history.commits[id].patch;
    if (!inBranch.has(id) && patch !== null) upstreamPatches.add(patch);
  }

  // Post-order walk from the tip: a commit is emitted after its parents (oldest first).
  const ordered: string[] = [];
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id) || inUpstream.has(id)) return;
    visited.add(id);
    for (const parent of history.commits[id].parents) visit(parent);
    ordered.push(id);
  };
  visit(resolve(history, branch));

  return ordered.filter((id) => {
    const commit = history.commits[id];
    const isMerge = commit.parents.length > 1;
    const alreadyUpstream = commit.patch !== null && upstreamPatches.has(commit.patch);
    return !isMerge && !alreadyUpstream;
  });
}
