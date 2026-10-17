import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "./schema";
import { RUNNER_DEPENDENCIES } from "./sandbox";
import { validateContent } from "./validate-content";

/**
 * Every check in validate-content.ts, pinned: each case breaks a minimal valid content tree in
 * exactly one way and expects the matching error. A check that silently stops firing fails here.
 */

const json = (v: unknown) => JSON.stringify(v, null, 2);

/** One track, one unit (reading → quiz → challenge) and its challenge — all valid. */
const FIXTURE: Record<string, string> = {
  "package.json": json({ devDependencies: { ...RUNNER_DEPENDENCIES } }),
  "content/catalog.json": json({ schemaVersion: SCHEMA_VERSION, tracks: ["t"] }),
  "content/tracks/t/track.json": json({
    schemaVersion: SCHEMA_VERSION,
    slug: "t",
    title: "T",
    description: "D",
    units: ["u"],
  }),
  "content/tracks/t/units/u/unit.json": json({
    schemaVersion: SCHEMA_VERSION,
    slug: "u",
    title: "U",
    skills: ["react"],
    difficulty: "core",
    estimatedMinutes: 10,
    objectives: ["Explain one thing", "Fix another thing"],
    sources: [{ title: "React docs", url: "https://react.dev/" }],
    blocks: [
      { type: "reading", id: "read" },
      {
        type: "quiz",
        id: "quiz",
        questions: [
          {
            id: "q1",
            prompt: "?",
            options: [
              { id: "a", text: "A" },
              { id: "b", text: "B" },
            ],
            answer: "a",
            explanation: "because",
          },
        ],
      },
      { type: "challenge", id: "challenge", challengeSlug: "c" },
    ],
  }),
  "content/tracks/t/units/u/reading/simple/01-a.mdx": "---\nid: a\ntitle: A\n---\n\nBody.\n",
  "content/tracks/t/units/u/reading/medium/01-b.mdx": "---\nid: b\ntitle: B\n---\n\nBody.\n",
  "content/tracks/t/units/u/reading/complex/01-c.mdx": "---\nid: c\ntitle: C\n---\n\nBody.\n",
  "content/challenges/c/meta.json": json({
    schemaVersion: SCHEMA_VERSION,
    slug: "c",
    title: "C",
    skills: ["react"],
    difficulty: "core",
    estimatedMinutes: 5,
    runner: "in-browser",
    entry: "Thing.tsx",
    acceptanceCriteria: ["It works"],
  }),
  "content/challenges/c/README.md": "The problem.\n\n**Hint:** look closer.\n",
  "content/challenges/c/Thing.tsx": "export function Thing() {\n  return null;\n}\n",
  "content/challenges/c/solution.tsx": "export function Thing() {\n  return <p />;\n}\n",
  "content/challenges/c/App.tsx":
    'import { Thing } from "./Thing";\nexport default function App() {\n  return <Thing />;\n}\n',
  "content/challenges/c/Thing.test.tsx":
    'import { render } from "@testing-library/react";\nimport { Thing } from "./Thing";\n\nit("renders", () => {\n  render(<Thing />);\n  expect(1).toBe(1);\n});\n',
};

let root: string;

const write = async (rel: string, content: string) => {
  await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
  await fs.writeFile(path.join(root, rel), content);
};
const remove = (rel: string) => fs.rm(path.join(root, rel), { recursive: true });
const copy = (from: string, to: string) =>
  fs.cp(path.join(root, from), path.join(root, to), { recursive: true });
/** Walk `keys` into parsed JSON, returning the container of the last key. */
function containerAt(value: unknown, keys: (string | number)[]): Record<string | number, unknown> {
  let node = value as Record<string | number, unknown>;
  for (const k of keys.slice(0, -1)) node = node[k] as Record<string | number, unknown>;
  return node;
}
/** Set one value inside a fixture JSON file, e.g. set(UNIT, ["blocks", 2, "challengeSlug"], "x"). */
async function set(rel: string, keys: (string | number)[], value: unknown) {
  const o: unknown = JSON.parse(await fs.readFile(path.join(root, rel), "utf8"));
  containerAt(o, keys)[keys[keys.length - 1]] = value;
  await write(rel, json(o));
}
/** Append to an array inside a fixture JSON file, e.g. push(TRACK, ["units"], "u"). */
async function push(rel: string, keys: (string | number)[], value: unknown) {
  const o: unknown = JSON.parse(await fs.readFile(path.join(root, rel), "utf8"));
  (containerAt(o, keys)[keys[keys.length - 1]] as unknown[]).push(value);
  await write(rel, json(o));
}

