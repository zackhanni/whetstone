# Cards & variable lesson depth — proposal

> Status: **proposal** (not built). Lets a "lesson" range from a single flash-card-style reminder
> to a full mastery unit, with a lightweight `card` as the atomic building block. Captures the
> reuse debate honestly — including where reuse is *not* worth it yet.

## Motivation

Not every lesson needs the full ladder (reading tiers → quiz → fill-blank → predict → challenge).
Some concepts are best served as a **reminder**: a bit of info + one example, flash-card style.
Small cards can **bloom** into full lessons over time as they connect to other topics, and a big
future content dump should be **cheap to author broadly, then selectively deepened** — not
all-or-nothing.

This is already the direction of travel: the ROADMAP has a **Reference cards** track and a
**Swipe feed** micro-learning mode. Cards are the shared primitive under both.

## The schema is already most of the way there

A unit requires only `blocks: min(1)` — **no challenge or quiz is required today.** The one thing
blocking a true flash card is that a `reading` block forces all three tiers (simple/medium/complex,
enforced by `validate.ts`). That rule is load-bearing for mastery lessons ("nail the simple version
first") and should stay. A card is a different pedagogical animal — a reminder, not a graded ladder —
so it earns its own block type rather than weakening `reading`.

## The model: a `card` block type

A `card` = a short concept + one example (info, not an assessment). Like `reading`, its prose/code
lives in an `.mdx` file (frontmatter `id` + `title` + `tags`) so we don't cram code into JSON —
but with **no tier requirement**: a flat card, not a Simple/Medium/Complex ladder.

- A **flash-card lesson** = a unit whose block(s) are `card`s.
- **Blooming** = appending blocks (`quiz`, `predict-output`, `challenge`) to that same unit. No
  migration, no rewrite — the "blocks compose, grow when a real need appears" principle already in
  the PLAYBOOK.
- In the **swipe feed**, a card is the "review this" counterpart to the existing "answer this"
  assessment items — same one-item-at-a-time surface.

**Additive & non-breaking:** existing units don't use `card`, so **no `SCHEMA_VERSION` bump** and no
cross-lesson sweep — just the new type, a validator case, and a changelog line.

## Reuse: "one card in several lessons" — yes, but not yet, and not for every card

This is the part to be careful with. "A card is a building block reusable across lessons" is
architecturally clean, but making **every** card a shared, referenced entity is a classic
over-engineering trap. Pushback, then a plan.

**Pushback:**

- **Indirection has a cost.** Today content is mostly inline and readable — you open `unit.json`
  (and its `.mdx`) and see the lesson. A shared card means a slug + a registry + reference
  resolution for a *tiny* payload. Challenges are referenced because they're heavy (multi-file +
  tests); a card is light. Don't borrow the heavy pattern for the light case by default.
- **Reuse may be rarer than it feels.** Two lessons touching `useEffect` usually want *different*
  framing, ordering, and emphasis — not the identical card. The **tag graph already expresses
  overlap**; it doesn't require the same physical card in both places. Premature sharing trades
  simplicity for a reuse that may not materialize (the PLAYBOOK's explicit bias: *don't reshape data
  in anticipation*).
- **Sharing creates coupling.** Edit a shared card and it changes everywhere — great for a canonical
  fact, bad when one lesson's context needed a tweak. You lose per-lesson tailoring.

**Where reuse *is* genuinely worth it:** atomic **reference facts** — "HTTP 429 = Too Many
Requests", "a `WeakMap` key must be an object." One canonical card, legitimately referenced by a
rate-limiting lesson *and* an HTTP-status lesson *and* the swipe feed. This is exactly the
**Reference cards** track. So the split is:

- **Explanatory cards** (tied to a lesson's narrative) → inline. Duplicate the rare overlap; cheap.
- **Reference cards** (canonical, context-free facts) → the reuse case; worth referencing.

**Phased plan (simple-first, door left open):**

1. **Now:** `card` is an **inline** block, authored in the unit. Gets flash-card lessons + the swipe
   feed working with zero reference machinery. The swipe feed pulls a **flat cross-unit index** of
   card + assessment blocks — a *query*, not a new storage model.
2. **When reuse is real** (reference-card track, or a demonstrated duplicate): graduate to a
   **referenced** card — `content/cards/<slug>.mdx`, referenced by slug from a unit — following the
   **exact pattern challenges already use**. Because we'll give the inline and standalone card the
   *same shape*, "extract to shared" is a mechanical refactor (like extracting a component), and it's
   still additive/non-breaking.

Net: keep one content model, prove reuse before paying for it, and when we do pay, reuse a pattern
already in the codebase.

## Depth is derived, not declared

Don't add a "depth"/"complexity" field — **infer it from block composition** (single source of
truth, can't drift):

- only `card`/`reading` blocks, no assessment/challenge → **card / stub**
- has a `challenge` → **full lesson**

The UI badges them ("Card" vs "Lesson"); the swipe feed surfaces cards; all derived. The *one* case
for an explicit marker is an editorial **worklist** ("cards we intend to promote") — that's intent,
not shape, so a tiny optional `status: "stub"` earns its place only for that.

## Progress semantics

A card has nothing to grade → it contributes to a **"reviewed / seen"** count, not
mastery/completion (the same distinction the swipe-feed note already draws). If/when a card becomes
shared, "seen" is keyed by the card's id, so reviewing it in one place marks it seen everywhere —
a feature, but note the coupling.

## PLAYBOOK reconciliation

The PLAYBOOK's core line — "a lesson earns its place only if it changes what the learner can *do*" —
is about **mastery** lessons. This introduces an explicit **second tier**: *reference / reminder*
(cards) vs *mastery* (full). Both are legitimate; the PLAYBOOK should name both and say when to reach
for each. Cards are for breadth, orientation, and as bloom-seeds.

## Curation: the "big dump, be choosy" workflow

1. **Dump breadth-first as cards** — one info + example each, tagged. Fast.
2. **Promote the few that deserve it** by appending blocks. Signals: concept difficulty (advanced →
   deserves a challenge), interview-frequency, 👎 / "I want to practice this" feedback, and
   **centrality in the tag graph** (topics many others relate to — measurable from the taxonomy we
   built). `/improve-lesson` could nominate promotions.

Cards + tags reinforce each other: a card tagged `useEffect` surfaces whenever someone browses that
tag, so "small lessons bloom as we relate them to other topics" *is* the tag graph doing its job.

## Open questions / decisions

- **Inline vs referenced card first?** Recommendation: **inline** (above). Confirm before speccing.
- **Card file shape.** `.mdx` with frontmatter (`id`, `title`, `tags`) mirroring `reading`, minus
  tiers — agree?
- **Do card tags live on the card or the unit?** Leaning **on the card** (so a card carries its own
  tags into the swipe feed / a future shared registry); the unit's tags then include its cards'.
- **Two-sided ("front/back") or single-face card?** Single-face info+example is simplest; a
  quiz-like front/back is arguably just a 1-item quiz. Probably keep cards single-face and let
  `quiz` cover front/back.
