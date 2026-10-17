import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium, errors, type Page } from "playwright-core";

/**
 * The browser half of PLAYBOOK Rule 4: open each challenge in the real Sandpack runner, press
 * _Run tests_ on the starter (at least one test must fail), then _Show solution_ (every test
 * must pass). `pnpm test:challenges` proves the same thing in happy-dom; this proves it in the
 * iframe learners actually use — module resolution, declared `dependencies`, Web Crypto, timers.
 *
 * Needs the dev server (`pnpm dev`, or BASE_URL for another one) and Google Chrome installed —
 * it drives the system Chrome through playwright-core, so nothing is downloaded. Not part of
 * `pnpm check`: it needs a running server and the network (Sandpack's bundler is remote).
 *
 *   pnpm test:challenges:browser                      # every challenge a unit references
 *   pnpm test:challenges:browser date-only-helpers    # just these slugs
 *
 * Runs headless, so the page is never a background tab: Chrome throttles a hidden tab's timers
 * to about once a second, which makes timer-based graders time out for no real reason.
 */

const ROOT = process.cwd();
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3002";

/** challengeSlug -> the unit page that hosts it, read from every unit.json. */
async function challengePages(): Promise<Map<string, string>> {
  const pages = new Map<string, string>();
  const tracksDir = path.join(ROOT, "content", "tracks");
  for (const track of await fs.readdir(tracksDir)) {
    const unitsDir = path.join(tracksDir, track, "units");
    let units: string[];
    try {
      units = await fs.readdir(unitsDir);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw e;
    }
    for (const unit of units) {
      const raw = await fs.readFile(path.join(unitsDir, unit, "unit.json"), "utf8");
      const blocks = (JSON.parse(raw) as { blocks: { type: string; challengeSlug?: string }[] }).blocks;
      for (const b of blocks)
        if (b.type === "challenge" && b.challengeSlug) pages.set(b.challengeSlug, `/learn/${track}/${unit}`);
    }
  }
  return pages;
}

type Summary = { failed: number; passed: number; total: number } | null;

/** Waits for the Sandpack test panel's "Tests: … total" line and parses it. */
async function readSummary(page: Page, timeoutMs = 120_000): Promise<Summary> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await page.evaluate(
      () => (Array.from(document.querySelectorAll(".sp-layout > *")).pop() as HTMLElement | undefined)?.innerText ?? "",
    );
    const line = text.match(/Tests:?\s*([^\n]*total)/i)?.[1];
    if (line) {
      const count = (word: string) => Number(line.match(new RegExp(`(\\d+) ${word}`))?.[1] ?? 0);
      return { failed: count("failed"), passed: count("passed"), total: count("total") };
    }
    await page.waitForTimeout(1000);
  }
  return null;
}

const clickButton = (page: Page, label: string) =>
  page.evaluate((text) => {
    const button = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.trim() === text);
    if (!button) throw new Error(`no "${text}" button on the page`);
    button.scrollIntoView({ block: "center" });
    button.click();
  }, label);

/**
 * Waits for the "Run tests" button; false if it doesn't render within `timeoutMs`. The runner is
 * client-only (`ssr: false`), so its buttons appear some time after `load`.
 *
 * Don't scroll the runner into view or wait for Sandpack to start before pressing it. Sandpack
 * starts only when the runner nears the viewport, and in headless Chrome a press made after the
 * preview has loaded leaves the tests panel empty. The press itself scrolls the runner into view,
 * so Sandpack starts with the tests panel already mounted, and that run reports. The short pause
 * after the button appears is what the script always used; a press right after render was dropped.
 */
async function waitForRunner(page: Page, timeoutMs = 120_000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll("button")).some((b) => b.innerText.trim() === "Run tests"),
      undefined,
      { timeout: timeoutMs },
    );
  } catch (e) {
    if (e instanceof errors.TimeoutError) return false;
    throw e;
  }
  await page.waitForTimeout(4000);
  return true;
}

async function checkOne(page: Page, slug: string, route: string): Promise<string | null> {
  await page.goto(BASE_URL + route, { waitUntil: "load" });
  if (!(await waitForRunner(page))) return `${slug}: the runner never rendered its "Run tests" button`;
  await clickButton(page, "Run tests");
  const starter = await readSummary(page);
  await clickButton(page, "Show solution");
  // The same render that relabels the button remounts Sandpack with the solution, so once the
  // label reads "Reset to starter" the starter's results are gone and can't be read as the solution's.
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("button")).some((b) => b.innerText.trim() === "Reset to starter"),
  );
  const solution = await readSummary(page);

  const fmt = (s: Summary) => (s ? `${s.failed} failed / ${s.passed} passed` : "no result");
  console.log(`  ${slug}: starter ${fmt(starter)} · solution ${fmt(solution)}`);
  if (!starter || starter.failed === 0) return `${slug}: the starter must fail at least one test in Sandpack`;
  if (!solution || solution.failed > 0 || solution.passed !== solution.total)
    return `${slug}: the solution must pass every test in Sandpack`;
  return null;
}

async function main() {
  const pages = await challengePages();
  const wanted = process.argv.slice(2);
  for (const slug of wanted) if (!pages.has(slug)) throw new Error(`no unit references challenge "${slug}"`);
  const slugs = wanted.length ? wanted : [...pages.keys()].sort();

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const problems: string[] = [];
  try {
    for (const slug of slugs) {
      const problem = await checkOne(page, slug, pages.get(slug)!);
      if (problem) problems.push(problem);
    }
  } finally {
    await browser.close();
  }

  if (problems.length) {
    console.error(`\n${problems.length} challenge(s) failed in Sandpack:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`\nAll ${slugs.length} challenge(s): starter fails, solution passes in Sandpack ✅`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
