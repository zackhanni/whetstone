import { billedMinutes, finishRunning, queueRun, shouldRun } from "./ci-planner";
import { emptyGroup, type PullRequestEvent, type Triggers } from "./workflow";

// on:
//   pull_request:
//     branches: [main]
//     paths-ignore: ["docs/**", "**/*.md"]
//   push:
//     branches: [main]
const ci: Triggers = {
  pull_request: { branches: ["main"], pathsIgnore: ["docs/**", "**/*.md"] },
  push: { branches: ["main"] },
};

const pr = (overrides: Partial<PullRequestEvent>): PullRequestEvent => ({
  kind: "pull_request",
  activity: "synchronize",
  base: "main",
  head: "feature/login",
  changedFiles: ["src/login.ts"],
  ...overrides,
});

describe("shouldRun — branches", () => {
  it("runs for a push to main and not for a push to a feature branch", () => {
    expect(shouldRun(ci, { kind: "push", branch: "main", changedFiles: ["src/a.ts"] })).toBe(true);
    expect(shouldRun(ci, { kind: "push", branch: "feature/login", changedFiles: ["src/a.ts"] })).toBe(false);
  });

  it("matches a pull request's branches filter against the branch it targets", () => {
    expect(shouldRun(ci, pr({ base: "main", head: "feature/login" }))).toBe(true);
    // A PR stacked on another feature branch never matches `branches: [main]`.
    expect(shouldRun(ci, pr({ base: "feature/login", head: "feature/login-ui" }))).toBe(false);
    // Only the target counts: a PR *from* main into a release branch doesn't match either.
    expect(shouldRun(ci, pr({ base: "release/1.2", head: "main" }))).toBe(false);
  });
});

describe("shouldRun — pull request activity", () => {
  // No branch or path filters here, so only the activity rule decides.
  const anyPr: Triggers = { pull_request: {} };

  it("does not run when a PR is only edited or retargeted, unless the workflow lists `edited`", () => {
    const retargetedOntoMain = pr({ activity: "edited", base: "main", head: "feature/login-ui" });
    expect(shouldRun(anyPr, retargetedOntoMain)).toBe(false);

    const withEdited: Triggers = { pull_request: { types: ["opened", "synchronize", "reopened", "edited"] } };
    expect(shouldRun(withEdited, retargetedOntoMain)).toBe(true);
  });

  it("runs for opened, synchronize and reopened by default", () => {
    expect(shouldRun(anyPr, pr({ activity: "opened" }))).toBe(true);
    expect(shouldRun(anyPr, pr({ activity: "synchronize" }))).toBe(true);
    expect(shouldRun(anyPr, pr({ activity: "reopened" }))).toBe(true);
  });
});

describe("shouldRun — paths", () => {
  // No branch filter here, so only the path rules decide.
  const docsIgnored: Triggers = { pull_request: { pathsIgnore: ["docs/**", "**/*.md"] } };

  it("skips a PR whose every changed file is ignored", () => {
    expect(shouldRun(docsIgnored, pr({ changedFiles: ["docs/setup.md", "README.md"] }))).toBe(false);
  });

  it("runs a PR that changes one ignored file and one real file", () => {
    expect(shouldRun(docsIgnored, pr({ changedFiles: ["docs/setup.md", "src/login.ts"] }))).toBe(true);
  });

  it("runs a `paths` workflow when at least one changed file matches", () => {
    const api: Triggers = { push: { paths: ["api/**"] } };
    expect(shouldRun(api, { kind: "push", branch: "main", changedFiles: ["web/a.tsx", "api/b.ts"] })).toBe(true);
    expect(shouldRun(api, { kind: "push", branch: "main", changedFiles: ["web/a.tsx"] })).toBe(false);
  });
});

describe("queueRun — one concurrency group", () => {
  it("runs the first arrival and keeps the second waiting", () => {
    const group = queueRun(queueRun(emptyGroup(), "run-1"), "run-2");
    expect(`${group.running}|${group.pending}|${group.cancelled.join(",")}`).toBe("run-1|run-2|");
  });

  it("cancels the waiting run when a newer one arrives, so the newest commit is the one that runs next", () => {
    let group = emptyGroup();
    for (const id of ["run-1", "run-2", "run-3", "run-4"]) group = queueRun(group, id);
    expect(`${group.running}|${group.pending}|${group.cancelled.join(",")}`).toBe("run-1|run-4|run-2,run-3");

    group = finishRunning(group);
    expect(`${group.running}|${group.pending}`).toBe("run-4|null");
  });
});

describe("billedMinutes", () => {
  it("bills one 25-second job as a whole minute", () => {
    expect(billedMinutes([25])).toBe(1);
  });

  it("rounds each job up separately: four 40-second jobs bill 4 minutes", () => {
    expect(billedMinutes([40, 40, 40, 40])).toBe(4);
    expect(billedMinutes([160])).toBe(3); // the same work as one job
  });
});
