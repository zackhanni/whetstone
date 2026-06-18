import { promises as fs } from "fs";
import path from "path";
import { Track as TrackSchema, Unit as UnitSchema, Challenge as ChallengeSchema, type Unit, type Challenge } from "@/learning/schema";

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

/** Minimal YAML-ish frontmatter parser (our mdx frontmatter is simple key: value). */
export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: raw };
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  const data: Record<string, string> = {};
  for (const line of fm.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { data, body };
}

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

export async function loadUnit(trackSlug: string, unitSlug: string): Promise<UnitBundle> {
  const trackDir = path.join(ROOT, "content", "tracks", trackSlug);
  const track = TrackSchema.parse(await readJson(path.join(trackDir, "track.json")));
  const unitDir = path.join(trackDir, "units", unitSlug);
  const unit = UnitSchema.parse(await readJson(path.join(unitDir, "unit.json")));

  const readings: UnitBundle["readings"] = {};
  const challenges: UnitBundle["challenges"] = {};

  for (const block of unit.blocks) {
    if (block.type === "reading") {
      const tierMap = {} as Record<Tier, ReadingExample[]>;
      for (const tier of TIERS) {
        const tierDir = path.join(unitDir, block.dir, tier);
        let files: string[] = [];
        try {
          files = (await fs.readdir(tierDir)).filter((f) => f.endsWith(".mdx")).sort();
        } catch {
          files = [];
        }
        tierMap[tier] = await Promise.all(
          files.map(async (f) => {
            const raw = await fs.readFile(path.join(tierDir, f), "utf8");
            const { data, body } = parseFrontmatter(raw);
            return { id: data.id ?? f, title: data.title ?? f, body };
          }),
        );
      }
      readings[block.id] = tierMap;
    }

    if (block.type === "challenge") {
      const cDir = path.join(ROOT, "content", "challenges", block.challengeSlug);
      const meta = ChallengeSchema.parse(await readJson(path.join(cDir, "meta.json")));
      const readme = await fs.readFile(path.join(cDir, "README.md"), "utf8").catch(() => "");
      const starter = await fs.readFile(path.join(cDir, meta.entry), "utf8").catch(() => "");
      challenges[block.challengeSlug] = { meta, readme, starter };
    }
  }

  return { track: { slug: track.slug, title: track.title }, unit, readings, challenges };
}
