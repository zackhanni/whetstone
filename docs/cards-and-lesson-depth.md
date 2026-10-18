# Cards & variable lesson depth

> v1 is built (2026-10-17). "What v1 built" is the current state; the rest is the design record,
> and still guides shared cards and the swipe feed.

## What v1 built

The design's open questions were resolved simple-first:

- **A `cards` block is a deck: a folder of card files**, `units/<unit>/cards/NN-name.mdx`, each
  with `id` + `title` frontmatter, the same as a reading example minus the tiers. One block holds
  as many cards as the topic needs, so a 10-code reference unit is one block, not ten.
- **Inline only.** No shared `content/cards/` yet; that waits for real reuse.
- **No tags on cards.** The unit's `skills` stay the single source of tags. Card-level tags
  arrive only if the swipe feed needs to filter individual cards. If that happens, generalize the
  existing rule rather than adding a second one: the lowest-level item owns its tags and parents
  derive by union (card → unit → track); update `docs/tags-design.md` to say so then.
- **Single-face.** Info plus one example; a front/back card is a one-item quiz.
- **Depth is derived** (`lib/depth.ts`) and shown as "Card / Lesson / Full" on the track page
  and the unit header.
- **Progress.** A unit with no questions completes on its first visit, so a card unit can't
  hold a track below 100% or stay in "Continue" forever. The unit hides its Drill toggle
  (nothing to drill), and cards are hidden in drill mode like readings.
- **Ordering.** Cards are teaching material: the schema lets readings and cards come in any
  order before the assessments.
- **Size.** `pnpm validate` warns when a card passes 150 words or 1 code block; past that it
  has become a reading example.
- **Not built yet:** shared/referenced cards, the swipe feed, and the editorial `status: "stub"`
  worklist.

## Motivation

Not every lesson needs the full ladder (reading tiers → quiz → fill-blank → predict → challenge).
Some concepts are best served as a **reminder**: a bit of info + one example, flash-card style.
Small cards can **bloom** into full lessons over time as they connect to other topics, and a big
future content dump should be **cheap to author broadly, then selectively deepened** — not
all-or-nothing.

The Reference Cards track uses them today, and the planned swipe feed would too: cards are the
shared primitive under both.

## Why a separate block, not a lighter reading

A unit needs only one block (`blocks: min(1)`), but a `reading` block requires all three tiers
(simple/medium/complex, checked by `checkReadingTiers` in `learning/validate-content.ts`). That
rule is load-bearing for mastery lessons ("nail the simple version first") and stays. A card is a
reminder, not a graded ladder, so it got its own block type instead of weakening `reading`.

## The model

A card is a short concept plus one example (info, not an assessment): an `.mdx` file like a
reading example, with no tiers.

- A **card unit** is a unit whose only block is `cards`.
- **Blooming** is appending blocks (`quiz`, `predict-output`, `challenge`) to that same unit: no
  migration, no rewrite (the PLAYBOOK's "blocks compose, grow when a real need appears").
- In the **swipe feed**, a card would be the "review this" counterpart to the "answer this"
  assessment items, on the same one-item-at-a-time surface.

Adding the block type was additive, so it needed no `SCHEMA_VERSION` bump.

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

1. **Built (v1):** cards are inline, authored in the unit. The swipe feed, when built, pulls a
   **flat cross-unit index** of card + assessment blocks: a *query*, not a new storage model.
2. **When reuse is real** (reference-card track, or a demonstrated duplicate): graduate to a
   **referenced** card — `content/cards/<slug>.mdx`, referenced by slug from a unit — following the
   **exact pattern challenges already use**. Because we'll give the inline and standalone card the
   *same shape*, "extract to shared" is a mechanical refactor (like extracting a component), and it's
   still additive/non-breaking.

Net: keep one content model, prove reuse before paying for it, and when we do pay, reuse a pattern
already in the codebase.

## Depth is derived, not declared

Don't add a "depth"/"complexity" field — **infer it from block composition** (single source of
truth, can't drift). The rule is a **precedence ladder**, evaluated top-down so every permitted
block combination lands in exactly one bucket:

1. has a `challenge` → **full** (mastery — proves transfer)
2. else has a `reading` **or** any assessment (`quiz` / `fill-blank` / `predict-output`) →
   **lesson** (teaches/checks, but no transfer challenge yet — a prime *promotion* candidate)
3. else (only `cards` blocks) → **card**

This deliberately puts `reading` in **lesson**, not **stub** — `reading` is the mastery-oriented,
three-tier block, so a reading-only unit is a real lesson, just one still missing its challenge. A
unit with a quiz but no challenge is likewise a **lesson**, not "unclassified."

The UI badges them ("Card" / "Lesson" / "Full"); the swipe feed would surface cards; all derived. The
*one* case for an explicit marker is an editorial **worklist** ("cards we intend to promote") —
that's intent, not shape, so a tiny optional `status: "stub"` earns its place only for that.

## Progress semantics

A card has nothing to grade, so a card unit completes on its first visit (`nextEntry` in
`lib/progress.ts`); otherwise it would hold its track below 100% and stay in "Continue" forever.
Per-card "reviewed / seen" counts are still a design, for the swipe feed. If a card becomes
shared, key "seen" by the card's id, so reviewing it in one place marks it seen everywhere: a
feature, but it couples the lessons.

## PLAYBOOK reconciliation

Done: the PLAYBOOK names both kinds of unit, reference (cards) and mastery, and when to reach for
each (`learning/PLAYBOOK.md` → "Two kinds of unit: mastery and reference").

## Curation: the "big dump, be choosy" workflow

1. **Dump breadth-first as cards** — one info + example each, tagged. Fast.
2. **Promote the few that deserve it** by appending blocks. Signals: concept difficulty (advanced →
   deserves a challenge), interview-frequency, 👎 / "I want to practice this" feedback, and
   **centrality in the tag graph** (topics many others relate to — measurable from the taxonomy we
   built). `/improve-lesson` could nominate promotions.

Cards + tags reinforce each other: a card tagged `useEffect` surfaces whenever someone browses that
tag, so "small lessons bloom as we relate them to other topics" *is* the tag graph doing its job.
