import { promises as fs } from "fs";
import path from "path";
import { ZodError } from "zod";
import { Catalog, Challenge, Track, Unit } from "./schema";
import { Taxonomy, TAXONOMY, TAXONOMY_SLUGS } from "./taxonomy";
import { RUNNER_DEPENDENCIES, SANDBOX_PACKAGES } from "./sandbox";
import { parseFrontmatter } from "../lib/frontmatter";

/**
 * Every content check that needs the filesystem — the schema (learning/schema.ts) covers what a
 * single JSON file can get wrong; this covers what only shows up across files and folders.
 * `scripts/validate.ts` (`pnpm validate`) prints the report; `validate-content.test.ts` runs it
 * against small broken fixtures so no check can be disabled without a test failing.
 *
 * Kept free of `@/` imports so the tsx-run CLI can load it.
 */

export type ReportLine = { kind: "info" | "error" | "warning"; text: string };

/** Lines in the order they were found, so the CLI can print errors under their unit. */
export type ValidationReport = {
  lines: ReportLine[];
  errors: string[];
  warnings: string[];
};

const TIERS = ["simple", "medium", "complex"] as const;

/** Mutable state for one run, threaded through the checks below. */
type Run = {
  root: string;
  report: ValidationReport;
  /** Every skill referenced by content that resolves in the taxonomy, for the orphan check. */
  referencedTags: Set<string>;
};

const info = (run: Run, text: string) => run.report.lines.push({ kind: "info", text });
const fail = (run: Run, text: string) => {
  run.report.lines.push({ kind: "error", text });
  run.report.errors.push(text);
};
const warn = (run: Run, text: string) => {
  run.report.lines.push({ kind: "warning", text });
  run.report.warnings.push(text);
};

/**
 * One line per problem. A ZodError's own `.message` is a JSON dump of every issue, which buries
 * the field path and the reason in escaped quotes; `blocks.1.questions.0.answer: …` reads at a
 * glance. Anything else (a JSON syntax error, a missing file) keeps its message.
 */
function describe(e: unknown): string {
  if (e instanceof ZodError)
    return e.issues
      .map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`)
      .join("; ");
  return (e as Error).message;
}

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

/** Names of the subdirectories of `dir` (a stray file such as .DS_Store is not a track/unit). */
async function subdirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

/** Every file under `dir`, as paths relative to it. Challenge folders may nest. */
async function walk(dir: string, prefix = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name), rel)));
    else out.push(rel);
  }
  return out;
}

function checkSkills(run: Run, label: string, skills: string[]) {
  for (const s of skills) {
    if (!TAXONOMY_SLUGS.has(s))
      fail(run, `${label}: skill "${s}" is not in the taxonomy (learning/taxonomy.ts)`);
    else run.referencedTags.add(s);
  }
}

/**
 * `src` with its comments blanked out, so a word like `from "the server"` in a comment can't be
 * read as an import. Strings and template literals are copied through untouched (a `//` inside
 * a URL string is not a comment). Newlines are kept so line-based checks still line up.
 */
export function stripComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
    } else if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += src[i++];
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") out += src[i++];
        out += src[i++];
      }
      out += src[i++] ?? "";
    } else {
      out += src[i++];
    }
  }
  return out;
}

/**
 * The names of a grader's tests, in order: the first argument of every `it(…)` / `test(…)`
 * written as a plain string literal.
 */
export function testNames(src: string): string[] {
  const names: string[] = [];
  for (const m of stripComments(src).matchAll(/\b(?:it|test)\s*\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g))
    names.push(m[2]);
  return names;
}

