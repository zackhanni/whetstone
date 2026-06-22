import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";
import { Track as TrackSchema, Unit as UnitSchema, Challenge as ChallengeSchema, type Unit, type Challenge } from "@/learning/schema";
import { parseFrontmatter } from "./frontmatter";

const ROOT = process.cwd();
const TIERS = ["simple", "medium", "complex"] as const;
export type Tier = (typeof TIERS)[number];

export type ReadingExample = { id: string; title: string; body: string };
export type ChallengeBundle = { meta: Challenge; readme: string; starter: string };

export type UnitBundle = {
  track: { slug: string; title: string };
  unit: Unit;
  readings: Record<string, Record<Tier, ReadingExample[]>>; // keyed by reading block id
  challenges: Record<string, ChallengeBundle>; // keyed by challengeSlug
};

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

/** Read a file, treating "missing" (ENOENT) as empty but surfacing real errors. */
async function readOptional(p: string): Promise<string> {
  try {
    return await fs.readFile(p, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw e;
  }
}

/** Resolve `segments` under `base`, throwing if the result escapes it (path-traversal guard). */
function resolveWithin(base: string, ...segments: string[]): string {
  const root = path.resolve(base);
  const resolved = path.resolve(base, ...segments);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`path "${segments.join("/")}" escapes ${base}`);
  }
  return resolved;
}

async function loadReadingTiers(dir: string): Promise<Record<Tier, ReadingExample[]>> {
  const entries = await Promise.all(
    TIERS.map(async (tier): Promise<[Tier, ReadingExample[]]> => {
      const tierDir = path.join(dir, tier);
      let files: string[] = [];
      try {
        files = (await fs.readdir(tierDir)).filter((f) => f.endsWith(".mdx")).sort();
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        files = [];
      }
      const examples = await Promise.all(
        files.map(async (f) => {
          const { data, body } = parseFrontmatter(await fs.readFile(path.join(tierDir, f), "utf8"));
          return { id: data.id ?? f, title: data.title ?? f, body };
        }),
      );
      return [tier, examples];
    }),
  );
  return Object.fromEntries(entries) as Record<Tier, ReadingExample[]>;
}

async function loadChallenge(slug: string): Promise<ChallengeBundle> {
  // slug and meta.entry are both content-derived — keep their resolved paths in bounds.
  const cDir = resolveWithin(path.join(ROOT, "content", "challenges"), slug);
  const meta = ChallengeSchema.parse(await readJson(path.join(cDir, "meta.json")));
  const entryPath = resolveWithin(cDir, meta.entry);
  const [readme, starter] = await Promise.all([
    readOptional(path.join(cDir, "README.md")),
    readOptional(entryPath),
  ]);
  return { meta, readme, starter };
}

/**
 * Load a unit and everything it references. Wrapped in React `cache()` so repeat calls in
 * one render are deduped. Pages are statically generated (see the route's
 * `generateStaticParams`), so in production this runs at build time, not per request.
 */
export const loadUnit = cache(async (trackSlug: string, unitSlug: string): Promise<UnitBundle> => {
  const trackDir = path.join(ROOT, "content", "tracks", trackSlug);
  const unitDir = path.join(trackDir, "units", unitSlug);

  // track.json and unit.json are independent — read them together.
  const [track, unit] = await Promise.all([
    readJson(path.join(trackDir, "track.json")).then((j) => TrackSchema.parse(j)),
    readJson(path.join(unitDir, "unit.json")).then((j) => UnitSchema.parse(j)),
  ]);

  const readings: UnitBundle["readings"] = {};
  const challenges: UnitBundle["challenges"] = {};

  // Load every block's assets concurrently. Assigning into the maps is safe — JS is
  // single-threaded, so the writes don't interleave mid-statement.
  await Promise.all(
    unit.blocks.map(async (block) => {
      if (block.type === "reading") {
        readings[block.id] = await loadReadingTiers(resolveWithin(unitDir, block.dir));
      } else if (block.type === "challenge") {
        challenges[block.challengeSlug] = await loadChallenge(block.challengeSlug);
      }
    }),
  );

  return { track: { slug: track.slug, title: track.title }, unit, readings, challenges };
});

/** Enumerate every track/unit pair, for static generation. */
export async function listUnits(): Promise<{ track: string; unit: string }[]> {
  const tracksDir = path.join(ROOT, "content", "tracks");
  let trackSlugs: string[] = [];
  try {
    trackSlugs = await fs.readdir(tracksDir);
  } catch {
    return [];
  }
  const nested = await Promise.all(
    trackSlugs.map(async (track) => {
      try {
        const parsed = TrackSchema.parse(await readJson(path.join(tracksDir, track, "track.json")));
        return parsed.units.map((unit) => ({ track, unit }));
      } catch {
        return [];
      }
    }),
  );
  return nested.flat();
}
