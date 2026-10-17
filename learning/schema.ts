import { z } from "zod";

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
export const SCHEMA_VERSION = 2;

export const Difficulty = z.enum(["intro", "core", "advanced"]);

const Identified = z.object({ id: z.string().min(1) });

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

/** One multiple-choice question. `answer` references option id(s), so options shuffle freely. */
export const QuizQuestion = Identified.extend({
  prompt: z.string().min(1),
  options: z
    .array(z.object({ id: z.string().min(1), text: z.string().min(1) }).strict())
    .min(2),
  answer: z.union([z.string(), z.array(z.string()).min(1)]), // option id(s); array => multi-select
  explanation: z.string().min(1), // ALWAYS required: wrong answers must teach
  shuffleOptions: z.boolean().default(true), // false to pin order ("all of the above", ordered steps)
}).strict();

export const FillBlankItem = Identified.extend({
  prompt: z.string().min(1),
  code: z.string().min(1), // contains `___` tokens, one per blank, in order
  blanks: z
    .array(z.object({ id: z.string().min(1), accept: z.array(z.string()).min(1) }).strict())
    .min(1),
  explanation: z.string().min(1),
}).strict();

/**
 * Predict-output is self-graded: the learner compares their prediction with `answer` (and any
 * `acceptable` phrasings, shown alongside it) and marks themselves right or wrong.
 */
export const PredictItem = Identified.extend({
  code: z.string().min(1),
  question: z.string().min(1),
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

    // Rule 3, the part a machine can check: readings open the unit and challenges close it.
    // (Whether each assessment is harder than the last is still the author's judgment.)
    const firstNonReading = unit.blocks.findIndex((b) => b.type !== "reading");
    const firstChallenge = unit.blocks.findIndex((b) => b.type === "challenge");
    unit.blocks.forEach((b, i) => {
      if (b.type === "reading" && firstNonReading !== -1 && i > firstNonReading)
        issue(["blocks", i], `reading "${b.id}" comes after an assessment — readings open the unit`);
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
    title: z.string().min(1),
    prompt: z.string().min(1), // short; the long form lives in README.md
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
    acceptanceCriteria: z.array(z.string()).min(1),
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

export type Track = z.infer<typeof Track>;
export type Unit = z.infer<typeof Unit>;
export type Block = z.infer<typeof Block>;
export type Challenge = z.infer<typeof Challenge>;
