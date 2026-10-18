# Whetstone — portfolio write-up

Copy for the Web Wizard Dev portfolio site (`web-wizard-dev-v2`), resumes and posts. It
describes the project **as of 2026-10-18, commit `3330f0b`** (branch `main`, clean; the same
commit as `origin/main` and production). Every number in it has a row in
[Evidence](#evidence) with the command or file to re-check it. Run `/portfolio-writeup
numbers` to refresh them.

Our own product, live and public at `https://whetstone-tawny.vercel.app` (the owner chose public
and indexable, 2026-10-17). One user so far: the owner. There are no accounts, no analytics and
no backend, so there is no usage number to claim. The results below are what was built and
measured on the live site, not outcomes for learners. Docs-only PR #44
(`docs/post-deploy-2026-10-18`) is open; it records the 2026-10-18 production checks this
write-up cites.

## Before publishing

Decided (owner, 2026-10-18): publish it now, as a learning site. The entry has no `draft` flag.
The items below are follow-ups, not blockers.

1. **Screenshots.** None exist yet (see Screenshots to capture). Without them the card shows a
   designed cover, which is fine, but a lesson app sells on its screens.
2. **The link.** The owner plans to move Whetstone to a `webwizarddev.com` subdomain soon (like
   `sincewhen.webwizarddev.com`). Until then `externalLink` is the `vercel.app` address. On the
   move, change `externalLink` here and `lib/seo.ts` → `SITE_URL` in Whetstone in the same
   change, or the canonicals and sitemap point at the old host.
3. **The Flag links.** Every block on the live site has a "Flag" link that opens a new-issue form
   on the private `zackhanni/whetstone` repo. A visitor from the portfolio who clicks one gets
   GitHub's 404. Decide: hide Flag for visitors, or accept it. The feature has never been used
   (0 issues), so the entry describes no feedback loop.
4. **AI authorship is stated.** The entry says the lessons were written by AI agents and checked
   by a separate reviewer agent. Confirm you want that public (Sincewhen's entry discloses AI help
   the same way). The lesson prose keeps em dashes and some stock words by your choice
   (`docs/seo.md` → "kept on purpose"): a visitor who clicks through will read them.
5. **Merge PR #44**, so the 2026-10-18 production checks this cites (47 of 47 challenges in real
   Sandpack against the live site; PSI 100s) are on `main`, not only on a branch.
6. **Re-measure accessibility with saved progress (M7).** The live runs used an empty browser.
   The home page shows progress bars and a "continue" card only once progress exists. Seed a
   throwaway profile with made-up progress and re-run the home and a track page before the
   tile goes public.

---

## One-line pitch

A study app for software engineers: 83 short lessons in 16 tracks, with 47 coding challenges
that run and grade in the browser.

## The problem

Learning senior engineering topics means reading docs, blog posts and videos that disagree
with each other, and the version a behavior depends on is rarely named. Reading is also not
practice: knowing what `useEffect` does is different from fixing a broken one under time
pressure, and an exercise that only checks that an answer was given teaches little.

The goal was one place to practice across the whole stack, on a phone in spare minutes and at a
desk before an interview, with:

- lessons short enough for one sitting, each with a clear "after this you can" goal,
- explanations checked against the official docs for a named version,
- coding exercises that run real code and catch the obvious wrong fix,
- a timed mode for recall practice, and progress that needs no account,
- a way to write and correct dozens of lessons quickly without letting errors in, since one
  person was writing all of them.

Before the content phase merged on 2026-10-17, the app had 3 tracks, 14 lessons and 10
challenges.

## What it does

- **16 tracks, 83 lessons.** From JavaScript and TypeScript fundamentals, React and TanStack
  to HTTP, NestJS, databases, testing, web security, Git, systems design and infrastructure.
  Each lesson opens with 2 to 5 things you will be able to do after it and ends with the
  official docs it was checked against: 711 sources across the 83 lessons.
- **Readings at three levels.** Simple, medium and complex examples of the same idea, one at
  a time, so a reader can start easy and go deeper.
