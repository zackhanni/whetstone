import { promises as fs } from "fs";
import path from "path";
import { Track, Unit, Challenge } from "../learning/schema";
import { parseFrontmatter } from "../lib/frontmatter";

const ROOT = process.cwd();
const TIERS = ["simple", "medium", "complex"] as const;
let errors = 0;

const fail = (m: string) => {
  console.error("  ✗", m);
  errors++;
};

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

async function main() {
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

    for (const us of track.units) {
      const uDir = path.join(tDir, "units", us);
      let unit;
      try {
        unit = Unit.parse(await readJson(path.join(uDir, "unit.json")));
      } catch (e) {
        fail(`unit ${ts}/${us}: ${(e as Error).message}`);
        continue;
      }

      for (const b of unit.blocks) {
        if (b.type === "reading") {
          for (const tier of TIERS) {
            const tierDir = path.join(uDir, b.dir, tier);
            let files: string[] = [];
            try {
              files = (await fs.readdir(tierDir)).filter((f) => f.endsWith(".mdx"));
            } catch {
              /* missing dir => no examples */
            }
            if (files.length === 0) fail(`${us}: reading tier "${tier}" has no examples`);
            for (const f of files) {
              const fm = parseFrontmatter(await fs.readFile(path.join(tierDir, f), "utf8")).data;
              if (!fm.id || !fm.title) fail(`${us}/${tier}/${f}: missing id/title frontmatter`);
            }
          }
        }
        if (b.type === "challenge") {
          const cDir = path.join(ROOT, "content", "challenges", b.challengeSlug);
          try {
            const meta = Challenge.parse(await readJson(path.join(cDir, "meta.json")));
            if (meta.slug !== b.challengeSlug) {
              fail(`challenge ${b.challengeSlug}: meta.slug "${meta.slug}" does not match folder`);
            }
            try {
              await fs.access(path.join(cDir, meta.entry));
            } catch {
              fail(`challenge ${b.challengeSlug}: entry file "${meta.entry}" not found`);
            }
          } catch (e) {
            fail(`challenge ${b.challengeSlug}: ${(e as Error).message}`);
          }
        }
      }
      console.log(`  unit: ${us} — ${unit.blocks.length} blocks ✓`);
    }
  }

  console.log(errors ? `\n${errors} problem(s) found` : "\nAll content valid ✅");
  process.exit(errors ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
