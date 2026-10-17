import { resolve, type History } from "./history";

/**
 * Which commits does `git rebase <upstream> <branch>` replay, and in what order?
 * Returns commit ids in replay order — the order of the `pick` lines in `git rebase -i`.
 *
 * Four bugs, in the order worth fixing them:
 *   1. "What upstream has" follows only first parents, so a commit merged into upstream through
 *      a merge commit's second parent looks new and gets replayed again.
 *   2. The result is in walk order — newest first, like `git log` — but a rebase replays the
 *      oldest commit first.
 *   3. Merge commits are kept; a plain rebase drops them and replays a linear history.
 *   4. A commit whose change upstream already has (same `patch`) is replayed again; git skips it.
 */
export function commitsToReplay(history: History, upstream: string, branch: string): string[] {
  // Everything upstream already has.
  const inUpstream = new Set<string>();
  let id: string | undefined = resolve(history, upstream);
  while (id !== undefined) {
    inUpstream.add(id);
    id = history.commits[id].parents[0];
  }

  // Walk back from the branch tip, collecting what upstream doesn't have.
  const found: string[] = [];
  const seen = new Set<string>();
  const stack = [resolve(history, branch)];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (seen.has(current) || inUpstream.has(current)) continue;
    seen.add(current);
    found.push(current);
    stack.push(...history.commits[current].parents);
  }

  return found;
}