- **Practice with explanations.** 590 multiple-choice questions and 333 fill-in-the-blank
  prompts, graded automatically (a typed answer matches whatever its case, spacing or quote
  style), and 220 predict-the-output snippets that show the answer to compare against. Every
  item explains why, so a wrong answer still teaches.
- **Coding challenges in the browser.** 47 challenges with an editor, a live preview, hints and
  a Run tests button, graded by their own tests (320 across all challenges). Nothing to
  install.
- **Browse or Drill.** Browse is untimed, with readings and answers visible, for reading on a
  phone. Drill hides the readings, times the attempt, scores it and keeps your best and recent
  results.
- **Progress without an account.** Progress bars per track and lesson and a "continue where
  you left off" card, saved only in the browser. No sign-up and no analytics.
- **An interest filter.** Pick the topics you care about and the matching tracks move to the
  front, using a checked list of tags.
- **Lessons written and checked by AI agents.** Lessons are plain files. The repo's own
  lesson-writing commands have one AI agent draft a unit and a separate reviewer agent re-run
  its code samples against pinned library versions. A schema, a validator and the challenge
  graders run on every deploy, and a failing check blocks it.

## Ready-to-paste portfolio entry

A **new** entry (no Whetstone entry exists in `web-wizard-dev-v2`). Paste it into `allProjects`
in `lib/portfolio-data.ts`, after the Sincewhen entry so the two own products sit together. It
is published, not a draft (owner, 2026-10-18).

