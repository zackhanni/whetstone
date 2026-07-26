import { promises as fs } from "fs";
import path from "path";
import { Track, Unit, Challenge } from "../learning/schema";
import { Taxonomy, TAXONOMY, TAXONOMY_SLUGS } from "../learning/taxonomy";
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

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

/**
 * The in-browser (Sandpack) challenge contract — see learning/PLAYBOOK.md. These used to be
 * browser-only discoveries: a missing App.tsx or a `vitest` import fails at *runtime*, inside
 * an iframe, long after authoring. Cheap to check here, so check here.
 */
async function checkInBrowserChallenge(
  slug: string,
  cDir: string,
  entry: string,
) {
  const label = `challenge ${slug}`;
  const names = await fs.readdir(cDir);
  const read = (n: string) => fs.readFile(path.join(cDir, n), "utf8");

  for (const required of ["App.tsx", "solution.tsx", "README.md"]) {
    if (!names.includes(required))
      fail(`${label}: missing ${required} (in-browser contract)`);
  }

  const tests = names.filter(
    (n) => n.endsWith(".test.tsx") || n.endsWith(".test.ts"),
  );
  if (tests.length === 0) fail(`${label}: no *.test.tsx grader`);

  // Rule 4 can't be graded headlessly, but "the author forgot to change anything" can.
  // `entry` may be a nested path, so resolve it rather than looking it up in `names`.
  if (names.includes("solution.tsx")) {
    const [starter, solution] = await Promise.all([
      fs.readFile(path.resolve(cDir, entry), "utf8"),
      read("solution.tsx"),
    ]);
    if (starter.trim() === solution.trim())
      fail(`${label}: solution.tsx is identical to the starter`);
  }

  // Sandpack's runner is jest-style, not Vitest, and ships no jest-dom / module mocking.
  for (const t of tests) {
    const src = await read(t);
    // Covers both `from "vitest"` and the side-effect form `import "vitest"`.
    if (
      /\bfrom\s+["']vitest["']|\bimport\s+["']vitest["']|require\(\s*["']vitest["']/.test(
        src,
      )
    )
      fail(
        `${label}/${t}: imports "vitest" — Sandpack tests are jest-style globals`,
      );
    // No spy/mock library is loaded in the sandbox: `vi` and `jest` are undefined at runtime.
    if (
      /\bvi\.\w|\bjest\.(spyOn|fn|useFakeTimers|advanceTimersByTime)\b/.test(
        src,
      )
    ) {
      fail(
        `${label}/${t}: uses a spy/fake-timer helper (vi.* / jest.*) — unavailable in the sandbox; patch the global by hand or add a settable seam`,
      );
    }
    if (/toBeInTheDocument|toHaveTextContent|toBeVisible/.test(src)) {
      fail(
        `${label}/${t}: uses a jest-dom matcher — only plain matchers are available`,
      );
    }
    if (/\bjest\.mock\s*\(/.test(src))
      fail(
        `${label}/${t}: uses jest.mock — unavailable; add a settable seam module instead`,
      );
  }
}

async function main() {
  // Structural integrity of the tag registry itself: unique slugs, parents resolve, acyclic.
  try {
    Taxonomy.parse(TAXONOMY);
  } catch (e) {
    fail(`taxonomy (learning/taxonomy.ts): ${(e as Error).message}`);
  }

  const tracksDir = path.join(ROOT, "content", "tracks");
  const slugs = await fs.readdir(tracksDir);

  for (const ts of slugs) {
    const tDir = path.join(tracksDir, ts);
    if (!(await fs.stat(tDir)).isDirectory()) continue;

    let track;
    try {
      track = Track.parse(await readJson(path.join(tDir, "track.json")));
    } catch (e) {
      fail(`track ${ts}: ${(e as Error).message}`);
      continue;
    }
    console.log(`track: ${track.slug}`);
    checkSkills(`track ${track.slug}`, track.skills);

    for (const us of track.units) {
      const uDir = path.join(tDir, "units", us);
      let unit;
      try {
        unit = Unit.parse(await readJson(path.join(uDir, "unit.json")));
      } catch (e) {
        fail(`unit ${ts}/${us}: ${(e as Error).message}`);
        continue;
      }
      checkSkills(`unit ${ts}/${us}`, unit.skills);

      for (const b of unit.blocks) {
        if (b.type === "reading") {
          for (const tier of TIERS) {
            const tierDir = path.join(uDir, b.dir, tier);
            let files: string[] = [];
            try {
              files = (await fs.readdir(tierDir)).filter((f) =>
                f.endsWith(".mdx"),
              );
            } catch {
              /* missing dir => no examples */
            }
            if (files.length === 0)
              fail(`${us}: reading tier "${tier}" has no examples`);
            for (const f of files) {
              const fm = parseFrontmatter(
                await fs.readFile(path.join(tierDir, f), "utf8"),
              ).data;
              if (!fm.id || !fm.title)
                fail(`${us}/${tier}/${f}: missing id/title frontmatter`);
            }
          }
        }
        if (b.type === "challenge") {
          const cDir = path.join(
            ROOT,
            "content",
            "challenges",
            b.challengeSlug,
          );
          try {
            const meta = Challenge.parse(
              await readJson(path.join(cDir, "meta.json")),
            );
            checkSkills(`challenge ${b.challengeSlug}`, meta.skills);
            if (meta.slug !== b.challengeSlug) {
              fail(
                `challenge ${b.challengeSlug}: meta.slug "${meta.slug}" does not match folder`,
              );
            }
            // Mirror loadUnit's contract: meta.entry must resolve inside the challenge dir.
            const base = path.resolve(cDir);
            const entryPath = path.resolve(cDir, meta.entry);
            if (entryPath !== base && !entryPath.startsWith(base + path.sep)) {
              fail(
                `challenge ${b.challengeSlug}: entry "${meta.entry}" escapes the challenge directory`,
              );
            } else {
              try {
                await fs.access(entryPath);
              } catch {
                fail(
                  `challenge ${b.challengeSlug}: entry file "${meta.entry}" not found`,
                );
              }
              if (meta.runner === "in-browser") {
                await checkInBrowserChallenge(
                  b.challengeSlug,
                  cDir,
                  meta.entry,
                );
              }
            }
          } catch (e) {
            fail(`challenge ${b.challengeSlug}: ${(e as Error).message}`);
          }
        }
      }
      console.log(`  unit: ${us} — ${unit.blocks.length} blocks ✓`);
    }
  }

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
