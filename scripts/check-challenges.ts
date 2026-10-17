import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Challenge } from "../learning/schema";

/**
 * PLAYBOOK Rule 4, checked by machine: for every in-browser challenge, the grader must FAIL
 * against the starter and PASS against solution.tsx. Runs vitest.challenges.config.ts once per
 * variant and reads its JSON report.
 *
 * This is a headless stand-in for Sandpack (happy-dom, not a browser iframe), so a challenge that
 * passes here can still break in the browser — a bundler or module-resolution difference, say.
 * It catches the common failures: a solution that doesn't pass its own tests, a starter with no
 * planted bug left, and a grader that throws before it asserts anything.
 */

const ROOT = process.cwd();
const CHALLENGES = path.join(ROOT, "content", "challenges");

type Variant = "starter" | "solution";
type Assertion = { status: string; fullName: string; failureMessages?: string[] };
type FileReport = { name: string; message?: string; assertionResults: Assertion[] };

/** Run every grader against one variant; return the per-file results. */
async function runVariant(variant: Variant): Promise<FileReport[]> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "whetstone-challenges-"));
  const outputFile = path.join(tmp, `${variant}.json`);
  try {
    const result = spawnSync(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "--config",
        "vitest.challenges.config.ts",
        "--reporter=json",
        `--outputFile=${outputFile}`,
      ],
      {
        cwd: ROOT,
        // NODE_ENV must be "test". Vitest only sets it when it's unset, and Vercel builds run with
        // NODE_ENV=production — which loads React's production build, where act() doesn't exist,
        // so every Testing Library render throws "React.act is not a function".
        env: { ...process.env, NODE_ENV: "test", CHALLENGE_VARIANT: variant },
        encoding: "utf8",
      },
    );
    // Vitest exits non-zero whenever a test fails, which the starter run expects, so the exit
    // code means nothing here. A missing report means Vitest itself broke, or never started
    // (`result.error`, e.g. pnpm not on PATH, with no output to show): say which.
    let raw: string;
    try {
      raw = await fs.readFile(outputFile, "utf8");
    } catch {
      throw new Error(
        `vitest (${variant}) produced no report:\n${result.error?.message ?? (result.stderr || result.stdout)}`,
      );
    }
    return (JSON.parse(raw) as { testResults: FileReport[] }).testResults;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

/** The first line of a test's error, so a build log alone shows why it failed. */
const firstLine = (messages: string[] = []) => (messages[0] ?? "no error message").split("\n")[0];

/** The challenge folder a test file belongs to. */
const slugOf = (file: string) => path.relative(CHALLENGES, file).split(path.sep)[0];

async function main() {
  const slugs: string[] = [];
  for (const entry of await fs.readdir(CHALLENGES, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    let meta: Challenge;
    try {
      meta = Challenge.parse(
        JSON.parse(await fs.readFile(path.join(CHALLENGES, entry.name, "meta.json"), "utf8")),
      );
    } catch {
      continue; // a missing or invalid meta.json is `pnpm validate`'s to report
    }
    if (meta.runner === "in-browser") slugs.push(entry.name);
  }

  const [starter, solution] = [await runVariant("starter"), await runVariant("solution")];
  const resultsFor = (reports: FileReport[], slug: string) =>
    reports.filter((r) => slugOf(r.name) === slug);

  let problems = 0;
  const fail = (m: string) => {
    console.error("  ✗", m);
    problems++;
  };

  for (const slug of slugs.sort()) {
    const runs = { starter: resultsFor(starter, slug), solution: resultsFor(solution, slug) };
    const before = problems;

    for (const [variant, files] of Object.entries(runs)) {
      if (files.length === 0) fail(`${slug} (${variant}): no grader ran`);
      for (const f of files) {
        // A file that throws while loading reports zero assertions; that's a broken grader,
        // not a failing starter.
        if (f.assertionResults.length === 0)
          fail(
            `${slug} (${variant}): ${path.basename(f.name)} ran no tests — ${f.message ?? "no message"}`,
          );
        const skipped = f.assertionResults.filter(
          (a) => a.status !== "passed" && a.status !== "failed",
        );
        if (skipped.length > 0)
          fail(
            `${slug} (${variant}): ${skipped.length} test(s) skipped or todo — a grader runs every test`,
          );
      }
    }

    const all = (v: Variant) => runs[v].flatMap((f) => f.assertionResults);
    const failed = (v: Variant) => all(v).filter((a) => a.status === "failed");

    if (all("starter").length > 0 && failed("starter").length === 0)
      fail(`${slug}: the starter passes every test — the planted bug is gone or untested`);
    for (const a of failed("solution"))
      fail(`${slug}: solution.tsx fails "${a.fullName}" — ${firstLine(a.failureMessages)}`);

    if (problems === before)
      console.log(
        `  ✓ ${slug} — starter fails ${failed("starter").length}/${all("starter").length}, solution passes ${all("solution").length}/${all("solution").length}`,
      );
  }

  console.log(
    problems
      ? `\n${problems} challenge problem(s) found`
      : `\nAll ${slugs.length} in-browser challenges: starter fails, solution passes ✅`,
  );
  process.exit(problems ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