```ts
  // Whetstone
  {
    slug: "whetstone-learning-platform",
    ownProduct: true,
    title: "Whetstone: Engineering Lessons with In-Browser Coding Challenges",
    description:
      "A study app for software engineers: 83 lessons in 16 topic tracks, with quizzes, timed drills and 47 coding challenges that run and grade in the browser.",
    outcome:
      "A practice app that turns 16 engineering topics into 83 short lessons, with quizzes, timed drills and 47 coding challenges graded by real tests in the browser.",
    industry: "Developer education",
    overview:
      "Whetstone is a study app for software engineers, public on the web. Its 83 lessons are grouped into 16 tracks, from JavaScript fundamentals and React to databases, web security, systems design and infrastructure. Each lesson states what you will be able to do after it, explains the idea through examples at three levels, then tests it with quizzes, fill-in-the-blanks, predict-the-output snippets and, where the skill is code, a challenge that runs and is graded in the browser. The lessons are plain files written by AI agents through the project's own authoring commands, fact-checked by a separate reviewer agent that re-ran their code against pinned library versions, and checked by a schema, a validator and the challenge graders on every deploy. There is no account and no backend: progress stays in the browser.",
    features: [
      {
        title: "16 tracks, 83 lessons",
        icon: "folder",
        description:
          "From JavaScript and TypeScript fundamentals, React and TanStack to HTTP, NestJS, databases, testing, web security, Git, systems design and infrastructure. Each lesson opens with 2 to 5 things you will be able to do after it and ends with the official docs it was checked against: 711 sources across the 83 lessons.",
      },
      {
        title: "Readings at three levels",
        icon: "file",
        description:
          "Simple, medium and complex examples of the same idea, one at a time, so a reader can start easy and go deeper.",
      },
      {
        title: "Practice with explanations",
        icon: "list-checks",
        description:
          "590 multiple-choice questions and 333 fill-in-the-blank prompts, graded automatically (a typed answer matches whatever its case, spacing or quote style), and 220 predict-the-output snippets that show the answer to compare against. Every item explains why, so a wrong answer still teaches.",
      },
      {
        title: "Coding challenges in the browser",
        icon: "code",
        description:
          "47 challenges with an editor, a live preview, hints and a Run tests button, graded by their own tests (320 across all challenges). Nothing to install.",
      },
      {
        title: "Browse or Drill",
        icon: "clock",
        description:
          "Browse is untimed, with readings and answers visible, for reading on a phone. Drill hides the readings, times the attempt, scores it and keeps your best and recent results.",
      },
      {
        title: "Progress without an account",
        icon: "lock",
        description:
          "Progress bars per track and lesson and a \"continue where you left off\" card, saved only in the browser. No sign-up and no analytics.",
      },
      {
        title: "An interest filter",
        icon: "sliders",
        description:
          "Pick the topics you care about and the matching tracks move to the front, using a checked list of tags.",
      },
      {
        title: "Lessons written and checked by AI agents",
        icon: "pencil",
        description:
          "Lessons are plain files. The project's lesson-writing commands have one AI agent draft a unit and a separate reviewer agent re-run its code samples against pinned library versions. A schema, a validator and the challenge graders run on every deploy, and a failing check blocks it.",
      },
    ],
    categories: [PortfolioCategory.App],
    sectors: [],
    services: ["software-development"],
    scope: [
      "Product design",
      "Content schema and validation",
      "In-browser code grading",
      "AI authoring workflow",
      "Accessibility",
      "Technical SEO",
      "Security headers",
      "Automated testing",
    ],
    platforms: ["Web"],
    technologies: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "shadcn/ui",
      "Sandpack",
      "Zod",
      "Zustand",
      "Vitest",
      "Playwright",
      "Vercel",
    ],
    metrics: [
      { value: "83", label: "Lessons across 16 topic tracks" },
      { value: "47", label: "Coding challenges graded in the browser" },
      { value: "96 to 100", label: "Accessibility score on the live home page" },
    ],
    externalLink: "https://whetstone-tawny.vercel.app",
    year: "2026",
    duration: "Jun 2026 to present",
    challenges: [
      "Study material for senior engineering topics is scattered across docs, posts and videos that disagree, and the library version a behavior depends on is rarely named, so it is easy to learn something that is no longer true.",
      "Reading about code is not practice. Exercises had to run real code, in the browser, with tests that catch the obvious wrong fix as well as a missing one.",
      "One person was writing every lesson. AI can draft lessons quickly, but AI-written lessons are often confidently wrong, and dozens of them had to stay correct as libraries change.",
      "The same lesson had to work for reading on a phone in a few spare minutes and for timed recall practice before an interview.",
      "With no backend, the browser holds all progress, and a public site still had to be fast, accessible and readable by search engines.",
    ],
    solutions: [
      "Every lesson lists the official docs it was checked against and names the version in its text. A docs-backed review of the first three tracks found 47 claims to fix; 46 were fixed and 1 was rejected with a reason.",
      "Challenges run in Sandpack, an in-browser code runner, against tests written for each one. A check proves every starter fails and every solution passes, and the reviewer tries the obvious shortcut on each grader so it can't pass.",
      "Lessons are plain files with a strict schema. One AI agent drafts each unit through the project's authoring commands, a separate reviewer agent re-runs its code samples against pinned versions, and the validator and graders run on every deploy, so a broken lesson can't ship.",
      "Each lesson has two modes: Browse shows readings and answers untimed; Drill hides the readings, times the attempt and keeps the best and recent scores.",
      "Every page is generated ahead of time and progress is saved in the browser. The code runner loads only when it scrolls near view, and accessibility, search metadata and a content security policy were added and measured on the live site.",
    ],
    results: [
      "The content phase merged on 2026-10-17 took the app from 3 tracks, 14 lessons and 10 challenges to 16 tracks, 83 lessons and 47 challenges: 590 quiz questions, 333 fill-in-the-blank prompts and 220 predict-the-output snippets in all.",
      "All 47 challenges pass their starter-fails, solution-passes check in the real in-browser runner against the live site, and headlessly on every deploy (320 tests in all).",
      "Accessibility went from 96 to 100 on the live home page, and accessibility, best practices and SEO all score 100 on each of the 4 page types measured (home, a track, a challenge lesson, a reference-card lesson).",
      "Challenge pages load 48% less script (453 to 235 KB), because the code runner now loads only when it scrolls near view.",
      "Every lesson cites the official docs it was checked against: 711 sources across 83 lessons. A docs-backed review of the first three tracks found 47 claims to fix: 46 fixed, 1 rejected with a reason.",
      "143 automated tests, a content validator and the challenge graders run on every Vercel build, and a failing check blocks the production deploy.",
      "Built with an AI coding assistant: lessons drafted and reviewed by separate AI agents, and the content rules checked automatically on every deploy.",
    ],
  },
```

