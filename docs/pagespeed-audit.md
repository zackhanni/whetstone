# PageSpeed & Lighthouse Audit — Whetstone

Cumulative: each `/pagespeed` run adds a dated round. Toolchain: `scripts/pagespeed/` (from the
shared skill's templates), targets in `pagespeed-targets.json`, local state in `.pagespeed/`
(gitignored). Measure a production build, never `pnpm dev`:

```bash
pnpm build && pnpm exec next start -p 3418
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  node scripts/pagespeed/lh-run.mjs --preset=mobile --runs=3
```

## Round 1 — 2026-10-17 — Standard preset

Scope: tier 1 (`/`) and tier 2 (a track page, a challenge unit, a card unit), mobile, median of 3,
on a local production build of `skills/pass-2026-10-17` (Next 16.3.8, CSP on). Plus PSI on
production (which runs `main`), a console check on production, and a keyboard pass.

### Scoreboard — mobile, median of 3 (before → after)

| Page | Tier | Perf | A11y | BP | SEO | LCP (simulated) | CLS | TBT |
| ---- | ---- | ---- | ---- | -- | --- | --------------- | --- | --- |
| `/` | 1 | 94 → **99** | 95 → **100** | 96 → **100** | 100 | 2.26 s → 2.26 s | 0.137 → **0** | 11 → 5 ms |
| `/learn/react-hooks-and-rendering` | 2 | 99 | 95 → **100** | 96 → **100** | 100 | 1.96 s | 0 | 5 → 8 ms |
| `/learn/react-hooks-and-rendering/use-state-and-functional-updates` | 2 | 94 → 95 | 95 → **100** | 96 → **100** | 100 | 2.95 → 2.88 s | 0 | 136 → **38 ms** |
| `/learn/reference-cards/http-status-codes` | 2 | 95 → 97 | 94 → **100** | 96 → **100** | 100 | 2.88 → 2.41 s | 0 | 99 → 90 ms |

Perf moves of 1-3 points and LCP moves under 10% are inside the noise floor (±5 / ±10%): no
measurable change. LCP is simulated: the observed LCP equals FCP on every page (54-236 ms on
localhost), and the LCP element is text, so the 2-3 s figures are Lighthouse's model of a slow
phone, not a measured delay.

### Production after deploy (2026-10-18, main 3330f0b)

PSI lab, mobile, one run each: home 92 / 100 / 100 / 100, track 99 / 100 / 100 / 100, challenge
unit 94 / 100 / 100 / 100, card unit 93 / 100 / 100 / 100 (perf / a11y / BP / SEO). Before the
round, production home was 91 / 96 / 100 / 100. Console check on production: 0 errors, 0
warnings on all four pages.

### Field data (CrUX)

None at URL or origin level (too little traffic). Unmeasured, not a pass. PSI lab on production
home (`main`, before these fixes): 91 / 96 / 100 / 100.

### Manual accessibility pass — keyboard only

| Page | Keyboard | Screen reader | Contrast | Findings |
| ---- | -------- | ------------- | -------- | -------- |
| `/` | ✅ every control reachable in reading order, focus visible | not run | ✅ after P2 | — |
| challenge unit | ✅ after P5 (blanks and Sandpack's file tab had weak or no focus) | not run | ✅ after P2 | P5 |

Radio groups and the mode toggle are single tab stops with arrow keys (Radix). The Sandpack code
editor doesn't trap Tab. Not covered: screen reader, zoom/reflow, the interest-filter dialog's
focus return.

### Findings — applied

| id | Sev | Cat | Page(s) | Cause | Fix | Measured |
| -- | --- | --- | ------- | ----- | --- | -------- |
| P1 | High | Perf/CLS | `/` | `components/continue-learning.tsx` rendered nothing until progress loaded, then inserted a card above the tracks (148 px) | Render the first unit's card until progress loads | CLS 0.137 → 0, perf 94 → 99 |
| P2 | Medium | A11y | all | Small text in `text-slate-500` (4.05-4.23:1) and `text-slate-600` (2.54:1); white on sky-600 (4.0-4.1:1: mode toggle, runner tabs, `--primary` buttons); white on emerald-600 success buttons (3.65:1); Sandpack's dark-theme comment colour (3.96:1) | `text-slate-400`; sky-700 (5.9:1); emerald-700 (5.4:1); Sandpack theme with comment `#8a8a8a` (5.3:1) | color-contrast passes on all 4 pages |
| P3 | Low | A11y | units | Card and example titles were `h4` with no `h2`/`h3` above | Section labels are `h2`; card and example titles `h3` | heading-order passes |
| P4 | Low | BP | all | `/favicon.ico` 404 | `app/icon.svg` | BP 96 → 100 |
| P5 | Low | A11y | units | Blank inputs showed focus only as a 1 px border colour; Sandpack's file tab had none | `focus-visible` ring on blanks; `.sp-tab-button:focus-visible` outline (`!important` over Sandpack's generated class) | focus visible on both |
| P6 | Medium | Perf | units with a challenge | The runner's chunk (~210 KB) loaded with every unit page | Mount the runner only within 800 px of the viewport; placeholder sized to the runner (968 px stacked up to 768 px, 506 px from 769 px) | TBT 136 → 38 ms, scripts 453 → 235 KB; 0 shift while mounting at 412 and 1280 px |

P6 changes when the runner exists: `scripts/check-challenges-browser.ts` scrolls to
`[data-challenge-runner]` first.

### Not fixed

- **Render-blocking CSS** (~150 ms simulated, one stylesheet): normal for this setup; no action.
- **Unused JS on every page** (~25 KB of a 70 KB chunk, ~23 KB of a 58 KB Radix chunk): shared
  framework/UI code, below the noise of the score.

### Deliberately out of scope

Desktop preset, tier 3 (all other track and unit pages share these templates), a screen-reader
pass, and a console check of this branch on production (production runs `main`; checked there:
only the favicon 404, fixed by P4).
