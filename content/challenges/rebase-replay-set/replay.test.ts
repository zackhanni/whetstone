import { commitsToReplay } from "./replay";
import { makeHistory } from "./history";

// Each history below was also built in a real repo, and the expected ids match the `pick` lines
// `git rebase -i` (Git 2.50) proposed for it.

const sorted = (ids: string[]) => [...ids].sort().join(",");

describe("commitsToReplay", () => {
  it("skips commits upstream already has through a merge commit's second parent", () => {
    // feature-b was stacked on feature-a; main then merged feature-a with a merge commit.
    const history = makeHistory(
      [
        ["Base", []],
        ["A1", ["Base"]],
        ["B1", ["A1"]],
        ["M1", ["Base"]],
        ["Merge-A", ["M1", "A1"]],
      ],
      { main: "Merge-A", "feature-a": "A1", "feature-b": "B1" },
    );
    expect(sorted(commitsToReplay(history, "main", "feature-b"))).toBe("B1");
  });

  it("lists the commits oldest first, in the order they're replayed", () => {
    const history = makeHistory(
      [
        ["Base", []],
        ["F1", ["Base"]],
        ["F2", ["F1"]],
        ["F3", ["F2"]],
      ],
      { main: "Base", feature: "F3" },
    );
    expect(commitsToReplay(history, "main", "feature").join(",")).toBe("F1,F2,F3");
  });

  it("drops merge commits: the rebased branch comes out linear", () => {
    // feature merged main in once; main has moved on since.
    const history = makeHistory(
      [
        ["Base", []],
        ["M1", ["Base"]],
        ["F1", ["Base"]],
        ["Merge-main", ["F1", "M1"]],
        ["F2", ["Merge-main"]],
        ["M2", ["M1"]],
      ],
      { main: "M2", feature: "F2" },
    );
    expect(sorted(commitsToReplay(history, "main", "feature"))).toBe("F1,F2");
  });

  it("skips a commit whose change upstream already has (a one-commit squash merge)", () => {
    // feature-a was one commit, A1; main squash-merged it as S, which makes the same change.
    const history = makeHistory(
      [
        ["Base", []],
        ["A1", ["Base"], "add a.txt"],
        ["B1", ["A1"]],
        ["S", ["Base"], "add a.txt"],
      ],
      { main: "S", "feature-a": "A1", "feature-b": "B1" },
    );
    expect(sorted(commitsToReplay(history, "main", "feature-b"))).toBe("B1");
  });

  it("still replays a change that only matches a commit both sides already share", () => {
    // main added flag.txt in X and reverted it; feature re-applies X's change. Only commits main
    // gained since the split (here M1) count as "already upstream", so X-again is replayed.
    const history = makeHistory(
      [
        ["Base", []],
        ["X", ["Base"], "add flag.txt"],
        ["Revert-X", ["X"], "remove flag.txt"],
        ["X-again", ["Revert-X"], "add flag.txt"],
        ["M1", ["Revert-X"]],
      ],
      { main: "M1", feature: "X-again" },
    );
    expect(sorted(commitsToReplay(history, "main", "feature"))).toBe("X-again");
  });

  it("replays a multi-commit squash-merged base again, because the squash is a new commit", () => {
    const history = makeHistory(
      [
        ["Base", []],
        ["A1", ["Base"], "add a.txt"],
        ["A2", ["A1"], "tweak a.txt"],
        ["B1", ["A2"]],
        ["S", ["Base"], "add a.txt + tweak a.txt"],
      ],
      { main: "S", "feature-a": "A2", "feature-b": "B1" },
    );
    expect(sorted(commitsToReplay(history, "main", "feature-b"))).toBe("A1,A2,B1");
  });

  it("with the old base as upstream (rebase --onto main feature-a) replays only the branch's own commit", () => {
    const history = makeHistory(
      [
        ["Base", []],
        ["A1", ["Base"], "add a.txt"],
        ["A2", ["A1"], "tweak a.txt"],
        ["B1", ["A2"]],
        ["S", ["Base"], "add a.txt + tweak a.txt"],
      ],
      { main: "S", "feature-a": "A2", "feature-b": "B1" },
    );
    expect(commitsToReplay(history, "feature-a", "feature-b").join(",")).toBe("B1");
  });
});