### Notes on that entry

- **Slug** `whetstone-learning-platform` is new (no existing entry). Alternatives if you prefer
  the Sincewhen pattern of naming what it is: `whetstone-coding-lessons-app`.
- **Published without `draft`** (owner, 2026-10-18). Update `externalLink` when the subdomain
  is live.
- **`metrics`**: three tiles. The first two are scale numbers (what the product holds), not
  results for users; there are no user results to show (one user, no analytics). The third is a
  real before and after on the live site. If you'd rather show only measured results, drop the
  first two and the page falls back to the first 3 `results`.
- **`categories`**: `App` only. Sincewhen also has `Mvp`, which puts it on
  `/industries/startups`; Whetstone isn't a startup MVP, so it's left out. Add it if you want it
  there.
- **`services`**: Custom Software only. Each service page shows up to 3 tagged projects, so
  tagging more would put a personal study tool on client-facing service pages.
- **`technologies`** has no AI tool and no versions. Add "Claude Code" if you want the AI
  workflow named in the logo tiles.
- **`cover` / `gallery`** are left out until the screenshots exist (`docs/portfolio.md` →
  Updating, step 5).
- **The 96 to 100 tile** pairs PSI on production before the round (home, main `e350053`,
  2026-10-17) with PSI and a local Lighthouse run on production after it (main `3330f0b`,
  2026-10-18). Re-check it with saved progress loaded before publishing (Before publishing).
- **Not claimed:** performance scores (PSI lab 92-99, one run each; no field data), any
  "self-improving" or feedback loop (the Flag links have never produced an issue), a screen
  reader pass (not done), how long the content phase took (commit times span about 16 hours
  on 2026-10-17, but the authoring started in scratch clones before that, so the duration is
  unknown).
- **Security wording** is limited to what is served on production (security headers and a
  content security policy, checked with `curl` on 2026-10-18). Nothing about audits or
  dependency monitoring.

## Resume bullets

- Built Whetstone, a public study app for software engineers: 83 lessons in 16 tracks and 47
  in-browser coding challenges graded by 320 tests, scoring 100 for accessibility on every page
  type measured on the live site.
- Designed an AI authoring workflow with automated gates: a strict content schema, a
  cross-file validator and headless graders run on every Vercel build, so a challenge whose
  starter passes or solution fails cannot deploy.
- Grew the catalog from 14 to 83 lessons and from 10 to 47 challenges in one content phase,
  with a separate reviewer agent re-running each unit's code against pinned library versions.
- Ran a docs-backed accuracy review of the first 3 tracks: 47 wrong or version-dependent claims
  found, 46 fixed and 1 rejected with a reason; 711 official sources cited across all lessons.
- Cut script loaded on challenge pages by 48% (453 to 235 KB) by mounting the Sandpack runner
  only near the viewport, and raised live home-page accessibility from 96 to 100.

Stack: Next.js (App Router, static generation), React, TypeScript, Tailwind CSS, shadcn/ui,
Sandpack, Zod, Zustand, Vitest, Playwright, Vercel.

## Screenshots to capture

Save to `web-wizard-dev-v2/public/portfolio_images/whetstone-learning-platform/` (the doc's
`<slug>` rule; Sincewhen used a short folder name instead, either works). Cover and gallery at
1600×1000, cropped from the top; one phone shot at about 390×844, since Browse mode is meant
for phones. Capture from the live site in a **fresh browser profile**, so the progress shown
is made-up, not yours, and say "(sample progress)" in any caption that shows bars or scores.
No personal data is involved: there are no accounts.

