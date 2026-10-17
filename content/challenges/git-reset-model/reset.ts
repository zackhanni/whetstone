import { resolve, type Files, type Repo, type ResetMode } from "./repo";

/**
 * `git reset --<mode> <target>` as a pure function: returns the repo after the reset and leaves
 * the one passed in untouched.
 *
 * Four bugs, in the order worth fixing them:
 *   1. --soft also resets the index, so the undone commit's changes come back unstaged.
 *   2. --mixed also rewrites the working tree, throwing away the edits on disk.
 *   3. --hard wipes untracked files too; git only rewrites the files it tracks.
 *   4. It deletes the "undone" commits — but reset only moves a branch; the old tip must stay
 *      reachable through ORIG_HEAD and the reflog.
 */
export function reset(repo: Repo, mode: ResetMode, target: string): Repo {
  const targetId = resolve(repo, target);
  const oldTip = repo.branches[repo.head];
  const targetFiles: Files = repo.commits[targetId].files;

  // "Undo" the commits between the target and the old tip by removing them.
  const undone: string[] = [];
  for (let id: string | null = oldTip; id !== null && id !== targetId; id = repo.commits[id].parent) {
    undone.push(id);
  }
  const commits = { ...repo.commits };
  for (const id of undone) delete commits[id];

  let index: Files = { ...repo.index };
  let worktree: Files = { ...repo.worktree };

  if (mode === "soft") {
    index = { ...targetFiles };
  }
  if (mode === "mixed") {
    index = { ...targetFiles };
    worktree = { ...targetFiles };
  }
  if (mode === "hard") {
    index = { ...targetFiles };
    worktree = { ...targetFiles };
  }

  return {
    ...repo,
    commits,
    branches: { ...repo.branches, [repo.head]: targetId },
    index,
    worktree,
    reflog: [targetId, ...repo.reflog],
    origHead: oldTip,
  };
}