const UNIT = "content/tracks/t/units/u/unit.json";
const CARDS = "content/tracks/t/units/u/cards";
/** Put a cards block right after the reading, holding `files` (name -> content). */
async function addCards(files: Record<string, string>) {
  const unit = JSON.parse(await fs.readFile(path.join(root, UNIT), "utf8")) as { blocks: unknown[] };
  unit.blocks.splice(1, 0, { type: "cards", id: "deck" });
  await write(UNIT, json(unit));
  await fs.mkdir(path.join(root, CARDS), { recursive: true });
  for (const [name, content] of Object.entries(files)) await write(`${CARDS}/${name}`, content);
}
const TRACK = "content/tracks/t/track.json";
const CATALOG = "content/catalog.json";
const META = "content/challenges/c/meta.json";
const SIMPLE = "content/tracks/t/units/u/reading/simple";

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "whetstone-validate-"));
  for (const [rel, content] of Object.entries(FIXTURE)) await write(rel, content);
});
afterEach(() => fs.rm(root, { recursive: true, force: true }));

it("accepts the valid fixture", async () => {
  expect((await validateContent(root)).errors).toEqual([]);
});

/** [what breaks, how to break it, a substring of the expected error]. */
const ERROR_CASES: [string, () => Promise<unknown>, string][] = [
  // catalog and tracks
  ["track folder missing from the catalog", () => copy("content/tracks/t", "content/tracks/t2"), "content/tracks/t2 is not in content/catalog.json"],
  ["catalog lists a track with no folder", () => push(CATALOG, ["tracks"], "ghost"), 'track "ghost" has no folder'],
  ["catalog lists a track twice", () => push(CATALOG, ["tracks"], "t"), 'track "t" is listed twice'],
  ["track slug differs from its folder", () => set(TRACK, ["slug"], "x"), 'slug "x" does not match its folder'],
  ["unit folder missing from track.units", () => copy("content/tracks/t/units/u", "content/tracks/t/units/stray"), "units/stray is not in track.json"],
  ["unit listed twice", () => push(TRACK, ["units"], "u"), 'unit "u" is listed twice'],
  ["unit slug differs from its folder", () => set(UNIT, ["slug"], "x"), 'slug "x" does not match its folder'],
  [
    "unit slug used by two tracks",
    async () => {
      await copy("content/tracks/t", "content/tracks/t2");
      await set("content/tracks/t2/track.json", ["slug"], "t2");
      await push(CATALOG, ["tracks"], "t2");
    },
    'slug "u" is already used by track t',
  ],
  ["unit references a missing challenge", () => set(UNIT, ["blocks", 2, "challengeSlug"], "nope"), 'challenge "nope" has no folder'],
  ["skill not in the taxonomy", () => push(UNIT, ["skills"], "not-a-tag"), 'skill "not-a-tag" is not in the taxonomy'],
  ["schema error is reported with its path", () => set(UNIT, ["blocks", 1, "questions", 0, "answer"], "zzz"), 'blocks.1.questions.0.answer: answer "zzz" is not one of the option ids'],

  // readings
  ["reading tier with no examples", () => remove(`${SIMPLE}/01-a.mdx`), 'reading tier "simple" has no examples'],
  ["non-.mdx file in a tier", () => write(`${SIMPLE}/02-note.md`, "x"), "not a .mdx file"],
  ["unnumbered reading file", () => write(`${SIMPLE}/extra.mdx`, "---\nid: e\ntitle: E\n---\nx\n"), "two-digit number"],
  ["missing frontmatter", () => write(`${SIMPLE}/02-x.mdx`, "no frontmatter\n"), "missing id/title frontmatter"],
  ["extra frontmatter key", () => write(`${SIMPLE}/02-x.mdx`, "---\nid: e\ntitle: E\ntags: x\n---\nx\n"), 'frontmatter key "tags" is not read'],
  ["quoted frontmatter value", () => write(`${SIMPLE}/02-x.mdx`, '---\nid: e\ntitle: "E"\n---\nx\n'), "wrapped in quotes"],
  ["duplicate reading id across tiers", () => write("content/tracks/t/units/u/reading/complex/02-x.mdx", "---\nid: a\ntitle: X\n---\nx\n"), 'duplicate id "a"'],
  ["cards block with no card files", () => addCards({}), "cards block has no card files"],
  ["card id that repeats a reading id", () => addCards({ "01-x.mdx": "---\nid: a\ntitle: X\n---\nx\n" }), 'duplicate id "a"'],
  ["card with MDX syntax", () => addCards({ "01-x.mdx": "---\nid: k\ntitle: K\n---\n<Note />\n" }), '"<Note />" outside code'],
  ["JSX tag in reading prose", () => write(`${SIMPLE}/02-x.mdx`, "---\nid: e\ntitle: E\n---\nUse <Callout>this</Callout>.\n"), '"<Callout>" outside code'],
  ["import line in a reading", () => write(`${SIMPLE}/02-x.mdx`, '---\nid: e\ntitle: E\n---\nimport { X } from "y"\n'), 'an "import" line'],

  // challenges
  ["challenge without a README", () => remove("content/challenges/c/README.md"), "missing README.md"],
  ["README repeats the title", () => write("content/challenges/c/README.md", "# C\n\nThe problem.\n"), "top-level # heading"],
  ["README repeats the checklist", () => write("content/challenges/c/README.md", "The problem.\n\n- [ ] It works\n"), "- [ ] checklist"],
  ["README has a Your task heading", () => write("content/challenges/c/README.md", "The problem.\n\n## Your task\n\nDo it.\n"), '"Your task" heading'],
  ["README has a Running section", () => write("content/challenges/c/README.md", "The problem.\n\n## Running\n\nIn the browser.\n"), '"Running" section'],
  ["meta.json slug differs from its folder", () => set(META, ["slug"], "x"), 'meta.slug "x" does not match folder'],
  ["entry file missing", () => set(META, ["entry"], "Nope.tsx"), 'entry file "Nope.tsx" not found'],
  ["entry escapes the folder", () => set(META, ["entry"], "../c/../../x.tsx"), "escapes the challenge directory"],
  ["missing App.tsx", () => remove("content/challenges/c/App.tsx"), "missing App.tsx"],
  ["no grader", () => remove("content/challenges/c/Thing.test.tsx"), "no *.test.tsx grader"],
  ["solution identical to the starter", () => write("content/challenges/c/solution.tsx", FIXTURE["content/challenges/c/Thing.tsx"]), "identical to the starter"],
  ["grader imports vitest", () => write("content/challenges/c/Thing.test.tsx", 'import { it } from "vitest";\n'), "jest-style globals, not Vitest"],
  ["undeclared package import", () => write("content/challenges/c/Thing.tsx", 'import x from "lodash";\nexport function Thing() {}\n'), 'imports "lodash"'],
  ["jest-dom matcher", () => write("content/challenges/c/Thing.test.tsx", 'it("x", () => { expect(el).toBeInTheDocument(); });\n'), "jest-dom matcher toBeInTheDocument"],
  ["vi.* helper", () => write("content/challenges/c/Thing.test.tsx", 'it("x", () => { vi.fn(); });\n'), "vi.* / jest.*"],
  ["jest.mock", () => write("content/challenges/c/Thing.test.tsx", 'jest.mock("./Thing");\n'), "uses jest.mock"],
  ["declared dependency not a devDependency", () => set(META, ["dependencies"], { zustand: "5.0.1" }), '"zustand" is pinned to 5.0.1 for the sandbox'],
  ["declared dependency re-declares a runner package", () => set(META, ["dependencies"], { "@testing-library/react": "16.1.0" }), "re-declares"],
  [
    "external runner with dependencies",
    async () => {
      await set(META, ["runner"], "external");
      await set(META, ["externalUrl"], "https://example.com");
      await set(META, ["dependencies"], { zustand: "5.0.1" });
    },
    'only applies to runner "in-browser"',
  ],
  ["runner package drifted from its devDependency", () => set("package.json", ["devDependencies", "@testing-library/dom"], "^10.4.1"), 'learning/sandbox.ts: "@testing-library/dom" is pinned to 10.4.0'],
  [
    "an unreferenced challenge is still validated",
    async () => {
      await copy("content/challenges/c", "content/challenges/standalone");
      await set("content/challenges/standalone/meta.json", ["slug"], "standalone");
      await remove("content/challenges/standalone/App.tsx");
    },
    "challenge standalone: missing App.tsx",
  ],
];

