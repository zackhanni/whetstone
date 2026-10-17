import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";
import {
  Catalog as CatalogSchema,
  Track as TrackSchema,
  Unit as UnitSchema,
  Challenge as ChallengeSchema,
  type Unit,
  type Challenge,
} from "@/learning/schema";
import { parseFrontmatter } from "./frontmatter";

const ROOT = process.cwd();
const TIERS = ["simple", "medium", "complex"] as const;
export type Tier = (typeof TIERS)[number];

export type ReadingExample = { id: string; title: string; body: string };
export type ChallengeBundle = {
  meta: Challenge;
  readme: string;
  files: Record<string, string>; // Sandpack file set (excludes meta.json, README.md, solution.tsx)
  solution: string | null; // solution.tsx content, for "show solution"
};

export type UnitBundle = {
  track: { slug: string; title: string };
  unit: Unit;
  readings: Record<string, Record<Tier, ReadingExample[]>>; // keyed by reading block id
  challenges: Record<string, ChallengeBundle>; // keyed by challengeSlug
};

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
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

/**
 * Recursively read all files under `dir`, keyed by forward-slash path relative to `base`.
 * Tracks the path as it descends to avoid fs `Dirent.parentPath` (Node >= 20.12 only).
 */
async function walkFiles(dir: string, base: string = dir): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const entries = await fs.readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (e) => {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        Object.assign(out, await walkFiles(abs, base));
      } else if (e.isFile()) {
        const rel = path.relative(base, abs).split(path.sep).join("/");
        out[rel] = await fs.readFile(abs, "utf8");
      }
    }),
  );
  return out;
}

async function loadChallenge(slug: string): Promise<ChallengeBundle> {
  // slug and meta.entry are both content-derived — keep their resolved paths in bounds.
  const cDir = resolveWithin(path.join(ROOT, "content", "challenges"), slug);
  const meta = ChallengeSchema.parse(await readJson(path.join(cDir, "meta.json")));
  resolveWithin(cDir, meta.entry); // ensure the editable entry stays inside the challenge dir

  // Include nested helper files too, keyed by forward-slash relative path (what Sandpack
  // expects). walkFiles avoids Dirent.parentPath for broader Node compatibility.
  const all = await walkFiles(cDir);
  const files: Record<string, string> = {};
  let readme = "";
  let solution: string | null = null;
  for (const [rel, content] of Object.entries(all)) {
    if (rel === "meta.json") continue;
    else if (rel === "README.md") readme = content;
    else if (rel === "solution.tsx") solution = content;
    else files[rel] = content;
  }
  if (!(meta.entry in files)) {
    throw new Error(`challenge ${slug}: entry "${meta.entry}" is not among its files`);
  }
  return { meta, readme, files, solution };
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

/**
 * Enumerate every track/unit pair, for static generation. A track.json that fails to parse
 * throws, failing the build — returning [] for it would silently drop all its lessons from the
 * site while the build stayed green.
 */
export async function listUnits(): Promise<{ track: string; unit: string }[]> {
  const tracksDir = path.join(ROOT, "content", "tracks");
  const nested = await Promise.all(
    (await listTrackSlugs()).map(async (track) => {
      const parsed = TrackSchema.parse(await readJson(path.join(tracksDir, track, "track.json")));
      return parsed.units.map((unit) => ({ track, unit }));
    }),
  );
  return nested.flat();
}

/**
 * Track slugs in display order, from content/catalog.json — no `track.json` parse. For callers
 * that just need to enumerate tracks (home index, static params); pair with `loadTrack` for the
 * detail. `pnpm validate` guarantees every listed track has a folder and every folder is listed.
 */
export async function listTrackSlugs(): Promise<string[]> {
  const catalog = CatalogSchema.parse(await readJson(path.join(ROOT, "content", "catalog.json")));
  return catalog.tracks;
}

export type UnitSummary = {
  slug: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  skills: string[];
};
export type TrackDetail = { slug: string; title: string; description: string; units: UnitSummary[] };

/** A track plus its units' metadata, for the track index page. */
export const loadTrack = cache(async (trackSlug: string): Promise<TrackDetail> => {
  const trackDir = resolveWithin(path.join(ROOT, "content", "tracks"), trackSlug);
  const track = TrackSchema.parse(await readJson(path.join(trackDir, "track.json")));
  const units = await Promise.all(
    track.units.map(async (us) => {
      const u = UnitSchema.parse(await readJson(path.join(trackDir, "units", us, "unit.json")));
      return {
        slug: u.slug,
        title: u.title,
        difficulty: u.difficulty,
        estimatedMinutes: u.estimatedMinutes,
        skills: u.skills,
      };
    }),
  );
  return { slug: track.slug, title: track.title, description: track.description, units };
});
