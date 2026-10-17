import { z } from "zod";
import { normalizeBlankAnswer } from "./grading";

/**
 * The Whetstone content schema — the single source of truth for what a lesson is.
 *
 * Design bias: keep it simple. Store content in canonical (unshuffled) form; let the app
 * decide how much to show and in what order at render time. Every example/question/option
 * carries a stable `id` so that randomization is reliable and future features
 * (rate-to-reorder, pick-N) need no migration — just a new optional field + app logic.
 *
 * Every object is `.strict()`: an unknown key is an error, not silently dropped. Content is
 * AI-authored, and a misspelled field (`shuffleOption: false`) would otherwise parse cleanly and
 * do nothing.
 *
 * Versioning: bump SCHEMA_VERSION only for a BREAKING change — a field removed or renamed, or
 * its meaning changed — and sweep every content file in the same, otherwise-empty change set
 * (see learning/PLAYBOOK.md → "The self-improvement loop"). Adding an optional field is not
 * breaking: every existing file still parses and still means the same thing, so no bump.
 */
export const SCHEMA_VERSION = 3;

export const Difficulty = z.enum(["intro", "core", "advanced"]);

const Identified = z.object({ id: z.string().min(1) });

/**
 * A code snippet. Multi-line code is an array of lines — readable in the JSON and diffed line
 * by line in review, where one escaped "\n"-joined string shows up as a single changed line.
 * A one-liner may stay a plain string. Either way the app receives one "\n"-joined string.
 */
const Code = z
  .union([
    z.string().min(1).refine((s) => !s.includes("\n"), {
      message: "multi-line code must be an array of lines, not one string with \\n",
    }),
    z.array(z.string()).min(2, "a one-line snippet is a plain string, not a 1-item array"),
  ])
  .transform((code) => (Array.isArray(code) ? code.join("\n") : code));

/**
 * A short field rendered as inline Markdown (prompts, options, questions, objectives, challenge
 * titles and acceptance criteria). The inline renderer unwraps paragraphs, so a line break would
 * silently run the two lines together — write one line, or move the detail to the explanation.
 */
const InlineText = z
  .string()
  .min(1)
  // CommonMark ends a line at a lone \r too, not only at \n.
  .refine((s) => !/[\r\n]/.test(s), {
    message: "inline text can't contain a line break (it renders as one run-on line)",
  });

/** An official documentation page the unit's claims were checked against. */
const Source = z
  .object({
    title: z.string().min(1), // e.g. "React docs: useEffect"
    url: z.string().url().startsWith("https://", "use an https:// link"),
  })
  .strict();

/**
 * Reading — concept explainer, organized as examples grouped by tier.
 * Examples are discovered by folder convention under <dir>/{simple,medium,complex}/*.mdx,
 * ordered by filename. Each .mdx carries `id` + `title` frontmatter. The app stacks tiers
 * vertically (Simple → Complex) and lets the learner swipe through examples within a tier.
 */
export const ReadingBlock = Identified.extend({
  type: z.literal("reading"),
  dir: z.string().min(1).default("reading"), // folder (relative to the unit) holding the tiers
}).strict();

/**
 * Cards — a deck of short notes, each one idea plus one example: a reminder, not a mastery
 * ladder. Same folder convention as a reading, minus the tiers: <dir>/*.mdx, ordered by filename,
 * each with `id` + `title` frontmatter. A unit of only cards is a reference unit; adding
 * assessments later "blooms" it into a lesson (docs/cards-and-lesson-depth.md).
 */
export const CardsBlock = Identified.extend({
  type: z.literal("cards"),
  dir: z.string().min(1).default("cards"), // folder (relative to the unit) holding the card files
}).strict();

/** One multiple-choice question. `answer` references option id(s), so options shuffle freely. */
export const QuizQuestion = Identified.extend({
  prompt: InlineText,
  options: z
    .array(z.object({ id: z.string().min(1), text: InlineText }).strict())
    .min(2),
  answer: z.union([z.string(), z.array(z.string()).min(1)]), // option id(s); array => multi-select
  explanation: z.string().min(1), // ALWAYS required: wrong answers must teach
  shuffleOptions: z.boolean().default(true), // false to pin order ("all of the above", ordered steps)
}).strict();

