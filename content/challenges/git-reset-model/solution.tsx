import { resolve, type Files, type Repo, type ResetMode } from "./repo";

/**
 * `git reset --<mode> <target>` as a pure function: returns the repo after the reset and leaves
 * the one passed in untouched.
 *
 * Every mode moves the branch HEAD is attached to. The mode only decides how far the reset
 * reaches after that:
 *   --soft   branch                         (index and working tree untouched)
 *   --mixed  branch + index                 (the default)
 *   --hard   branch + index + working tree  (tracked files only)
 */
export function reset(repo: Repo, mode: ResetMode, target: string): Repo {
  const targetId = resolve(repo, target);
  const oldTip = repo.branches[repo.head];
  const targetFiles: Files = repo.commits[targetId].files;

  // --mixed and --hard: the index becomes the target commit's snapshot.
  const index: Files = mode === "soft" ? { ...repo.index } : { ...targetFiles };

  // --hard: rewrite the files git tracks. A path that's in neither the index nor the target is
  // untracked, and git leaves it alone (`git clean` is the command that removes those).
  let worktree: Files = { ...repo.worktree };
  if (mode === "hard") {
    worktree = {};
    for (const [path, contents] of Object.entries(repo.worktree)) {
      const untracked = !(path in repo.index) && !(path in targetFiles);
      if (untracked) worktree[path] = contents;
    }
    Object.assign(worktree, targetFiles);
  }

  // Reset never deletes a commit: it moves a branch, and records where it was.
  return {
    ...repo,
    branches: { ...repo.branches, [repo.head]: targetId },
    index,
    worktree,
    reflog: [targetId, ...repo.reflog],
    origHead: oldTip,
  };
}