/** Module specifiers imported by a file, in any of the four syntaxes we author with. */
function importedModules(source: string): string[] {
  const src = stripComments(source);
  const specifiers: string[] = [];
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g, // import x from "y" / export * from "y"
    /\bimport\s*["']([^"']+)["']/g, // import "y"
    /\bimport\s*\(\s*["']([^"']+)["']/g, // await import("y")
    /\brequire\s*\(\s*["']([^"']+)["']/g, // require("y")
  ];
  for (const re of patterns) for (const m of src.matchAll(re)) specifiers.push(m[1]);
  return specifiers;
}

/** "@scope/pkg/sub" -> "@scope/pkg"; "react-dom/client" -> "react-dom". */
function packageName(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/**
 * jest-dom's matchers. Sandpack loads no `expect` extensions, so each one is a runtime
 * TypeError in the iframe — assert on plain values (`…textContent`, `…value`, `…disabled`).
 */
const JEST_DOM_MATCHERS = [
  "toBeInTheDocument",
  "toBeVisible",
  "toBeEmptyDOMElement",
  "toBeDisabled",
  "toBeEnabled",
  "toBeInvalid",
  "toBeValid",
  "toBeRequired",
  "toBeChecked",
  "toBePartiallyChecked",
  "toHaveAttribute",
  "toHaveClass",
  "toHaveFocus",
  "toHaveFormValues",
  "toHaveStyle",
  "toHaveTextContent",
  "toHaveValue",
  "toHaveDisplayValue",
  "toHaveDescription",
  "toHaveAccessibleDescription",
  "toHaveAccessibleErrorMessage",
  "toHaveAccessibleName",
  "toHaveErrorMessage",
  "toContainElement",
  "toContainHTML",
];

/**
 * The headless grader (`pnpm test:challenges`) resolves challenge imports from this repo's
 * node_modules, so every package the sandbox installs must also be a devDependency at the SAME
 * exact version — otherwise the headless run passes against a different version than the one
 * the learner's browser loads.
 */
function checkPinnedDevDependency(
  run: Run,
  label: string,
  pkg: string,
  version: string,
  devDependencies: Record<string, string>,
) {
  const installed = devDependencies[pkg];
  if (installed !== version)
    fail(
      run,
      `${label}: "${pkg}" is pinned to ${version} for the sandbox, but package.json devDependencies has ${installed ?? "nothing"} — add it with \`pnpm add -D -E ${pkg}@${version}\``,
    );
}

/**
 * Readings and challenge READMEs are rendered with react-markdown (components/markdown.tsx),
 * NOT compiled as MDX — the `.mdx` extension is historical. A JSX/HTML tag or an
 * `import`/`export` line outside code therefore shows up as literal text on the page. Code is
 * stripped first: tags inside fenced or inline code are fine. `<!--more-->` (the "Go deeper"
 * split) is an HTML comment, not a tag.
 */
function markdownProblem(body: string): string | null {
  const prose = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  const tag = /<\/?[A-Za-z][\w.-]*(?=[\s/>])[^>]*>?/.exec(prose);
  if (tag)
    return `"${tag[0].slice(0, 40)}" outside code — this is Markdown, not MDX, so it renders as literal text; put code in backticks`;
  const mdx = /^\s*(import|export)\s/m.exec(prose);
  if (mdx)
    return `an "${mdx[1]}" line — this is Markdown, not MDX, so it renders as literal text`;
  return null;
}

/**
 * The app renders a challenge's title, its "Your task" heading and the acceptance checklist
 * from meta.json (components/challenge-block.tsx). A README that repeats any of them shows the
 * learner two copies, and the copies drift — three of ten did before this check existed.
 */
function readmeProblems(readme: string): string[] {
  const prose = readme.replace(/```[\s\S]*?```/g, "");
  const problems: string[] = [];
  if (/^#\s/m.test(prose)) problems.push("has a top-level # heading — the title comes from meta.json");
  if (/^\s*[-*]\s+\[[ xX]\]/m.test(prose))
    problems.push("has a - [ ] checklist — the acceptance criteria come from meta.json");
  if (/^#{1,6}\s+your task\b/im.test(prose))
    problems.push('has a "Your task" heading — the app renders that section from meta.json');
  if (/^#{1,6}\s+running\b/im.test(prose))
    problems.push('has a "Running" section — how a challenge runs is the app\'s to say, not each README\'s');
  const markdown = markdownProblem(readme);
  if (markdown) problems.push(markdown);
  return problems;
}

/**
 * The in-browser (Sandpack) challenge contract — see learning/PLAYBOOK.md. These used to be
 * browser-only discoveries: a missing App.tsx or a `vitest` import fails at *runtime*, inside
 * an iframe, long after authoring. Cheap to check here, so check here. Whether the starter
 * fails and the solution passes is `pnpm test:challenges`' job (scripts/check-challenges.ts).
 */
async function checkInBrowserChallenge(
  run: Run,
  slug: string,
  cDir: string,
  entry: string,
  declaredDependencies: Record<string, string>,
  devDependencies: Record<string, string>,
) {
  const label = `challenge ${slug}`;
  // Re-declaring a runner-provided package would silently swap the version every other
  // challenge is tested against, so only genuinely extra packages may be declared.
  for (const [pkg, version] of Object.entries(declaredDependencies)) {
    if (SANDBOX_PACKAGES.has(pkg))
      fail(run, `${label}: meta.json dependencies re-declares "${pkg}", which the runner always provides`);
    else checkPinnedDevDependency(run, label, pkg, version, devDependencies);
  }
  const resolvable = new Set([...SANDBOX_PACKAGES, ...Object.keys(declaredDependencies)]);
  // Sandpack loads the whole folder, nested files included, so scan the whole tree.
  const names = await walk(cDir);
  const read = (n: string) => fs.readFile(path.join(cDir, n), "utf8");

  for (const required of ["App.tsx", "solution.tsx"]) {
    if (!names.includes(required)) fail(run, `${label}: missing ${required} (in-browser contract)`);
  }

  const tests = names.filter((n) => n.endsWith(".test.tsx") || n.endsWith(".test.ts"));
  if (tests.length === 0) fail(run, `${label}: no *.test.tsx grader`);

  // `entry` may be a nested path, so resolve it rather than looking it up in `names`.
  if (names.includes("solution.tsx")) {
    const [starter, solution] = await Promise.all([
      fs.readFile(path.resolve(cDir, entry), "utf8"),
      read("solution.tsx"),
    ]);
    if (starter.trim() === solution.trim())
      fail(run, `${label}: solution.tsx is identical to the starter`);
  }

  // Every file in the folder is loaded into the sandbox, so every file's imports must resolve.
  for (const f of names.filter((n) => /\.(ts|tsx)$/.test(n))) {
    const src = await read(f);
    for (const specifier of importedModules(src)) {
      if (specifier.startsWith(".") || specifier.startsWith("/")) continue;
      const pkg = packageName(specifier);
      if (resolvable.has(pkg)) continue;
      if (pkg === "vitest") {
        fail(run, `${label}/${f}: imports "${specifier}" — Sandpack tests are jest-style globals, not Vitest`);
        continue;
      }
      fail(
        run,
        `${label}/${f}: imports "${specifier}" — the sandbox only resolves ${[...resolvable].join(", ")}; declare it in meta.json "dependencies" or hand-roll a support module`,
      );
    }
  }

  // Sandpack's runner is jest-style, not Vitest, and ships no jest-dom / spies / module mocking.
  const jestDom = new RegExp(`\\.(?:not\\.)?(?:${JEST_DOM_MATCHERS.join("|")})\\s*\\(`);
  for (const t of tests) {
    const src = await read(t);
    // No spy/mock/fake-timer library is loaded: `vi` and `jest` are undefined at runtime, so
    // *any* member access on either throws — don't enumerate, reject the whole namespace.
    if (/\bjest\.mock\s*\(/.test(src)) {
      fail(run, `${label}/${t}: uses jest.mock — unavailable; add a settable seam module instead`);
    } else if (/\bvi\.\w|\bjest\.\w/.test(src)) {
      fail(
        run,
        `${label}/${t}: uses a spy/fake-timer helper (vi.* / jest.*) — unavailable in the sandbox; patch the global by hand or add a settable seam`,
      );
    }
    // Sandpack keys its results list by test name alone (not describe + name), so a repeated
    // name across describe blocks logs a React duplicate-key error and can drop a result row.
    const seen = new Set<string>();
    for (const name of testNames(src)) {
      if (seen.has(name))
        fail(run, `${label}/${t}: two tests are named "${name}" — Sandpack keys its results by test name, so every name in the file must be unique`);
      seen.add(name);
    }
    const matcher = jestDom.exec(src);
    if (matcher)
      fail(
        run,
        `${label}/${t}: uses the jest-dom matcher ${matcher[0].slice(1, -1).trim()} — only plain matchers are available`,
      );
  }
}

/** Validate one challenge folder: meta.json, README.md, its tags, its entry, the runner contract. */
async function checkChallenge(run: Run, slug: string, devDependencies: Record<string, string>) {
  const cDir = path.join(run.root, "content", "challenges", slug);
  let meta: Challenge;
  try {
    meta = Challenge.parse(await readJson(path.join(cDir, "meta.json")));
  } catch (e) {
    fail(run, `challenge ${slug}: ${describe(e)}`);
    return;
  }
  checkSkills(run, `challenge ${slug}`, meta.skills);
  if (meta.slug !== slug) fail(run, `challenge ${slug}: meta.slug "${meta.slug}" does not match folder`);

  let readme: string | null = null;
  try {
    readme = await fs.readFile(path.join(cDir, "README.md"), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    fail(run, `challenge ${slug}: missing README.md (the problem statement and hint)`);
  }
  if (readme !== null)
    for (const problem of readmeProblems(readme)) fail(run, `challenge ${slug}/README.md: ${problem}`);

  // Mirror loadChallenge's contract: meta.entry must resolve inside the challenge dir.
  const base = path.resolve(cDir);
  const entryPath = path.resolve(cDir, meta.entry);
  if (entryPath !== base && !entryPath.startsWith(base + path.sep)) {
    fail(run, `challenge ${slug}: entry "${meta.entry}" escapes the challenge directory`);
    return;
  }
  try {
    await fs.access(entryPath);
  } catch {
    fail(run, `challenge ${slug}: entry file "${meta.entry}" not found`);
    return;
  }
  if (meta.runner === "in-browser") {
    await checkInBrowserChallenge(run, slug, cDir, meta.entry, meta.dependencies ?? {}, devDependencies);
  } else if (meta.dependencies) {
    fail(run, `challenge ${slug}: "dependencies" only applies to runner "in-browser"`);
  }
}

/**
 * One folder of example files — a reading tier or a deck of cards: only numbered `.mdx` files,
 * `id` + `title` frontmatter (unquoted, nothing else), Markdown rather than MDX, ids unique
 * across the unit. Returns the files' bodies so callers can add their own checks.
 */
async function checkExampleFolder(
  run: Run,
  label: string,
  dir: string,
  seenIds: Set<string>,
): Promise<{ file: string; body: string }[]> {
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(dir)).sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  // The loader reads only *.mdx files, so anything else here would silently never render.
  for (const f of entries) {
    if (!f.endsWith(".mdx") && f !== ".DS_Store")
      fail(run, `${label}/${f}: not a .mdx file, so it is never shown`);
  }
  const examples: { file: string; body: string }[] = [];
  for (const f of entries.filter((e) => e.endsWith(".mdx"))) {
    const where = `${label}/${f}`;
    // Examples are ordered by filename; an unnumbered file sorts unpredictably.
    if (!/^\d{2}-/.test(f)) fail(run, `${where}: filename must start with a two-digit number (01-…)`);
    const { data, body } = parseFrontmatter(await fs.readFile(path.join(dir, f), "utf8"));
    if (!data.id || !data.title) fail(run, `${where}: missing id/title frontmatter`);
    for (const [key, value] of Object.entries(data)) {
      if (key !== "id" && key !== "title")
        fail(run, `${where}: frontmatter key "${key}" is not read — only id and title are`);
      // lib/frontmatter.ts is not YAML: quotes are kept as part of the value.
      if (/^(["']).*\1$/.test(value))
        fail(run, `${where}: frontmatter ${key} is wrapped in quotes, which would be shown — drop them`);
    }
    if (data.id) {
      if (seenIds.has(data.id)) fail(run, `${where}: duplicate id "${data.id}" in this unit`);
      seenIds.add(data.id);
    }
    const problem = markdownProblem(body);
    if (problem) fail(run, `${where}: ${problem}`);
    examples.push({ file: f, body });
  }
  return examples;
}

/** Every reading example under one reading block's tier folders. */
async function checkReadingTiers(run: Run, label: string, dir: string, seenIds: Set<string>) {
  for (const tier of TIERS) {
    const examples = await checkExampleFolder(run, `${label}/${tier}`, path.join(dir, tier), seenIds);
    if (examples.length === 0) fail(run, `${label}: reading tier "${tier}" has no examples`);
  }
}

/** A card is one idea and one example; past these it has become a reading example. */
const CARD_MAX_WORDS = 150;
const CARD_MAX_CODE_BLOCKS = 1;

async function checkCards(run: Run, label: string, dir: string, seenIds: Set<string>) {
  const cards = await checkExampleFolder(run, `${label}/cards`, dir, seenIds);
  if (cards.length === 0) fail(run, `${label}: cards block has no card files in ${path.basename(dir)}/`);
  for (const { file, body } of cards) {
    const codeBlocks = body.match(/```[\s\S]*?```/g) ?? [];
    const words = body.replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean).length;
    // A warning, not an error: the limit is a nudge toward the right block type, not a rule.
    if (words > CARD_MAX_WORDS || codeBlocks.length > CARD_MAX_CODE_BLOCKS)
      warn(
        run,
        `${label}/cards/${file}: ${words} words and ${codeBlocks.length} code block(s) — a card is one idea and one example (≤${CARD_MAX_WORDS} words, ≤${CARD_MAX_CODE_BLOCKS} code block); split it, or make it a reading`,
      );
  }
}

/**
 * content/catalog.json lists the tracks in display order. It is the only thing that makes a
 * track visible, so a folder missing from it — or a listed track with no folder — is an error.
 */
async function checkCatalog(run: Run, trackFolders: string[]) {
  let catalog: Catalog;
  try {
    catalog = Catalog.parse(await readJson(path.join(run.root, "content", "catalog.json")));
  } catch (e) {
    fail(run, `content/catalog.json: ${describe(e)}`);
    return;
  }
  const listed = new Set<string>();
  for (const t of catalog.tracks) {
    if (listed.has(t)) fail(run, `content/catalog.json: track "${t}" is listed twice`);
    listed.add(t);
    if (!trackFolders.includes(t))
      fail(run, `content/catalog.json: track "${t}" has no folder in content/tracks/`);
  }
  for (const folder of trackFolders) {
    if (!listed.has(folder))
      fail(run, `content/tracks/${folder} is not in content/catalog.json, so it is never shown`);
  }
}

async function checkTrack(
  run: Run,
  ts: string,
  unitOwner: Map<string, string>,
  challengeSlugs: Set<string>,
  referencedChallenges: Set<string>,
) {
  const tDir = path.join(run.root, "content", "tracks", ts);
  let track: Track;
  try {
    track = Track.parse(await readJson(path.join(tDir, "track.json")));
  } catch (e) {
    fail(run, `track ${ts}: ${describe(e)}`);
    return;
  }
  info(run, `track: ${track.slug}`);
  // The description is rendered as plain text on the cards, so Markdown shows up literally.
  if (/`|\*\*|\]\(/.test(track.description))
    warn(run, `track ${ts}: description contains Markdown (\`, ** or a link), which is shown as literal text`);
  // Links are built from the slug in the JSON and routes from the folder name, so a
  // mismatch builds fine and then 404s.
  if (track.slug !== ts) fail(run, `track ${ts}: slug "${track.slug}" does not match its folder`);

  // track.units is the ONLY thing that makes a unit visible: a folder left out of it is never
  // validated, built or shown.
  const listed = new Set<string>();
  for (const us of track.units) {
    if (listed.has(us)) fail(run, `track ${ts}: unit "${us}" is listed twice`);
    listed.add(us);
  }
  for (const folder of await subdirs(path.join(tDir, "units"))) {
    if (!listed.has(folder))
      fail(run, `track ${ts}: units/${folder} is not in track.json "units", so it is never shown`);
  }

  for (const us of listed) {
    const uDir = path.join(tDir, "units", us);
    // Unit slugs are unique across ALL tracks, so a unit can be addressed by its slug alone
    // (progress, a cross-track feed, ratings) and can move between tracks without a collision.
    const owner = unitOwner.get(us);
    if (owner) fail(run, `unit ${ts}/${us}: slug "${us}" is already used by track ${owner}`);
    unitOwner.set(us, ts);

    let unit: Unit;
    try {
      unit = Unit.parse(await readJson(path.join(uDir, "unit.json")));
    } catch (e) {
      fail(run, `unit ${ts}/${us}: ${describe(e)}`);
      continue;
    }
    if (unit.slug !== us) fail(run, `unit ${ts}/${us}: slug "${unit.slug}" does not match its folder`);
    checkSkills(run, `unit ${ts}/${us}`, unit.skills);

    const readingIds = new Set<string>(); // reading examples and cards share one id space
    for (const b of unit.blocks) {
      if (b.type === "reading") await checkReadingTiers(run, us, path.join(uDir, b.dir), readingIds);
      if (b.type === "cards") await checkCards(run, us, path.join(uDir, b.dir), readingIds);
      if (b.type === "challenge") {
        referencedChallenges.add(b.challengeSlug);
        if (!challengeSlugs.has(b.challengeSlug))
          fail(run, `unit ${ts}/${us}: challenge "${b.challengeSlug}" has no folder in content/challenges/`);
      }
    }
    info(run, `  unit: ${us} — ${unit.blocks.length} blocks ✓`);
  }
}

/** Orphan tags: defined but neither used by content nor an ancestor of a used tag. */
function checkOrphanTags(run: Run) {
  const bySlug = new Map(TAXONOMY.map((n) => [n.slug, n] as const));
  const alive = new Set<string>();
  const markSelfAndAncestors = (slug: string) => {
    if (alive.has(slug)) return;
    alive.add(slug);
    for (const p of bySlug.get(slug)?.parents ?? []) markSelfAndAncestors(p);
  };
  for (const s of run.referencedTags) markSelfAndAncestors(s);
  for (const n of TAXONOMY) {
    // A warning, not an error — a dead branch is worth surfacing, not worth failing.
    if (!alive.has(n.slug))
      warn(run, `taxonomy: tag "${n.slug}" is unused (no content references it or any descendant)`);
  }
}

/** Validate all content under `root` (the repo root: it holds content/ and package.json). */
export async function validateContent(root: string): Promise<ValidationReport> {
  const run: Run = {
    root,
    report: { lines: [], errors: [], warnings: [] },
    referencedTags: new Set(),
  };

  // Structural integrity of the tag registry itself: unique slugs, parents resolve, acyclic.
  try {
    Taxonomy.parse(TAXONOMY);
  } catch (e) {
    fail(run, `taxonomy (learning/taxonomy.ts): ${describe(e)}`);
  }

  const devDependencies: Record<string, string> =
    (await readJson(path.join(root, "package.json"))).devDependencies ?? {};
  for (const [pkg, version] of Object.entries(RUNNER_DEPENDENCIES))
    checkPinnedDevDependency(run, "learning/sandbox.ts", pkg, version, devDependencies);

  const trackFolders = await subdirs(path.join(root, "content", "tracks"));
  await checkCatalog(run, trackFolders);

  const challengeSlugs = new Set(await subdirs(path.join(root, "content", "challenges")));
  const referencedChallenges = new Set<string>();
  const unitOwner = new Map<string, string>();
  for (const ts of trackFolders) await checkTrack(run, ts, unitOwner, challengeSlugs, referencedChallenges);

  // Every challenge folder is validated, referenced or not, so a standalone challenge (such as
  // one imported from the job-test archive before a unit uses it) is still held to the contract.
  for (const slug of challengeSlugs) {
    await checkChallenge(run, slug, devDependencies);
    if (!referencedChallenges.has(slug))
      warn(run, `challenge ${slug}: no unit references it, so learners can't reach it`);
  }
  info(run, `challenges: ${challengeSlugs.size} checked`);

  checkOrphanTags(run);
  return run.report;
}