| File | Screen | What it should show |
| --- | --- | --- |
| `home.jpg` (cover) | `/` | The track catalog with a few progress bars filled (made-up progress) and the "continue" card at the top |
| `reading.jpg` | a unit page, e.g. `/learn/async-javascript/cancellation-and-races` | The objectives at the top and a reading block with its Simple / Medium / Complex tiers |
| `challenge.jpg` | `/learn/react-hooks-and-rendering/use-state-and-functional-updates`, scrolled to the runner | Editor, preview and the tests panel after Run tests (a mix of passing and failing tests reads better than all green) |
| `drill.jpg` | the same unit in Drill mode, finished | The score and time, best and recent attempts (made-up attempts) |
| `quiz.jpg` | any unit's quiz or fill-in-the-blank block | An answered question with its explanation showing |
| `mobile-browse.jpg` | a unit in Browse mode at 390px | The phone layout of a reading |

Hide nothing else: there is no dev badge or captcha on production. Avoid the Flag links being
the focus of a shot while they still lead to a 404.

## Short versions

**Tweet-length:** Whetstone: a study app for software engineers. 83 short lessons in 16
tracks, quizzes with explanations, a timed drill mode and 47 coding challenges that run and
grade in your browser. No account needed.

**Two sentences:** Whetstone is a public study app for software engineers: 83 lessons in 16
tracks, from JavaScript and React to databases, security and infrastructure, each checked
against the official docs. Its 47 coding challenges run and grade in the browser, and every
deploy proves each starter fails and each solution passes.

## Numbers still to get

- **Your own use** — ask the owner: "Do you study with Whetstone? Roughly how many lessons
  have you finished, and is there a drill where your score or time improved?" (Owner-reported;
  the only user number this project can have until accounts exist.)
- **How long the content phase took** — ask the owner: "From starting the content phase to
  merging PRs #15-#33 on 2026-10-17, how many days was it, and about how many of your hours?"
  Hours stay not public until you clear them.
- **Performance on the live site** — 3 PSI runs per page on a day the PSI quota allows (one
  run each gave 92-99 on 2026-10-18). Only worth a tile at 95 or more.
- **Accessibility with progress loaded** — Before publishing, item 6.
- **Visitors** — none measured (no analytics, no CrUX data). Only if you add analytics or
  submit the sitemap in Search Console (an open owner action).

## Evidence

