# Security audit

Cumulative: each `/security-audit` run adds a dated round. Earlier rounds record decisions;
don't re-file an accepted finding unless something changed.

## Round 1 — 2026-10-17 — scope: whole repo

### Threat model

No backend, no sign-in, no personal data. The assets are the lesson content (public by the owner's
choice), the private GitHub repo (named in the Flag links), and each learner's progress in their
own browser's localStorage. Trust boundaries: browser and the static site; the app's origin and
Sandpack's cross-origin bundler iframes on `*.codesandbox.io`, where learner code runs.

### Severity index

| # | Finding | Severity | Status |
| - | ------- | -------- | ------ |
| S1 | Production domain is public and indexable; docs assumed private | Medium | Decided: stay public and indexable |
| S2 | `next@16.2.9`: 17 advisories (3 critical), none reachable here | Low | Fixed: 16.3.8 |
| S3 | shadcn CLI in `dependencies` (59 prod-audit advisories) | Low | Fixed: `devDependencies` |
| S4 | No security headers besides Vercel's HSTS | Low | Fixed: headers + static CSP |
| S5 | Dependabot alerts off for the repo | Low | Open: owner setting |

### Findings

**S1 — Production is public (Medium, OWASP A05).** `https://whetstone-tawny.vercel.app` answers
200 to anyone, with no robots.txt or noindex. The project's Deployment Protection is Vercel
Authentication, Standard Protection, which covers deployment URLs and previews but not the
production domain. Nothing sensitive is served (no backend, no data). **Decision (owner,
2026-10-17): keep it public and indexable**; `/seo` added to the skills pass.

**S2 — Next.js advisories (Low, OWASP A06).** `pnpm audit --prod` listed 17 Next.js advisories
fixed in 16.3.8, among them three critical RCEs. Every one needs a feature this app doesn't use
(server actions, middleware/proxy, image optimization, `next/og`, rewrites, a custom server,
Windows hosting) or affects only `next dev`. Upgraded to **16.3.8** (17 days old at the time; 16.4.2
was 2 days old and is skipped on purpose), with `eslint-config-next` to match.

**S3 — shadcn CLI as a runtime dependency (Low).** Only `shadcn/tailwind.css` is used, at build
time. Moved to `devDependencies` at the same 4.11.0 (Vercel installs dev dependencies; the build
already needs vitest). Production audit: 89 → 3.

**S4 — Security headers (Low, OWASP A05).** Added in `next.config.mjs` for production builds:
CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. The CSP
keeps `'unsafe-inline'` for scripts and styles because every page is prerendered (a nonce would
make every route dynamic); its value is pinning code, frames and requests to `'self'` plus
Sandpack's `*.codesandbox.io` frames, and `frame-ancestors 'none'`. Not applied in `next dev`
(fast refresh uses eval). Preview deployments load Vercel's toolbar from `vercel.live`, which this
policy blocks; production doesn't load it.

**S5 — Dependabot alerts off (Low, OWASP A06).** `GET /repos/…/vulnerability-alerts` answers 404.
Turn on in GitHub → Settings → Code security (owner action; a repo setting).

### Accepted, with reasons

- **3 remaining prod-audit advisories** (`browserslist`, `baseline-browser-mapping` under
  `next > styled-jsx > @babel/core`): build-time tooling whose input is this repo's own config.
- **Sandpack's bundler** is third-party code on `*.codesandbox.io`, versioned with
  `@codesandbox/sandpack-react`. Learner code runs there, cross-origin, so it can't read this
  origin's localStorage. Challenge packages are pinned exactly (the validator enforces it).
- **`/improve-lesson` reads GitHub issue bodies**, a prompt-injection channel. The repo is private,
  so only collaborators can open issues.

### Coverage record

- **Entry points:** 0 route handlers, 0 server actions, no `proxy.ts`/middleware; 102 static pages.
- **Secrets:** no environment variables in code or in the Vercel project; no tracked `.env`; git
  history (239 commits) scanned for key formats: one hit, the HTTP lesson's demo JWT.
- **Rendering:** `react-markdown` 10.1 without `rehype-raw` (no raw HTML; the default URL transform
  drops `javascript:` links); no `eval` or `new Function` in app code. One `dangerouslySetInnerHTML`, added by the `/seo` round the same day: `components/json-ld.tsx`, JSON from repo content with `<` escaped.
- **Client storage:** every localStorage read is guarded (`try`/`catch`, shape checks); writes
  ignore quota and private-mode errors.
- **Links out:** Flag links build the GitHub URL with `URLSearchParams` from content ids.
- **Platform:** Vercel Deployment Protection (Standard), no env vars, protected sourcemaps on; no
  GitHub Actions workflows; `vercel.json` runs `pnpm check && pnpm build` on every deploy.

### Verification

- CSP trialed against production before shipping (header injected into document responses,
  `securitypolicyviolation` listener, home, track, unit with a Sandpack run, cards): 0 violations.
  Control with `frame-src` removed: 1 violation, and the tests never ran.
- Local production build with the real header: headers present, 0 violations, tests run.
- Gates: `pnpm check` (136 tests, 47 headless challenges) and `pnpm build` green on 16.3.8.
- `pnpm test:challenges:browser`: 47/47 against the production build with the CSP
  (`BASE_URL=http://localhost:3418`), and 47/47 against `pnpm dev`. One earlier dev run stopped
  after 11 challenges on a page reload during a cold compile (right after deleting `.next`); the
  rerun on a warm server passed.
