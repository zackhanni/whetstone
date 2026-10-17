import { reset } from "./reset";
import { demoRepo, headCommit, status } from "./repo";

// The expected status lines are what real git (2.50) printed for the same repo:
// a.txt "a1" → "a2" and a new b.txt in the second commit, plus an untracked scratch.txt.

describe("git reset", () => {
  it("moves the current branch to the target and keeps HEAD on that branch", () => {
    for (const mode of ["soft", "mixed", "hard"] as const) {
      const after = reset(demoRepo(), mode, "HEAD~1");
      expect(after.head).toBe("main");
      expect(after.branches.main).toBe("c1");
      expect(headCommit(after).message).toBe("First");
    }
  });

  it("--soft leaves the index alone, so the undone commit's changes are staged", () => {
    const after = reset(demoRepo(), "soft", "HEAD~1");
    expect(status(after).join(" | ")).toBe("M  a.txt | A  b.txt | ?? scratch.txt");
    expect(after.worktree["a.txt"]).toBe("a2");
  });

  it("--mixed resets the index but leaves the working tree alone", () => {
    const after = reset(demoRepo(), "mixed", "HEAD~1");
    expect(status(after).join(" | ")).toBe(" M a.txt | ?? b.txt | ?? scratch.txt");
    expect(after.worktree["a.txt"]).toBe("a2");
    expect(after.worktree["b.txt"]).toBe("b");
  });

  it("--hard makes the index and tracked files match the target", () => {
    const after = reset(demoRepo(), "hard", "HEAD~1");
    expect(after.index["a.txt"]).toBe("a1");
    expect(after.worktree["a.txt"]).toBe("a1");
    expect("b.txt" in after.index).toBe(false);
    expect("b.txt" in after.worktree).toBe(false);
  });

  it("--hard leaves untracked files in the working tree", () => {
    const after = reset(demoRepo(), "hard", "HEAD~1");
    expect(after.worktree["scratch.txt"]).toBe("notes");
    expect(status(after).join(" | ")).toBe("?? scratch.txt");
  });

  it("--hard HEAD throws away staged and unstaged work, including a newly added file", () => {
    const repo = demoRepo();
    repo.worktree["a.txt"] = "a2-edited";
    repo.index["c.txt"] = "new";
    repo.worktree["c.txt"] = "new";
    const after = reset(repo, "hard", "HEAD");
    expect(after.worktree["a.txt"]).toBe("a2");
    expect("c.txt" in after.worktree).toBe(false);
    expect("c.txt" in after.index).toBe(false);
  });

  it("never deletes a commit: ORIG_HEAD and the reflog lead back to the old tip", () => {
    const after = reset(demoRepo(), "hard", "HEAD~1");
    expect(after.origHead).toBe("c2");
    expect(after.reflog.slice(0, 2).join(",")).toBe("c1,c2");
    expect(after.commits.c2?.message).toBe("Second");

    // The undo: `git reset --hard ORIG_HEAD`.
    const undone = reset(after, "hard", after.origHead ?? "missing");
    expect(undone.branches.main).toBe("c2");
    expect(undone.worktree["b.txt"]).toBe("b");
  });

  it("returns a new repo and leaves the one it was given unchanged", () => {
    const repo = demoRepo();
    const before = JSON.stringify(repo);
    reset(repo, "hard", "HEAD~1");
    expect(JSON.stringify(repo)).toBe(before);
  });
});