| Claim | Value | Source (how to re-check) | Checked |
| --- | --- | --- | --- |
| Tracks, lessons and challenges live | 16 tracks, 83 lessons (units), 47 challenges | `content/catalog.json` (16 entries); `ls -d content/tracks/*/units/* \| wc -l` = 83; `ls content/challenges \| wc -l` = 47; `pnpm validate` ("challenges: 47 checked", "All content valid") on `main` `3330f0b`, which is production | 2026-10-18 |
| Before the content phase | 3 tracks, 14 lessons, 10 challenges | `git ls-tree -r --name-only e4fb5f9 -- content/tracks \| grep -c '/units/[^/]*/unit.json'` = 14; `ls-tree -d` on `content/tracks/` = 3 and `content/challenges/` = 10. `e4fb5f9` is the PR #14 merge, the last before content PRs #15-#33 (all merged 2026-10-17, `gh pr list --state all`) | 2026-10-18 |
| Assessment items | 590 quiz questions, 333 fill-in-the-blank prompts, 220 predict-the-output snippets | Sum over every `content/tracks/*/units/*/unit.json`: `len(questions)` for `quiz` blocks, `len(prompts)` for `fill-blank`, `len(snippets)` for `predict-output` (79, 78 and 72 blocks) | 2026-10-18 |
| Official sources | 711 sources across 83 lessons | Sum of `len(sources)` over every `unit.json`; `learning/schema.ts` requires at least 1 per unit | 2026-10-18 |
| Objectives per lesson | 2 to 5 | `learning/schema.ts`: `objectives: z.array(InlineText).min(2).max(5)` | 2026-10-18 |
| Challenge tests | 320 tests across 47 challenges | `pnpm test:challenges`: "All 47 in-browser challenges: starter fails, solution passes", summing each line's "solution passes N/N" | 2026-10-18 |
| Live in-browser check | 47 of 47 challenges pass in real Sandpack against the live site | `docs/handoff.md` on branch `docs/post-deploy-2026-10-18` (PR #44, open): "all 47 challenges pass in real Sandpack against the live site" (main `3330f0b`). Re-run: `BASE_URL=https://whetstone-tawny.vercel.app pnpm test:challenges:browser` (spaced, one run; Vercel's firewall challenges fast polling) | 2026-10-18 |
| Unit tests | 143 tests in 9 files | `pnpm test` on `main` `3330f0b`: "Tests 143 passed (143)" | 2026-10-18 |
| Gate on every deploy | `pnpm check && pnpm build` | `vercel.json` → `buildCommand`; `package.json` → `check` = lint, typecheck, validate, test, test:challenges | 2026-10-18 |
| Home accessibility, before → after (live) | 96 → 100 (+4 points) | Before: PSI lab, mobile, production home on main `e350053` before the pagespeed round: 91 / 96 / 100 / 100 (`docs/pagespeed-audit.md` → Field data). After: PSI lab 100 (`docs/pagespeed-audit.md` on PR #44's branch → "Production after deploy") and local Lighthouse 12.8.2, mobile, against `https://whetstone-tawny.vercel.app/`: accessibility 100 | 2026-10-18 |
| Live Lighthouse, 4 page types | accessibility / best practices / SEO 100 / 100 / 100 on each of 4 | `npx -y lighthouse@12 <url> --only-categories=accessibility,best-practices,seo --form-factor=mobile --chrome-flags="--headless=new"`, one run each (deterministic), on `/`, `/learn/react-hooks-and-rendering`, `/learn/react-hooks-and-rendering/use-state-and-functional-updates`, `/learn/reference-cards/http-status-codes`; empty browser (no saved progress) | 2026-10-18 |
| Script on a challenge page | 453 → 235 KB (48% less) | Before: `docs/pagespeed-audit.md` P6, local production build, median of 3, before the runner was deferred. After: re-measured live, Lighthouse 12 `--only-audits=resource-summary` on the `use-state-and-functional-updates` page: 12 scripts, 240,799 bytes (235 KiB), 0 third-party requests. (453 − 235) / 453 = 48.1% | 2026-10-18 |
| Content review of the first three tracks | 47 findings: 46 fixed, 1 rejected with a reason | `docs/content-review.md` → "Open findings: None. All 47 findings ... were fixed (or, for one, rejected with the reason in its PR)"; `docs/lesson-changelog.md`: 21 (React Hooks, PR #16), 14 (State & Data Flow, PR #15), 12 (NestJS, PR #17) | 2026-10-18 |
| Production is public, with headers | 200; CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy | `curl -sS -o /dev/null -D - https://whetstone-tawny.vercel.app/` (one request) | 2026-10-18 |
| No analytics | no analytics package; CSP `connect-src 'self'` | `package.json` dependencies; the CSP header above | 2026-10-18 |
| Duration | first commit 2026-06-17; first production deploy 2026-07-04; latest 2026-10-18 | `git log --reverse --date=short` (`c300330`); `gh api "repos/zackhanni/whetstone/deployments?environment=Production"` (18 deployments). Commits per month: Jun 22, Jul 41, Aug 4, Sep 0, Oct 170, so "to present" yes, "continuous" no | 2026-10-18 |
| Content-phase commit span (not public) | 128 commits, 2026-10-17 02:06 to 18:22 EDT | `git log e4fb5f9..e350053 --no-merges --date=iso-local`. Commit times, not authoring time: authoring ran in scratch clones first | 2026-10-18 |
| Performance, live (not public) | PSI lab 92 / 99 / 94 / 93 (home, track, challenge, card), one run each | `docs/pagespeed-audit.md` on PR #44's branch. One run each: not publishable as a score | 2026-10-18 |
| Feedback issues (not public) | 0 issues ever | `gh issue list --state all` on `zackhanni/whetstone` (repo private) | 2026-10-18 |
