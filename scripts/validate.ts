import { promises as fs } from "fs";
import path from "path";
import { ZodError } from "zod";
import { Track, Unit, Challenge } from "../learning/schema";
import { Taxonomy, TAXONOMY, TAXONOMY_SLUGS } from "../learning/taxonomy";
import { RUNNER_DEPENDENCIES, SANDBOX_PACKAGES } from "../learning/sandbox";
import { parseFrontmatter } from "../lib/frontmatter";

const ROOT = process.cwd();
const TIERS = ["simple", "medium", "complex"] as const;
let errors = 0;
let warnings = 0;

const fail = (m: string) => {
  console.error("  ✗", m);
  errors++;
};

const warn = (m: string) => {
  console.warn("  ⚠", m);
  warnings++;
};

// Every skill referenced by content (that resolves in the taxonomy), for the orphan-tag check.
const referencedTags = new Set<string>();
const checkSkills = (label: string, skills: string[]) => {
  for (const s of skills) {
    if (!TAXONOMY_SLUGS.has(s))
      fail(
        `${label}: skill "${s}" is not in the taxonomy (learning/taxonomy.ts)`,
      );
    else referencedTags.add(s);
  }
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
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Module specifiers imported by a file, in any of the four syntaxes we author with. */
function importedModules(src: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g, // import x from "y" / export * from "y"
    /\bimport\s*["']([^"']+)["']/g, // import "y"
    /\bimport\s*\(\s*["']([^"']+)["']/g, // await import("y")
    /\brequire\s*\(\s*["']([^"']+)["']/g, // require("y")
  ];
  for (const re of patterns)
    for (const m of src.matchAll(re)) specifiers.push(m[1]);
  return specifiers;
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
  label: string,
  pkg: string,
  version: string,
  devDependencies: Record<string, string>,
) {
  const installed = devDependencies[pkg];
  if (installed !== version)
    fail(
      `${label}: "${pkg}" is pinned to ${version} for the sandbox, but package.json devDependencies has ${installed ?? "nothing"} — add it with \`pnpm add -D -E ${pkg}@${version}\``,
    );
}

/**
 * The in-browser (Sandpack) challenge contract — see learning/PLAYBOOK.md. These used to be
 * browser-only discoveries: a missing App.tsx or a `vitest` import fails at *runtime*, inside
 * an iframe, long after authoring. Cheap to check here, so check here. Whether the starter
 * fails and the solution passes is `pnpm test:challenges`' job (scripts/check-challenges.ts).
 */
async function checkInBrowserChallenge(
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
      fail(
        `${label}: meta.json dependencies re-declares "${pkg}", which the runner always provides`,
      );
    else checkPinnedDevDependency(label, pkg, version, devDependencies);
  }
  const resolvable = new Set([
    ...SANDBOX_PACKAGES,
    ...Object.keys(declaredDependencies),
  ]);
  // Sandpack loads the whole folder, nested files included, so scan the whole tree.
  const names = await walk(cDir);
  const read = (n: string) => fs.readFile(path.join(cDir, n), "utf8");

  for (const required of ["App.tsx", "solution.tsx", "README.md"]) {
    if (!names.includes(required))
      fail(`${label}: missing ${required} (in-browser contract)`);
  }

  const tests = names.filter(
    (n) => n.endsWith(".test.tsx") || n.endsWith(".test.ts"),
  );
  if (tests.length === 0) fail(`${label}: no *.test.tsx grader`);

  // `entry` may be a nested path, so resolve it rather than looking it up in `names`.
  if (names.includes("solution.tsx")) {
    const [starter, solution] = await Promise.all([
      fs.readFile(path.resolve(cDir, entry), "utf8"),
      read("solution.tsx"),
    ]);
    if (starter.trim() === solution.trim())
      fail(`${label}: solution.tsx is identical to the starter`);
  }

  // Every file in the folder is loaded into the sandbox, so every file's imports must resolve.
  const sandboxFiles = names.filter((n) => /\.(ts|tsx)$/.test(n));
  for (const f of sandboxFiles) {
    const src = await read(f);
    for (const specifier of importedModules(src)) {
      if (specifier.startsWith(".") || specifier.startsWith("/")) continue;
      const pkg = packageName(specifier);
      if (resolvable.has(pkg)) continue;
      if (pkg === "vitest") {
        fail(
          `${label}/${f}: imports "${specifier}" — Sandpack tests are jest-style globals, not Vitest`,
        );
        continue;
      }
      fail(
        `${label}/${f}: imports "${specifier}" — the sandbox only resolves ${[...resolvable].join(", ")}; declare it in meta.json "dependencies" or hand-roll a support module`,
      );
    }
  }

  // Sandpack's runner is jest-style, not Vitest, and ships no jest-dom / spies / module mocking.
  const jestDom = new RegExp(
    `\\.(?:not\\.)?(?:${JEST_DOM_MATCHERS.join("|")})\\s*\\(`,
  );
  for (const t of tests) {
    const src = await read(t);
    // No spy/mock/fake-timer library is loaded: `vi` and `jest` are undefined at runtime, so
    // *any* member access on either throws — don't enumerate, reject the whole namespace.
    if (/\bjest\.mock\s*\(/.test(src)) {
      fail(
        `${label}/${t}: uses jest.mock — unavailable; add a settable seam module instead`,
      );
    } else if (/\bvi\.\w|\bjest\.\w/.test(src)) {
      fail(
        `${label}/${t}: uses a spy/fake-timer helper (vi.* / jest.*) — unavailable in the sandbox; patch the global by hand or add a settable seam`,
      );
    }
    const matcher = jestDom.exec(src);
    if (matcher) {
      fail(
        `${label}/${t}: uses the jest-dom matcher ${matcher[0].slice(1, -1).trim()} — only plain matchers are available`,
      );
    }
  }
}

/** Validate one challenge folder: meta.json, its tags, its entry, and the runner contract. */
async function checkChallenge(slug: string, devDependencies: Record<string, string>) {
  const cDir = path.join(ROOT, "content", "challenges", slug);
  let meta: Challenge;
  try {
    meta = Challenge.parse(await readJson(path.join(cDir, "meta.json")));
  } catch (e) {
    fail(`challenge ${slug}: ${describe(e)}`);
    return;
  }
  checkSkills(`challenge ${slug}`, meta.skills);
  if (meta.slug !== slug) {
    fail(`challenge ${slug}: meta.slug "${meta.slug}" does not match folder`);
  }
  // Mirror loadChallenge's contract: meta.entry must resolve inside the challenge dir.
  const base = path.resolve(cDir);
  const entryPath = path.resolve(cDir, meta.entry);
  if (entryPath !== base && !entryPath.startsWith(base + path.sep)) {
    fail(`challenge ${slug}: entry "${meta.entry}" escapes the challenge directory`);
    return;
  }
  try {
    await fs.access(entryPath);
  } catch {
    fail(`challenge ${slug}: entry file "${meta.entry}" not found`);
    return;
  }
  if (meta.runner === "in-browser") {
    await checkInBrowserChallenge(
      slug,
      cDir,
      meta.entry,
      meta.dependencies ?? {},
      devDependencies,
    );
  } else if (meta.dependencies) {
    fail(`challenge ${slug}: "dependencies" only applies to runner "in-browser"`);
  }
}

/**
 * Readings are rendered with react-markdown (components/markdown.tsx), NOT compiled as MDX —
 * the `.mdx` extension is historical. A JSX/HTML tag or an `import`/`export` line outside code
 * therefore shows up as literal text on the page. Code is stripped first: tags inside fenced or
 * inline code are fine. `<!--more-->` (the "Go deeper" split) is an HTML comment, not a tag.
 */
function markdownProblem(body: string): string | null {
  const prose = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  const tag = /<\/?[A-Za-z][\w.-]*(?=[\s/>])[^>]*>?/.exec(prose);
  if (tag)
    return `"${tag[0].slice(0, 40)}" outside code — readings are Markdown, not MDX, so it renders as literal text; put code in backticks`;
  const mdx = /^\s*(import|export)\s/m.exec(prose);
  if (mdx)
    return `an "${mdx[1]}" line — readings are Markdown, not MDX, so it renders as literal text`;
  return null;
}

/** Every reading example under one reading block's tier folders. */
async function checkReadingTiers(label: string, dir: string, seenIds: Set<string>) {
  for (const tier of TIERS) {
    const tierDir = path.join(dir, tier);
    let entries: string[] = [];
    try {
      entries = (await fs.readdir(tierDir)).sort();
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    // The loader reads only *.mdx files, so anything else here would silently never render.
    const examples = entries.filter((f) => f.endsWith(".mdx"));
    for (const f of entries) {
      if (!f.endsWith(".mdx") && f !== ".DS_Store")
        fail(`${label}/${tier}/${f}: not a .mdx file, so it is never shown`);
    }
    if (examples.length === 0) fail(`${label}: reading tier "${tier}" has no examples`);

    for (const f of examples) {
      const where = `${label}/${tier}/${f}`;
      // Examples are ordered by filename; an unnumbered file sorts unpredictably.
      if (!/^\d{2}-/.test(f)) fail(`${where}: filename must start with a two-digit number (01-…)`);
      const { data, body } = parseFrontmatter(
        await fs.readFile(path.join(tierDir, f), "utf8"),
      );
      if (!data.id || !data.title) fail(`${where}: missing id/title frontmatter`);
      for (const [key, value] of Object.entries(data)) {
        if (key !== "id" && key !== "title")
          fail(`${where}: frontmatter key "${key}" is not read — only id and title are`);
        // lib/frontmatter.ts is not YAML: quotes are kept as part of the value.
        if (/^(["']).*\1$/.test(value))
          fail(`${where}: frontmatter ${key} is wrapped in quotes, which would be shown — drop them`);
      }
      if (data.id) {
        if (seenIds.has(data.id)) fail(`${where}: duplicate reading id "${data.id}" in this unit`);
        seenIds.add(data.id);
      }
      const problem = markdownProblem(body);
      if (problem) fail(`${where}: ${problem}`);
    }
  }
}

async function main() {
  // Structural integrity of the tag registry itself: unique slugs, parents resolve, acyclic.
  try {
    Taxonomy.parse(TAXONOMY);
  } catch (e) {
    fail(`taxonomy (learning/taxonomy.ts): ${describe(e)}`);
  }

  const devDependencies: Record<string, string> =
    (await readJson(path.join(ROOT, "package.json"))).devDependencies ?? {};
  for (const [pkg, version] of Object.entries(RUNNER_DEPENDENCIES))
    checkPinnedDevDependency("learning/sandbox.ts", pkg, version, devDependencies);

  const tracksDir = path.join(ROOT, "content", "tracks");
  const challengesDir = path.join(ROOT, "content", "challenges");
  const challengeSlugs = new Set(await subdirs(challengesDir));
  const referencedChallenges = new Set<string>();
  // Unit slugs are unique across ALL tracks, so a unit can be addressed by its slug alone
  // (progress, a cross-track feed, ratings) and can move between tracks without a collision.
  const unitOwner = new Map<string, string>();

  for (const ts of await subdirs(tracksDir)) {
    const tDir = path.join(tracksDir, ts);

    let track;
    try {
      track = Track.parse(await readJson(path.join(tDir, "track.json")));
    } catch (e) {
      fail(`track ${ts}: ${describe(e)}`);
      continue;
    }
    console.log(`track: ${track.slug}`);
    // Links are built from the slug in the JSON and routes from the folder name, so a
    // mismatch builds fine and then 404s.
    if (track.slug !== ts) fail(`track ${ts}: slug "${track.slug}" does not match its folder`);

    // track.units is the ONLY thing that makes a unit visible: a folder left out of it is never
    // validated, built or shown.
    const listed = new Set<string>();
    for (const us of track.units) {
      if (listed.has(us)) fail(`track ${ts}: unit "${us}" is listed twice`);
      listed.add(us);
    }
    let unitFolders: string[] = [];
    try {
      unitFolders = await subdirs(path.join(tDir, "units"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    for (const folder of unitFolders) {
      if (!listed.has(folder))
        fail(`track ${ts}: units/${folder} is not in track.json "units", so it is never shown`);
    }

    for (const us of listed) {
      const uDir = path.join(tDir, "units", us);
      const owner = unitOwner.get(us);
      if (owner) fail(`unit ${ts}/${us}: slug "${us}" is already used by track ${owner}`);
      unitOwner.set(us, ts);

      let unit;
      try {
        unit = Unit.parse(await readJson(path.join(uDir, "unit.json")));
      } catch (e) {
        fail(`unit ${ts}/${us}: ${describe(e)}`);
        continue;
      }
      if (unit.slug !== us) fail(`unit ${ts}/${us}: slug "${unit.slug}" does not match its folder`);
      checkSkills(`unit ${ts}/${us}`, unit.skills);

      const readingIds = new Set<string>();
      for (const b of unit.blocks) {
        if (b.type === "reading") await checkReadingTiers(us, path.join(uDir, b.dir), readingIds);
        if (b.type === "challenge") {
          referencedChallenges.add(b.challengeSlug);
          if (!challengeSlugs.has(b.challengeSlug))
            fail(`unit ${ts}/${us}: challenge "${b.challengeSlug}" has no folder in content/challenges/`);
        }
      }
      console.log(`  unit: ${us} — ${unit.blocks.length} blocks ✓`);
    }
  }

  // Every challenge folder is validated, referenced or not, so a standalone challenge (such as
  // one imported from the job-test archive before a unit uses it) is still held to the contract.
  for (const slug of challengeSlugs) {
    await checkChallenge(slug, devDependencies);
    if (!referencedChallenges.has(slug))
      warn(`challenge ${slug}: no unit references it, so learners can't reach it`);
  }
  console.log(`challenges: ${challengeSlugs.size} checked`);

  // Orphan tags: defined in the taxonomy but neither referenced by content nor an ancestor of a
  // referenced tag. A warning, not an error — a dead branch is worth surfacing, not worth failing.
  const bySlug = new Map(TAXONOMY.map((n) => [n.slug, n] as const));
  const alive = new Set<string>();
  const markSelfAndAncestors = (slug: string) => {
    if (alive.has(slug)) return;
    alive.add(slug);
    for (const p of bySlug.get(slug)?.parents ?? []) markSelfAndAncestors(p);
  };
  for (const s of referencedTags) markSelfAndAncestors(s);
  for (const n of TAXONOMY) {
    if (!alive.has(n.slug))
      warn(
        `taxonomy: tag "${n.slug}" is unused (no content references it or any descendant)`,
      );
  }

  const summary = errors
    ? `\n${errors} problem(s) found`
    : "\nAll content valid ✅";
  console.log(warnings ? `${summary} — ${warnings} warning(s)` : summary);
  process.exit(errors ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
