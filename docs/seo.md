# SEO

Cumulative: each `/seo` run adds a dated round. Earlier rounds record decisions; don't re-file
one unless something changed.

## Round 1 — 2026-10-17 — scope: all

**Scope:** the three page templates (home, track, unit) and every page they build (100 URLs:
home, 16 tracks, 83 units), `sitemap`/`robots`, and the `writing.md` copy check over all 102
built HTML files. The site is public and indexable by the owner's choice (security-audit S1).

**Starting state:** every page shared one title ("Whetstone") and one description; no
`metadataBase`, canonical, sitemap, robots.txt, Open Graph image or structured data. Already
right: one `h1` per page, and every lesson's text in the server HTML (static generation), which
is what search and AI crawlers read.

### Findings

| # | Sev | Finding | Status |
| - | --- | ------- | ------ |
| 1 | High | All pages had the same title and description | Applied |
| 2 | High | No `metadataBase`, canonical, sitemap or robots.txt | Applied |
| 3 | Medium | No Open Graph data or image (link previews were blank) | Applied |
| 4 | Medium | No structured data | Applied: WebSite, BreadcrumbList |
| 5 | Low | Page chrome used arrows and em dashes | Applied |
| 6 | Decision | ~1,850 em dashes in lesson prose | Kept (owner) |
| 7 | Low | Generic home description | Applied |

**How it's built.** `lib/seo.ts` holds the address (`SITE_URL`, the one place to change for a
custom domain), the name and description, `pageMetadata()` (title, description, canonical, Open
Graph and Twitter card; `path` is required so no page ships without a canonical) and the JSON-LD
builders; `components/json-ld.tsx` renders them. A small module on purpose, not the shared
`lib/seo` toolkit: there is no business entity, local data or service pages to model.

1. **Titles and descriptions.** Root template `%s · Whetstone`. Track: its title, and its
   description cut to about 155 characters at a sentence end (`. `, so "Next.js" doesn't count)
   or a word. Unit: its title, and its first objective plus "Part of <track>." Markdown ticks are
   stripped. Result: 100 unique titles and descriptions, descriptions 99–156 characters. 18 unit
   titles run past 65 characters with the suffix; search results truncate them, which is fine.
2. **Address.** `metadataBase` and every canonical, the sitemap (100 URLs) and robots.txt
   (allow all, sitemap link) use `https://whetstone-tawny.vercel.app`, which answers 200 with no
   redirect.
3. **Open Graph.** `app/opengraph-image.tsx` generates one card at build time (name, description,
   track and unit counts from the catalog). Each page's `openGraph` repeats the image, because a
   page's own `openGraph` replaces the layout's (Next merges metadata shallowly).
4. **Structured data.** WebSite on home; BreadcrumbList (Whetstone › track › unit) on track and
   unit pages. Course markup left out: Google's Course rich results need provider and offer
   details this site would have to invent.
5. **Copy in the chrome.** Back, previous/next and pager arrows are lucide chevrons (`aria-hidden`;
   the pager buttons keep their `aria-label`); the external-challenge link uses an external-link
   icon. Three UI sentences lost their em dashes.
6. **Lesson prose (decision).** The check found 1,875 em dashes, 11 en dashes and about 280
   arrows in lesson text and code, on 101 of 102 pages. **Kept:** these are technical lessons, not
   marketing copy, so `writing.md`'s rules aren't applied to them. 19 meta descriptions inherit a
   dash or arrow from a track description or an objective; same decision.
7. **Home description:** "Lessons, drills and in-browser coding challenges for the skills senior
   web engineers use: React, TypeScript, HTTP, Next.js, databases, testing and security." (meta
   only; the visible subtitle is unchanged).

Stock-word hits in lesson text (read in context, kept): realm 9, "whether you" 3, ensure 3,
robust 2, additionally 2, crafted 1.

### Verification

Local production build: titles, descriptions, canonicals, `og:*` and `twitter:card` read from the
served HTML of all 100 sitemap URLs; JSON-LD parsed; `/robots.txt`, `/sitemap.xml` and
`/opengraph-image` (PNG, 1200×630) served. Lighthouse (1 run, mobile): SEO, accessibility and best
practices 100 on all four measured pages. The CSP still logs 0 violations with the JSON-LD in the
page. `pnpm check` (143 tests) and `pnpm build` green; `lib/seo.test.ts` covers the description
clipping and the metadata shape.

### Found after deploy (2026-10-18)

Checked on production (main 3330f0b): titles, canonicals, Open Graph, JSON-LD, robots.txt, the
100-URL sitemap and the preview image all serve; PSI lab SEO 100 on the four measured pages.

**Open: only the first reading example of each tier is in the server HTML.** The reading block
shows one example per tier and swaps in the next on "Next example", so on
`/learn/async-javascript/cancellation-and-races` the second simple and complex examples (with
their links to `/learn/react-hooks-and-rendering/...`) are absent from the HTML, present only in
the React payload. Google renders JavaScript and may still read them; most AI crawlers don't. Fix
idea: render every example and hide the inactive ones with CSS, so the view stays one at a time.

### Owner actions

- After this ships: submit `https://whetstone-tawny.vercel.app/sitemap.xml` in Google Search
  Console, and check a unit page in the Rich Results Test (breadcrumbs).
- Not checked: Vercel Firewall bot rules (whether AI crawlers are challenged). Settings → Firewall.