export const FillBlankItem = Identified.extend({
  prompt: InlineText,
  code: Code, // contains `___` tokens, one per blank, in order
  blanks: z
    .array(
      z
        .object({
          id: z.string().min(1),
          // Compared after normalizeBlankAnswer (case, whitespace and quote style ignored).
          accept: z
            .array(
              z.string().refine((a) => normalizeBlankAnswer(a) !== "", {
                message: "an accepted answer can't be blank",
              }),
            )
            .min(1),
        })
        .strict(),
    )
    .min(1),
  explanation: z.string().min(1),
}).strict();

/**
 * Predict-output is self-graded: the learner compares their prediction with `answer` (and any
 * `acceptable` phrasings, shown alongside it) and marks themselves right or wrong.
 */
export const PredictItem = Identified.extend({
  code: Code,
  question: InlineText,
  answer: z.string().min(1),
  acceptable: z.array(z.string()).optional(), // other phrasings that also count as correct
  explanation: z.string().min(1),
}).strict();

/**
 * Assessment blocks each hold a LIST of items (1..n) — one rule, no exceptions.
 * A single question is just a one-item list. The app shows every item by default, shuffles
 * their order, and shuffles each question's options (keyed by id). Showing a random subset
 * / difficulty mix is a future, non-breaking addition (see PLAYBOOK → "Designed to grow").
 */
export const QuizBlock = Identified.extend({
  type: z.literal("quiz"),
  questions: z.array(QuizQuestion).min(1),
}).strict();

export const FillBlankBlock = Identified.extend({
  type: z.literal("fill-blank"),
  prompts: z.array(FillBlankItem).min(1),
}).strict();

export const PredictOutputBlock = Identified.extend({
  type: z.literal("predict-output"),
  snippets: z.array(PredictItem).min(1),
}).strict();

/**
 * Coding challenge — real files in content/challenges/<slug>/, referenced by slug. How it runs
 * (in-browser or external) is the challenge's own `runner` in its meta.json, not repeated here.
 */
export const ChallengeBlock = Identified.extend({
  type: z.literal("challenge"),
  challengeSlug: z.string().min(1), // -> content/challenges/<slug>/
}).strict();

export const Block = z.discriminatedUnion("type", [
  ReadingBlock,
  CardsBlock,
  QuizBlock,
  FillBlankBlock,
  PredictOutputBlock,
  ChallengeBlock,
]);

export const Unit = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    slug: z.string().min(1), // must equal the unit's folder name (checked by pnpm validate)
    title: z.string().min(1),
    skills: z.array(z.string()).min(1), // the source of truth for tags; tracks derive theirs
    difficulty: Difficulty,
    estimatedMinutes: z.number().int().positive(),
    // "After this unit you can…" — each one a concrete, assessed skill (PLAYBOOK → Objectives).
    objectives: z.array(InlineText).min(2).max(5),
    sources: z.array(Source).min(1), // shown as "Further reading"; see PLAYBOOK → Sources
    blocks: z.array(Block).min(1), // ordered; difficulty escalates down the array
  })
  .strict()
  .superRefine((unit, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    const uniqueIds = (items: { id: string }[], path: (string | number)[], label: string) => {
      const seen = new Set<string>();
      items.forEach((it, j) => {
        if (seen.has(it.id)) issue([...path, j, "id"], `duplicate ${label} id "${it.id}"`);
        seen.add(it.id);
      });
    };

    uniqueIds(unit.blocks, ["blocks"], "block");

    const urls = new Set<string>();
    unit.sources.forEach((src, i) => {
      if (urls.has(src.url)) issue(["sources", i, "url"], `source ${src.url} is listed twice`);
      urls.add(src.url);
    });

    // Rule 3, the part a machine can check: teaching blocks (readings, cards) open the unit and
    // challenges close it. (Whether each assessment is harder than the last is still judgment.)
    const isTeaching = (b: { type: string }) => b.type === "reading" || b.type === "cards";
    const firstAssessment = unit.blocks.findIndex((b) => !isTeaching(b));
    const firstChallenge = unit.blocks.findIndex((b) => b.type === "challenge");
    unit.blocks.forEach((b, i) => {
      if (isTeaching(b) && firstAssessment !== -1 && i > firstAssessment)
        issue(
          ["blocks", i],
          `${b.type} "${b.id}" comes after an assessment — readings and cards open the unit`,
        );
      if (b.type !== "challenge" && firstChallenge !== -1 && i > firstChallenge)
        issue(["blocks", i], `"${b.id}" comes after a challenge — challenges close the unit`);
    });

    unit.blocks.forEach((b, i) => {
      if (b.type === "quiz") {
        uniqueIds(b.questions, ["blocks", i, "questions"], "question");
        b.questions.forEach((q, j) => {
          const at = ["blocks", i, "questions", j];
          uniqueIds(q.options, [...at, "options"], "option");
          // An answer id that names no option makes the question impossible to get right.
          const optionIds = new Set(q.options.map((o) => o.id));
          const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
          answers.forEach((a) => {
            if (!optionIds.has(a)) issue([...at, "answer"], `answer "${a}" is not one of the option ids`);
          });
          if (new Set(answers).size !== answers.length)
            issue([...at, "answer"], "answer lists the same option id twice");
        });
      }
      if (b.type === "predict-output") uniqueIds(b.snippets, ["blocks", i, "snippets"], "snippet");
      if (b.type === "fill-blank") {
        uniqueIds(b.prompts, ["blocks", i, "prompts"], "prompt");
        b.prompts.forEach((p, j) => {
          uniqueIds(p.blanks, ["blocks", i, "prompts", j, "blanks"], "blank");
          // Two entries that normalize alike are one answer written twice.
          p.blanks.forEach((blank, k) => {
            const seen = new Map<string, string>();
            for (const a of blank.accept) {
              const key = normalizeBlankAnswer(a);
              const first = seen.get(key);
              if (first !== undefined)
                issue(
                  ["blocks", i, "prompts", j, "blanks", k, "accept"],
                  `"${a}" duplicates "${first}" (case, whitespace and quote style are ignored)`,
                );
              else seen.set(key, a);
            }
          });
          const tokens = p.code.split("___").length - 1;
          if (tokens !== p.blanks.length) {
            issue(
              ["blocks", i, "prompts", j, "blanks"],
              `${tokens} '___' token(s) but ${p.blanks.length} blank definition(s)`,
            );
          }
        });
      }
    });
  });

