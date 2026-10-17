/**
 * A tiny model of a git repository: just enough to reason about `git reset`.
 *
 * Read-only support file — `reset` lives in reset.ts. `status()` below prints the same lines as
 * `git status --short`, so you can compare the model with a real repo line for line.
 */

/** path → file contents. A commit's snapshot, the index and the working tree are each one. */
export type Files = Record<string, string>;

export type Commit = {
  id: string;
  parent: string | null;
  message: string;
  files: Files; // the full snapshot of every tracked file, not a diff
};

export type Repo = {
  commits: Record<string, Commit>; // the object store: every commit ever made
  branches: Record<string, string>; // branch name → commit id
  head: string; // the branch HEAD is attached to (this model never detaches HEAD)
  index: Files; // the staging area: the next commit, as built so far
  worktree: Files; // the files on disk
  reflog: string[]; // every commit HEAD has pointed at, newest first (HEAD@{0}, HEAD@{1}, …)
  origHead: string | null; // ORIG_HEAD: where HEAD was before the last reset
};

export type ResetMode = "soft" | "mixed" | "hard";

/** The commit the current branch points at. */
export function headCommit(repo: Repo): Commit {
  return repo.commits[repo.branches[repo.head]];
}

/** Resolves "HEAD", "HEAD~n", a branch name or a commit id to a commit id. */
export function resolve(repo: Repo, rev: string): string {
  const tilde = /^HEAD(?:~(\d+))?$/.exec(rev);
  if (tilde) {
    let id = repo.branches[repo.head];
    for (let n = Number(tilde[1] ?? 0); n > 0; n--) {
      const parent = repo.commits[id].parent;
      if (parent === null) throw new Error(`fatal: ambiguous argument '${rev}'`);
      id = parent;
    }
    return id;
  }
  if (rev in repo.branches) return repo.branches[rev];
  if (rev in repo.commits) return rev;
  throw new Error(`fatal: ambiguous argument '${rev}'`);
}

/**
 * `git status --short`: X compares HEAD with the index, Y compares the index with the working
 * tree. Tracked paths first, then untracked ones (`??`), each group sorted by path.
 */
export function status(repo: Repo): string[] {
  const head = headCommit(repo).files;
  const { index, worktree } = repo;
  const tracked = [...new Set([...Object.keys(head), ...Object.keys(index)])].sort();

  const lines: string[] = [];
  for (const path of tracked) {
    let x = " ";
    if (!(path in head)) x = "A";
    else if (!(path in index)) x = "D";
    else if (head[path] !== index[path]) x = "M";

    let y = " ";
    if (path in index) {
      if (!(path in worktree)) y = "D";
      else if (index[path] !== worktree[path]) y = "M";
    }
    if (x !== " " || y !== " ") lines.push(`${x}${y} ${path}`);
  }

  const untracked = Object.keys(worktree)
    .filter((path) => !(path in index))
    .sort();
  return [...lines, ...untracked.map((path) => `?? ${path}`)];
}

/**
 * The repo the tests start from:
 *   c1 "First"   a.txt = "a1"
 *   c2 "Second"  a.txt = "a2", b.txt = "b"     ← main, HEAD
 * plus scratch.txt, an untracked file in the working tree.
 */
export function demoRepo(): Repo {
  const first: Commit = { id: "c1", parent: null, message: "First", files: { "a.txt": "a1" } };
  const second: Commit = {
    id: "c2",
    parent: "c1",
    message: "Second",
    files: { "a.txt": "a2", "b.txt": "b" },
  };
  return {
    commits: { c1: first, c2: second },
    branches: { main: "c2" },
    head: "main",
    index: { "a.txt": "a2", "b.txt": "b" },
    worktree: { "a.txt": "a2", "b.txt": "b", "scratch.txt": "notes" },
    reflog: ["c2", "c1"],
    origHead: null,
  };
}
