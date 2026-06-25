import { z } from "zod";

/**
 * The Whetstone content schema — the single source of truth for what a lesson is.
 *
 * Design bias: keep it simple. Store content in canonical (unshuffled) form; let the app
 * decide how much to show and in what order at render time. Every example/question/option
 * carries a stable `id` so that randomization is reliable and future features
 * (rate-to-reorder, pick-N) need no migration — just a new optional field + app logic.
 *
 * When the shape needs to change, bump SCHEMA_VERSION and run the cross-lesson sweep as
 * its own commit (see learning/PLAYBOOK.md → "The self-improvement loop").
 */
export const SCHEMA_VERSION = 1;

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
});

/** One multiple-choice question. `answer` references option id(s), so options shuffle freely. */
export const QuizQuestion = Identified.extend({
  prompt: z.string().min(1),
  options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2),
  answer: z.union([z.string(), z.array(z.string()).min(1)]), // option id(s); array => multi-select
  explanation: z.string().min(1), // ALWAYS required: wrong answers must teach
  shuffleOptions: z.boolean().default(true), // false to pin order ("all of the above", ordered steps)
});

export const FillBlankItem = Identified.extend({
  prompt: z.string().min(1),
  code: z.string().min(1), // contains `___` tokens, one per blank, in order
  blanks: z.array(z.object({ id: z.string().min(1), accept: z.array(z.string()).min(1) })).min(1),
  explanation: z.string().min(1),
});

export const PredictItem = Identified.extend({
  code: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  acceptable: z.array(z.string()).optional(), // other accepted phrasings
  explanation: z.string().min(1),
});

/**
 * Assessment blocks each hold a LIST of items (1..n) — one rule, no exceptions.
 * A single question is just a one-item list. The app shows every item by default, shuffles
 * their order, and shuffles each question's options (keyed by id). Showing a random subset
 * / difficulty mix is a future, non-breaking addition (see PLAYBOOK → "Designed to grow").
 */
export const QuizBlock = Identified.extend({
  type: z.literal("quiz"),
  questions: z.array(QuizQuestion).min(1),
});

export const FillBlankBlock = Identified.extend({
  type: z.literal("fill-blank"),
  prompts: z.array(FillBlankItem).min(1),
});

export const PredictOutputBlock = Identified.extend({
  type: z.literal("predict-output"),
  snippets: z.array(PredictItem).min(1),
});

/** Coding challenge — real files in content/challenges/<slug>/, referenced by slug. */
export const ChallengeBlock = Identified.extend({
  type: z.literal("challenge"),
  challengeSlug: z.string().min(1), // -> content/challenges/<slug>/
  mode: z.enum(["in-browser", "external"]), // hybrid runner reads this
});

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
    slug: z.string().min(1),
    title: z.string().min(1),
    skills: z.array(z.string()).min(1),
    difficulty: Difficulty,
    estimatedMinutes: z.number().int().positive(),
    blocks: z.array(Block).min(1), // ordered; difficulty escalates down the array
  })
  .superRefine((unit, ctx) => {
    const uniqueIds = (items: { id: string }[], path: (string | number)[], label: string) => {
      const seen = new Set<string>();
      items.forEach((it, j) => {
        if (seen.has(it.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, j, "id"],
            message: `duplicate ${label} id "${it.id}"`,
          });
        }
        seen.add(it.id);
      });
    };

    uniqueIds(unit.blocks, ["blocks"], "block");

    unit.blocks.forEach((b, i) => {
      if (b.type === "quiz") uniqueIds(b.questions, ["blocks", i, "questions"], "question");
      if (b.type === "predict-output") uniqueIds(b.snippets, ["blocks", i, "snippets"], "snippet");
      if (b.type === "fill-blank") {
        uniqueIds(b.prompts, ["blocks", i, "prompts"], "prompt");
        b.prompts.forEach((p, j) => {
          const tokens = p.code.split("___").length - 1;
          if (tokens !== p.blanks.length) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["blocks", i, "prompts", j, "blanks"],
              message: `${tokens} '___' token(s) but ${p.blanks.length} blank definition(s)`,
            });
          }
        });
      }
    });
  });

export const Track = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  skills: z.array(z.string()).min(1),
  units: z.array(z.string()).min(1), // ordered unit slugs
});

/** Metadata for a coding challenge under content/challenges/<slug>/. */
export const Challenge = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  slug: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1), // short; the long form lives in README.md
  skills: z.array(z.string()).min(1),
  difficulty: Difficulty,
  estimatedMinutes: z.number().int().positive(),
  runner: z.enum(["in-browser", "external"]),
  stack: z.array(z.string()).min(1), // e.g. ["react","ts"] -> Sandpack template
  entry: z.string().min(1), // the file the learner edits
  testCommand: z.string().optional(), // for local/external runs
  externalUrl: z.string().url().optional(), // StackBlitz/CodeSandbox, when runner = "external"
  acceptanceCriteria: z.array(z.string()).min(1),
}).superRefine((challenge, ctx) => {
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
