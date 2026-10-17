import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, Track, Unit } from "./schema";

/**
 * The rules that live in the schema's superRefine and `.strict()` — each one was a way for
 * AI-authored content to pass the gate while being broken on the page. `pnpm validate` parses
 * the real content; these pin each rule with the smallest input that breaks it.
 */

/** A minimal valid unit: reading, a quiz, a fill-blank, then a challenge. */
function unit() {
  return {
    schemaVersion: SCHEMA_VERSION,
    slug: "u",
    title: "U",
    skills: ["react"],
    difficulty: "core",
    estimatedMinutes: 10,
    objectives: ["Explain one thing", "Fix another thing"],
    sources: [{ title: "React docs", url: "https://react.dev/" }] as { title: string; url: string }[],
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
      {
        type: "fill-blank",
        id: "fill",
        prompts: [
          {
            id: "p1",
            prompt: "?",
            code: "___ and ___",
            blanks: [
              { id: "b1", accept: ["x"] },
              { id: "b2", accept: ["y"] },
            ],
            explanation: "because",
          },
        ],
      },
      { type: "challenge", id: "challenge", challengeSlug: "c" },
    ],
  };
}

type Fixture = ReturnType<typeof unit>;
/** The issue messages Unit.parse reports for a fixture after `mutate` breaks it. */
function issuesAfter(mutate: (u: Fixture) => void): string[] {
  const u = unit();
  mutate(u);
  const result = Unit.safeParse(u);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

const quizOf = (u: Fixture) => u.blocks[1] as { questions: Record<string, unknown>[] };
const fillOf = (u: Fixture) =>
  u.blocks[2] as { prompts: { blanks: { id: string; accept: string[] }[] }[] };

describe("Unit schema", () => {
  it("accepts the minimal valid unit", () => {
    expect(Unit.safeParse(unit()).success).toBe(true);
  });

  it("rejects an unknown key instead of silently dropping it", () => {
    const issues = issuesAfter((u) => {
      quizOf(u).questions[0].shuffleOption = false; // typo of shuffleOptions
    });
    expect(issues.some((m) => m.includes("Unrecognized key"))).toBe(true);
  });

  it("rejects a quiz answer that names no option", () => {
    const issues = issuesAfter((u) => {
      quizOf(u).questions[0].answer = "zzz";
    });
    expect(issues).toContain('answer "zzz" is not one of the option ids');
  });

  it("rejects a multi-select answer that repeats an option", () => {
    const issues = issuesAfter((u) => {
      quizOf(u).questions[0].answer = ["a", "a"];
    });
    expect(issues).toContain("answer lists the same option id twice");
  });

  it("rejects duplicate option ids", () => {
    const issues = issuesAfter((u) => {
      (quizOf(u).questions[0].options as { id: string }[])[1].id = "a";
    });
    expect(issues).toContain('duplicate option id "a"');
  });

  it("rejects duplicate blank ids", () => {
    const issues = issuesAfter((u) => {
      fillOf(u).prompts[0].blanks[1].id = "b1";
    });
    expect(issues).toContain('duplicate blank id "b1"');
  });

  it("rejects a reading after an assessment", () => {
    const issues = issuesAfter((u) => {
      u.blocks.push(u.blocks.shift()!); // reading moves to the end
      u.blocks.splice(2, 0, u.blocks.pop()!); // ...then before the challenge
    });
    expect(issues).toContain('reading "read" comes after an assessment — readings and cards open the unit');
  });

  it("accepts a cards-only unit, and cards alongside readings before assessments", () => {
    const cardsOnly = { ...unit(), blocks: [{ type: "cards", id: "deck" }] };
    expect(Unit.safeParse(cardsOnly).success).toBe(true);
    const mixed = unit();
    (mixed.blocks as { type: string; id: string }[]).splice(1, 0, { type: "cards", id: "deck" });
    expect(Unit.safeParse(mixed).success).toBe(true);
  });

  it("rejects cards after an assessment", () => {
    const issues = issuesAfter((u) => {
      (u.blocks as { type: string; id: string }[]).splice(3, 0, { type: "cards", id: "deck" });
    });
    expect(issues).toContain('cards "deck" comes after an assessment — readings and cards open the unit');
  });

  it("rejects a block after the challenge", () => {
    const issues = issuesAfter((u) => {
      u.blocks.splice(1, 0, u.blocks.pop()!); // challenge right after the reading
    });
    expect(issues.some((m) => m.includes("comes after a challenge"))).toBe(true);
  });

  it("joins an array of code lines into one string", () => {
    const u = unit();
    (u.blocks[2] as { prompts: { code: unknown }[] }).prompts[0].code = ["___ and", "___"];
    const parsed = Unit.parse(u);
    const fill = parsed.blocks[2] as { prompts: { code: string }[] };
    expect(fill.prompts[0].code).toBe("___ and\n___");
  });

  it("rejects multi-line code written as one string", () => {
    const issues = issuesAfter((u) => {
      (u.blocks[2] as { prompts: { code: string }[] }).prompts[0].code = "___ and\n___";
    });
    expect(issues.some((m) => m.includes("must be an array of lines"))).toBe(true);
  });

  it("rejects accepted answers that differ only in whitespace, case or quotes", () => {
    const issues = issuesAfter((u) => {
      fillOf(u).prompts[0].blanks[0].accept = ["() =>", "()=>"];
    });
    expect(issues.some((m) => m.includes('"()=>" duplicates "() =>"'))).toBe(true);
  });

  it("requires 2 to 5 objectives", () => {
    expect(issuesAfter((u) => (u.objectives = ["only one"])).length).toBeGreaterThan(0);
    expect(issuesAfter((u) => (u.objectives = ["a", "b", "c", "d", "e", "f"])).length).toBeGreaterThan(0);
  });

  it("requires https sources, each listed once", () => {
    expect(issuesAfter((u) => (u.sources = [])).length).toBeGreaterThan(0);
    expect(issuesAfter((u) => (u.sources[0].url = "http://react.dev/"))).toContain("use an https:// link");
    expect(issuesAfter((u) => u.sources.push({ ...u.sources[0] }))).toContain(
      "source https://react.dev/ is listed twice",
    );
  });

  it("rejects a line break in a field rendered as inline Markdown", () => {
    const message = "inline text can't contain a line break (it renders as one run-on line)";
    expect(issuesAfter((u) => (quizOf(u).questions[0].prompt = "Line one\nline two"))).toContain(message);
    expect(issuesAfter((u) => (u.objectives[0] = "Explain\nthis"))).toContain(message);
  });

  it("rejects the v1 challenge `mode` field", () => {
    const issues = issuesAfter((u) => {
      (u.blocks[3] as Record<string, unknown>).mode = "in-browser";
    });
    expect(issues.some((m) => m.includes("Unrecognized key"))).toBe(true);
  });
});

describe("Track schema", () => {
  const track = {
    schemaVersion: SCHEMA_VERSION,
    slug: "t",
    title: "T",
    description: "D",
    units: ["u"],
  };

  it("accepts a track without skills", () => {
    expect(Track.safeParse(track).success).toBe(true);
  });

  it("rejects track-level skills — they are derived from the units", () => {
    expect(Track.safeParse({ ...track, skills: ["react"] }).success).toBe(false);
  });
});