/**
 * A track is an ordered list of units. It carries no `skills` of its own: its tags are the
 * deduped union of its units' (docs/tags-design.md), so the two can never drift apart.
 */
export const Track = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    slug: z.string().min(1), // must equal the track's folder name (checked by pnpm validate)
    title: z.string().min(1),
    description: z.string().min(1),
    units: z.array(z.string()).min(1), // ordered unit slugs; each is a folder under units/
  })
  .strict();

/** Metadata for a coding challenge under content/challenges/<slug>/. */
export const Challenge = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    slug: z.string().min(1),
    title: InlineText, // shown as the challenge heading; README.md must not repeat it
    skills: z.array(z.string()).min(1),
    difficulty: Difficulty,
    estimatedMinutes: z.number().int().positive(),
    runner: z.enum(["in-browser", "external"]),
    entry: z.string().min(1), // the file the learner edits
    externalUrl: z.string().url().optional(), // StackBlitz/CodeSandbox, when runner = "external"
    /**
     * Extra npm packages the in-browser sandbox installs for this challenge only, as
     * `{ name: exactVersion }` (e.g. `{ "@tanstack/react-query": "5.62.0" }`). Pinned to an
     * exact version so a challenge that passes today still passes after the package ships a
     * breaking release. React and Testing Library are always provided and need no entry
     * (learning/sandbox.ts). Each one must also be a devDependency at the same version, so the
     * headless grader tests against what the sandbox loads.
     */
    dependencies: z
      .record(
        z.string().min(1),
        z.string().regex(/^\d+\.\d+\.\d+$/, "pin an exact version, e.g. 5.62.0"),
      )
      .optional(),
    // Shown as the "Your task" checklist; README.md must not repeat it. Each one is asserted by
    // a test in the grader (PLAYBOOK → quality checklist).
    acceptanceCriteria: z.array(InlineText).min(1),
  })
  .strict()
  .superRefine((challenge, ctx) => {
    if (challenge.runner === "external" && !challenge.externalUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalUrl"],
        message: 'externalUrl is required when runner is "external"',
      });
    }
  });

/**
 * content/catalog.json — the order tracks appear in on the home page. Like `track.units` for
 * units, it is the only thing that makes a track visible: a track folder missing from it fails
 * `pnpm validate`.
 */
export const Catalog = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    tracks: z.array(z.string()).min(1),
  })
  .strict();

export type Track = z.infer<typeof Track>;
export type Unit = z.infer<typeof Unit>;
export type Block = z.infer<typeof Block>;
export type Challenge = z.infer<typeof Challenge>;
export type Catalog = z.infer<typeof Catalog>;