describe("validateContent errors", () => {
  it.each(ERROR_CASES)("%s", async (_name, breakIt, expected) => {
    await breakIt();
    const { errors } = await validateContent(root);
    expect(errors.some((e) => e.includes(expected)), errors.join("\n")).toBe(true);
  });
});

describe("validateContent non-errors", () => {
  it("warns, without failing, about a challenge no unit references", async () => {
    await copy("content/challenges/c", "content/challenges/standalone");
    await set("content/challenges/standalone/meta.json", ["slug"], "standalone");
    const { errors, warnings } = await validateContent(root);
    expect(errors).toEqual([]);
    expect(warnings).toContain("challenge standalone: no unit references it, so learners can't reach it");
  });

  it("accepts a deck of short cards", async () => {
    await addCards({
      "01-a.mdx": "---\nid: k1\ntitle: 429\n---\nToo Many Requests.\n\n```http\nHTTP/1.1 429\n```\n",
      "02-b.mdx": "---\nid: k2\ntitle: 401 vs 403\n---\nWho you are vs what you may do.\n",
    });
    const { errors, warnings } = await validateContent(root);
    expect(errors).toEqual([]);
    expect(warnings.filter((w) => w.includes("/cards/"))).toEqual([]);
  });

  it("warns, without failing, when a card has grown past one idea and one example", async () => {
    const long = Array.from({ length: 160 }, () => "word").join(" ");
    await addCards({ "01-a.mdx": `---\nid: k1\ntitle: Long\n---\n${long}\n` });
    const { errors, warnings } = await validateContent(root);
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes("u/cards/01-a.mdx: 160 words"))).toBe(true);
  });

  it("allows tags and imports inside code, and the Go deeper marker", async () => {
    await write(
      `${SIMPLE}/02-x.mdx`,
      "---\nid: e\ntitle: E\n---\nInline `<Foo />` and\n\n```tsx\nimport x from 'y';\n<Bar />\n```\n\n<!--more-->\n\nMore.\n",
    );
    expect((await validateContent(root)).errors).toEqual([]);
  });
});
