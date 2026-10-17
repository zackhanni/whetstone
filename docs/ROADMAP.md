# Whetstone Roadmap

Status key: ✅ done · 🔨 in progress · ⬜ not started.

## Phases

### Phase 0 — Foundation (done)

- ✅ Content schema (`learning/schema.ts`) + authoring `PLAYBOOK.md`
- ✅ First vertical slice: `react-hooks-and-rendering` → `use-effect` (all 5 block types)
- ✅ Next.js app — **Browse** + **Drill** modes, file-based content loader, block renderers
- ✅ shadcn/ui (Radix) + accessibility pass
- ✅ Static generation, content path guards, content validator (`pnpm validate`)
- ✅ Next 16 + React 19 + ESLint flat config + `pnpm check` gate
- ✅ **In-browser challenge runner** — Sandpack editor + live preview + in-browser test
  grading (jest-style via `SandpackTests`, with a test seam in `api.ts`)
- ✅ Run `/new-lesson` end-to-end to author a 2nd unit (`use-state-and-functional-updates`) — loop proven; friction fed back into SKILL/PLAYBOOK

### Phase 1 — Solo, deployed

- ✅ Finish the React Hooks track (useState, useEffect, useRef, memoization, controlled-vs-uncontrolled)
- ✅ Track / unit index + navigation (home → track → unit)
- ⬜ Import the `software-engineer-job-test-folder` archive as tagged challenges
- ✅ Deploy to Vercel (PWA deferred — works in mobile browser as-is)
- 🔨 Drill polish — results history ✅ (best/recent attempts); per-unit time config ⬜
- ✅ Local-first progress tracking — dashboard, per-track/unit bars, "continue where you left off"
- ⬜ **Swipe feed** — a third study mode (alongside Browse + Drill) for micro-learning. Design note in "Planned features" below; build later.
- ✅ **Tags & interest filtering** — validated multi-parent taxonomy (`learning/taxonomy.ts`), rolled-up chips on cards, and an interest filter that soft-reorders the catalog (PR #9). Design record: `docs/tags-design.md`.
- ✅ **Lesson structure (2026-10-17, schema v3)** — every unit has 2–5 `objectives` (shown at the top) and official-docs `sources` (shown as "Further reading"); challenge title + acceptance criteria live only in meta.json (the app renders them; READMEs hold the problem + collapsible hints); multi-line `code` is an array of lines; fill-blank answers match ignoring case/whitespace/quotes; inline Markdown renders in prompts and options; track order in `content/catalog.json`; validator moved to `learning/validate-content.ts` with a test per check; "Flag" links open `lesson-feedback` GitHub issues for `/improve-lesson`.
- ⬜ **Content accuracy pass** — 47 findings from the sources backfill in `docs/content-review.md` (version drift, claims the docs contradict, internal contradictions). Do this before writing new units on the same topics.
- ✅ **Authoring-system hardening (2026-10-17)** — challenge graders run headlessly in `pnpm check` (starter must fail, solution must pass); schema v2 (`.strict()` objects, dead fields removed, quiz answers must name real options, block order checked); validator checks slugs vs folders, unlisted unit folders, globally unique unit slugs, reading-file rules, and every challenge folder; challenges may declare pinned `dependencies`.

### Phase 2 — Multi-user

- ⬜ Supabase auth
- ⬜ Progress tracking (per user, per block) — key it by **unit slug alone** (`pnpm validate` has required unit slugs to be unique across tracks since 2026-10-17), not today's `track/unit`, so moving a unit to another track keeps its progress
- ⬜ Ratings on examples/questions → rate-to-reorder
- ⬜ Issue reports + comments on lessons
- 🔨 Self-improvement loop wired to real feedback — ✅ "Flag" links open `lesson-feedback` issues that `/improve-lesson` reads (2026-10-17); ⬜ ratings and in-app comments need accounts

## Content tracks (the learning backlog)

Each track lists its planned units. A unit ≈ one `unit.json` + reading tiers + assessments (+ a
challenge where the skill is codeable). Units marked _card_ are candidates for the lightweight
`card` block (see Deferred) rather than a full mastery unit.

**How these get built:** author every new unit with the **`/new-lesson`** skill
(`.claude/skills/new-lesson`) — it scaffolds against `learning/schema.ts`, follows
`learning/PLAYBOOK.md`, and gates on `pnpm check` + `pnpm build`. Before the first unit of a
**new** track, outline all of its units below (one line each: what it teaches that its
neighbours don't). Edits to a unit that already
shipped (feedback in `content/feedback/`, a wrong explanation, a better example) go through
**`/improve-lesson`** (`.claude/skills/improve-lesson`) instead, which also fixes the schema/template
when the problem is general and sweeps it across lessons. Both append a line to
`docs/lesson-changelog.md`.

### Shipped

- ✅ **React Hooks & Rendering** — 7 units
  - ✅ useState, useEffect, useRef, memoization, controlled-vs-uncontrolled
  - ✅ **Debounced input & autosave with timers** (`debounced-input-and-autosave`) — `useRef` for the `setTimeout` handle, commit-on-blur, cancel-vs-flush on unmount, out-of-order saves, debounce vs throttle. Challenge: `debounce-autosave-title`. Sourced from the real `EditableTitle` snippet.
  - ✅ **Untangling a component with too many effects** (`untangling-effects`) — name each effect, derive → delete → fix deps/cleanup → extract; dep arrays, StrictMode double-invoke, prop→state sync vs `key`. Challenge: `untangle-description-editor`.
  - ⬜ _next:_ re-run the audit against the actual `EditableDescription.tsx` once it's pasted into `content/`, and fold any effect kind the lesson doesn't cover into the medium reading.
- ✅ **State & Data Flow** — 3 units
  - ✅ Choosing where state lives (local → lift → Context → client store → server state → URL)
  - ✅ **Context vs client store vs server state** (`context-vs-store-vs-server-state`) — who _owns_ a value, the failure mode of each wrong choice, and how one screen combines URL + query cache + store. Decision unit: reading + quiz + fill-blank, no challenge.
  - ✅ **Zustand basics** (`zustand-basics`) — `create`, atomic vs object selectors, `set` shallow-merge, `getState`/`setState` outside React, `persist` (`partialize`, `version`, hydration gate), testing a singleton. Challenge: `selector-store-subscription` (rebuild the hook on `useSyncExternalStore`).
  - ⬜ _now possible:_ a challenge that imports **real** `zustand` — challenges can declare pinned `dependencies` in `meta.json` (plus a matching devDependency). Worth it only if it teaches more than the hand-rolled store already does.
- ✅ **Backend with NestJS** — 4 units
  - ✅ **Nest vocabulary: the words before the wiring** (`nest-vocabulary`) — controller/service/module/provider, decorators as metadata that runs once, HTTP verbs + prefix-plus-path routes + `@Param`/`@Query`/`@Body`, the `constructor(private readonly x: T)` line unpacked, singleton = one shared instance, and a plain-words tour of middleware/guard/interceptor/pipe/filter. Authored from feedback that the DI unit assumed its own vocabulary.
  - ✅ **Modules, providers & the injector** (`nest-modules-and-providers`) — modules as registries, the four `@Module` keys, reading the "can't resolve dependencies" error, duplicate registration → two instances, tokens for interfaces, `useFactory`/`inject`, scopes vs state-on-a-singleton, `forwardRef` as a smell. No challenge (no `@nestjs/*` in the sandbox).
  - ✅ **DTOs & validation** (`nest-dtos-and-validation`) — the DTO as trust boundary, why the type alone validates nothing, `whitelist` as mass-assignment defence, coercion, `@ValidateNested` + `@Type`, `PartialType`, uniqueness as 409 in the service. Challenge: `nest-validation-pipe` (hand-rolled ValidationPipe).
  - ✅ **The request lifecycle** (`nest-request-lifecycle`) — guards → interceptors → pipes → handler → filters, `Reflector` + custom decorators, `map`/`tap`/`finalize` on `next.handle()`, 401 vs 403, one filter per exception, `APP_GUARD`/`APP_FILTER` for injectable globals.
  - ⬜ _untested:_ a challenge that imports `@nestjs/common` via `dependencies`. Nest also needs decorator metadata and `reflect-metadata`, which may not work in Sandpack's transpiler — prove a one-file spike in the browser before designing a unit around it. Fallback: a hand-rolled "compose the pipeline" challenge.

### Frontend

- ✅ **Data Fetching with TanStack** (`data-fetching-tanstack`), 6 units — TanStack Query v5 + TanStack Router v1, the library API (who *owns* server state is `context-vs-store-vs-server-state`'s job). Challenges import the real `@tanstack/react-query`.
  - ✅ **Query keys** (`query-keys`) — the key *is* the cache entry: array keys, deterministic hashing (object key order ignored, array order not), every `queryFn` input in the key, general→specific hierarchy and key factories, and what a prefix matches. Challenge: `query-keys-list-detail`.
  - ✅ **Query states** (`query-states`) — reading one query over time: `status` (is there data?) vs `fetchStatus` (is the `queryFn` running?), `isPending`/`isFetching`/`isLoading`, an error *with* data, empty vs loading, `placeholderData: keepPreviousData`, `staleTime` vs `gcTime`, the refetch triggers and the default `retry: 3`. Challenge: `query-states-todo-list`.
  - ✅ **Invalidation & cache writes** (`invalidation-and-cache-writes`) — the `QueryClient` calls you make after the server changed: `invalidateQueries` vs `refetchQueries` vs `setQueryData` vs `resetQueries`/`removeQueries`, query filters (prefix, `exact`, `type`, `predicate`), immutable writes, and when to write a response straight into the cache. Challenge: `cache-sync-handlers` (server-push handlers, DOM-free entry).
  - ✅ **Mutations** (`mutations`) — `useMutation` in a custom hook, `mutate` vs `mutateAsync`, hook-level vs call-level callbacks (call-level ones skip after unmount and fire once for consecutive calls), returning the invalidation promise to stay pending, `variables`/`reset`, no retries by default. Challenge: `mutation-save-button`.
  - ✅ **Optimistic updates** (`optimistic-updates`) — the cache recipe (`onMutate`: cancel, snapshot, write, return; roll back in `onError`; invalidate in `onSettled`), the v5 UI-only recipe via `variables`/`useMutationState`, and the races: an in-flight refetch and overlapping mutations. Challenge: `optimistic-toggle`.
  - ✅ **TanStack Router** (`tanstack-router`) — typed routes (code-based vs file-based), the registered router type that makes `Link`/`navigate` checked, `validateSearch` as typed URL state, `loaderDeps` + a loader that fills the Query cache before render (`queryClient.query({ …, staleTime: 'static' })`, formerly `ensureQueryData`). Challenge: `router-search-loader` (code-based routes on a memory history).
  - ✅ Browser run of all six challenges (2026-10-17, Sandpack in Chrome): every starter fails its planted-bug tests and every solution passes. These are the first challenges that declare `dependencies` (`@tanstack/react-query` 5.104.1; `router-search-loader` also `@tanstack/react-router` 1.170.41), so the `dependencies` feature is now proven in the browser.
- 🔨 **Async JavaScript & Timing** (`async-javascript`) — the framework-free language mechanics
  under the React units. `debounced-input-and-autosave` keeps the timer handle in a ref, unmount
  cleanup and the debounce-vs-throttle _choice_; `use-effect` keeps the `ignore` flag and abort in
  effect cleanup. These units link back to them and don't re-teach them.
  - ✅ **The event loop** (`event-loop`) — run-to-completion, one turn = one task → drain every
    microtask → maybe render; predicting the order of sync code, `setTimeout(0)`, `.then`,
    `queueMicrotask` and the code after `await`; why a long task or a self-requeuing microtask
    freezes input and paint, and chunking work; which orderings are host-specific (`setImmediate`,
    `process.nextTick`, `requestAnimationFrame`). Predict-heavy, no challenge.
  - ✅ **Timers in depth** (`timers`) — the delay is a minimum, not an appointment; nested-timeout
    clamping, background-tab throttling, the 2³¹−1 ms overflow; `setInterval` drift and overlap vs
    a recursive `setTimeout`; the handle in the DOM vs Node (`Timeout`, `unref`,
    `ReturnType<typeof setTimeout>`); extra arguments and `this`. Challenge:
    `polling-loop-stops-cleanly` (no overlap, survives a failed poll, stops mid-request).
  - ✅ **Debounce & throttle from scratch** (`debounce-and-throttle-from-scratch`) — both as plain
    closures: trailing vs leading edge, `maxWait`, `cancel()`/`flush()`, forwarding `this` and the
    _latest_ arguments, throttle as a debounce with `maxWait`. Challenge:
    `debounce-throttle-from-scratch`.
  - ✅ **Promises & async/await** (`promises-and-async-await`) — settle-once states, `then` returns a
    new promise, where a `catch` must sit, async functions always return promises, a missing
    `return`/`await`, sequential vs parallel `await`, `all` vs `allSettled` vs `race` vs `any`,
    unhandled rejections (Node exits by default). Challenge: `parallel-dashboard-loader`.
  - ✅ **Cancellation & races** (`cancellation-and-races`) — `AbortController`/`AbortSignal` threaded
    through plain functions, `fetch` abort and `signal.reason`, `AbortSignal.timeout()` and
    `AbortSignal.any()` (with support versions), telling `AbortError` from `TimeoutError` from a
    real failure, last-write-wins bugs, request ids vs aborting. Challenge:
    `latest-only-search-client`.
  - ✅ Browser run of the four challenges (2026-10-17, in a background tab where Chrome throttles timers): every starter fails and every solution passes, except that `debounce-throttle-from-scratch`'s burst test hit Sandpack's 5 s test timeout because each throttled sleep took ~1 s. No assertion failed; a re-run in headless Chrome (visible page, no throttling) passes 11/11. The two timing-heavy graders now wait for a condition or count calls, instead of using a fixed wall-clock window.
- ✅ **JavaScript & TypeScript Fundamentals** (`javascript-typescript-fundamentals`, first in the catalog) — 5 units, 4 challenges. The language layer every other track assumes. Intro/core, with an advanced edge in each complex tier.
  - ✅ **Maps, Sets, objects & arrays** (`maps-sets-objects-arrays`) — choosing the collection: `has`/`get` vs `includes`/`find` cost, object keys become strings while `Map` keys keep their type (SameValueZero), prototype keys like `"constructor"`, insertion order, `size`, a `Map` serialising to `{}`, dedupe with `Set`, `Object.groupBy`/`Map.groupBy` (ES2024), `WeakMap` in one line. Challenge: index/dedupe/count/serialise an order list.
  - ✅ **Shorthand syntax** (`shorthand-syntax`) — what each shorthand expands to: `?.`/`?.[]`/`?.()` short-circuiting the whole chain, `??` vs `||` on `0`/`""`/`false`, `??=`/`||=`/`&&=`, destructuring defaults (only `undefined` triggers them), rename, rest/spread, shorthand properties/methods, computed keys. Challenge: an options resolver that loses `0`, `""` and `null`.
  - ✅ **Equality & truthiness** (`equality-and-truthiness`) — values, not syntax: `===` vs `==` (the few coercions worth knowing), `Object.is` (NaN, -0), SameValueZero in `includes`, the falsy list and `{count && …}` rendering `0`, `null` vs `undefined` in TS (`?:` vs `| null`, `strictNullChecks`, JSON dropping `undefined`), objects compare by identity. React re-render identity stays in `memoization`.
  - ✅ **Narrowing & unions** (`narrowing-and-unions`) — types, not values: `typeof`/`in`/`instanceof`/equality narrowing, custom type guards as unchecked promises, discriminated unions + the `never` exhaustiveness check, enums vs unions (runtime objects, `const enum` under `isolatedModules`, TS 5.8 `erasableSyntaxOnly` and Node type stripping), `as const` objects, `satisfies`. Owns the enum language facts the Testing track links to. Challenge: parse an `unknown` payload into a discriminated union.
  - ✅ **Immutable updates** (`immutable-updates`) — changing data without changing the old copy: spread is shallow, nested updates, copying (`toSorted`/`toSpliced`/`with`, ES2023) vs mutating array methods, `structuredClone` and what it can't clone, `Object.freeze` is shallow, why mutation breaks React's `Object.is` bail-out and doubles a pushed item under StrictMode. Challenge: a todo reducer with planted mutations.
  - ✅ Browser run of each new challenge (2026-10-17): starter fails and _Show solution_ passes in Sandpack for `index-orders-with-maps`, `resolve-player-options`, `narrow-unknown-events` and `todo-reducer-mutations`. `todo-reducer-mutations`' preview wraps itself in `<StrictMode>` on purpose (the doubled todo is the symptom).
- ✅ **Dates & Time** (`dates-and-time`) — 5 units, in this order
  - ✅ **The Date object** (`date-api-basics`) — one machine, one zone: a `Date` is one number (ms since the epoch), the constructor forms and 0-indexed months, `getDate` vs `getDay`, setters that mutate and overflow (Jan 31 + 1 month), Invalid Date. Time zones are deliberately left to the next unit.
  - ✅ **UTC vs local time** (`utc-vs-local`) — one instant, many wall clocks: store UTC and render in the viewer's zone, `getHours` vs `getUTCHours`, offsets vs IANA zones, the server's zone vs the browser's (an SSR hydration mismatch), and a test that passes on UTC CI but fails on a laptop.
  - ✅ **Parsing & formatting** (`parsing-and-formatting`) — strings in and out: which ISO shapes parse as UTC and which as local, never parsing non-ISO strings with `Date`, `Intl.DateTimeFormat` (`timeZone`, `dateStyle`/`timeStyle`, `formatToParts`), `Intl.RelativeTimeFormat`.
  - ✅ **Date-only values & DST** (`date-only-and-dst`) — calendar dates that aren't instants: `YYYY-MM-DD` arithmetic in UTC days, 23- and 25-hour DST days, the date-only-vs-ISO-instant string prefix trap, and validating a real calendar date. Challenge: `date-only-helpers` (correct in every time zone).
  - ✅ _card:_ **Date libraries** (`date-libraries`) — when `Date` + `Intl` are enough, `date-fns` v4 (functions on `Date`), Luxon (a zone-carrying `DateTime`), `Temporal`'s shipping status, and why not Moment for new code.
  - ✅ Browser run of `date-only-helpers` (2026-10-17): starter fails 9/13 with both "used local time" trap messages, _Show solution_ passes 13/13 in Sandpack. Test names must be unique across `describe` blocks — Sandpack keys its results list by name (duplicates log a React key error).
  - ⬜ _later:_ when Safari ships Temporal (MDN "Limited availability" as of October 2026), refresh `date-libraries` → `temporal-status`, and consider a `Temporal.PlainDate` variant of the date-only challenge.

### Backend, network & data

- ✅ **HTTP & APIs in Practice** (`http-and-apis`) — 6 units, 4 challenges (2026-10-17). Boundaries: status-code _lookup_ is Reference cards (`http-status-codes`); token-storage _threats_ (XSS/CSRF) are Web Security; Next.js caching headers are Next.js & the Network.
  - ✅ **Request & response anatomy** (`request-response-anatomy`) — a request is text (request line, headers, blank line, body); safe vs idempotent per RFC 9110 and therefore what a client may resend on its own; `Content-Type` (what this body is) vs `Accept` (what I want back); reading a status by its class; one `Idempotency-Key` per operation to make a POST retry-safe. Challenge: `retry-safe-client`.
  - ✅ **curl as a debugging tool** (`curl-for-debugging`) — what `-i`/`-v`/`-s`/`-o` print and to which stream; what `-d` does to the method and `Content-Type`; `--json` (curl 7.82.0+); quoting JSON in zsh/bash and the `@` file trap; the signup → login → bearer GET flow with `-c`/`-b`; `-X`/`-L`/`-f` surprises. No challenge (a terminal skill the sandbox can't run).
  - ✅ **REST vs RPC vs gRPC** (`rest-rpc-grpc`) — decision unit: resource-shaped vs procedure-shaped APIs and what each gets from HTTP; gRPC's protobuf contract, HTTP/2, four call types, deadlines and why browsers need gRPC-Web; tRPC v11 as the TypeScript-monorepo middle ground; GraphQL in one paragraph. No challenge.
  - ✅ **Auth over HTTP** (`auth-over-http`) — how credentials travel: cookie sessions vs `Authorization: Bearer`; decoding a JWT by hand (signed, not encrypted); verifying one (pin `alg`, check the signature, then `exp` in seconds); 401 + `WWW-Authenticate` vs 403; refresh tokens and rotation; cookie attributes as mechanics only. Challenge: `bearer-token-guard`.
  - ✅ **CORS & preflight** (`cors-and-preflight`) — the same-origin policy and CORS as the server relaxing it; simple vs preflighted requests from the Fetch standard's safelists; credentials vs `*`; an exact-match allow-list with `Vary: Origin`; why curl never sees CORS and why it is not server-side protection. Challenge: `cors-allowlist`.
  - ✅ **Sync vs async APIs** (`sync-vs-async-apis`) — `202 Accepted` + a status URL; polling vs long-polling vs SSE vs WebSockets; webhooks verified with an HMAC over the raw body and a replay window; at-least-once delivery → handlers that dedupe by event id and record it only after the work succeeds; queues between "accepted" and "done". Challenge: `idempotent-webhook-handler`.
  - ✅ Browser run of all four challenges (2026-10-17, Sandpack in Chrome): starters fail (5/12, 4/9, 4/8, 4/6) and solutions pass. Web Crypto (`crypto.subtle`) works in the Sandpack iframe, so `bearer-token-guard` and `idempotent-webhook-handler` are proven there too.
  - ⬜ _follow-up:_ `request-response-anatomy` points to "the HTTP status codes reference deck" by name; link it once `reference-cards/http-status-codes` exists.
- ✅ **Next.js & the Network** (`nextjs-and-the-network`) — 4 units — targets Next.js 16 (App Router); each unit names what changed from 14/15 where an old habit would mislead
  - ✅ **Server Components, Server Actions & Route Handlers** (`server-components-actions-route-handlers`) — where each piece of code runs and what crosses the network: the `'use client'` boundary and serialisable props, a Server Action as a POST to the route that renders it (its own auth check; a `proxy.ts` redirect on that path eats it), Route Handlers for HTTP-shaped endpoints, `redirect()`/`notFound()` as throws a `catch` can swallow (`unstable_rethrow`). Which to reach for when. Challenge: `proxy-spares-server-actions`.
  - ✅ **Response headers, HTTP caching & compression** (`response-headers-caching-compression`) — the HTTP layer only (RFC 9111, not Next's server cache): `max-age` vs `s-maxage`, `private`/`public`, `no-cache` vs `no-store`, `stale-while-revalidate`, `ETag` + 304, `Vary`, gzip/brotli and who compresses; where Next 16 sets headers and which one wins (`next.config` `headers()` vs a Route Handler, on `next start` vs Vercel), and proving CDN caching with `x-vercel-cache`, not by reading `Cache-Control`. Challenge: `shared-cache-decision`.
  - ✅ **Next.js caching & revalidation** (`nextjs-caching-and-revalidation`) — Next's own server and client caches, not HTTP headers: Cache Components (`cacheComponents`, `use cache`, `cacheLife`, `cacheTag`), runtime APIs kept outside cached scopes, `updateTag` vs `revalidateTag(tag, 'max')` vs `revalidatePath` vs `refresh`, the client router cache; what changed from the Next 14/15 fetch-cache model; why a local `next start` is not evidence for Vercel.
  - ✅ **Streaming & Suspense** (`streaming-and-suspense`) — the response as a stream: static shell + `<Suspense>` holes (Partial Prerendering under Cache Components), `loading.tsx` vs granular boundaries, which `await` blocks the whole route, why the status code freezes at the first byte (`notFound()` mid-stream → 200 + `noindex`), and the buffering layers (nginx, compression, curl) that hide a working stream.
  - ✅ Browser run of `proxy-spares-server-actions` (starter 2/6 fail, solution 6/6) and `shared-cache-decision` (starter 5/7 fail, solution 7/7) in Sandpack, 2026-10-17.
  - ⬜ _follow-up:_ confirm on a real Vercel deployment the header-priority claim in `response-headers-caching-compression` (a Route Handler's `Cache-Control` beats `next.config` `headers()` on Vercel, the reverse on `next start`). The `next start` half was reproduced against Next 16.2's own `sendResponse`; the Vercel half rests on Vercel's Cache-Control docs.
- ✅ **Backend / NestJS** — 7 units: the first 4 under Shipped → Backend with NestJS, and these 3, appended after `nest-request-lifecycle` and written against Nest 12.1
  - ✅ **Controllers & routing** (`nest-controllers-and-routing`) — what the vocabulary unit's verbs and `@Param` don't cover: Express matches routes in registration order (`:id` shadows `me`, and a pipe can't rescue it), Nest 12's opt-in `routeConflictPolicy` / `routeResolutionStrategy`, default statuses (POST 201, an empty DELETE is 200), `@HttpCode`/`@Header`/`@Redirect`, what `@Res()` hands over (sending, interceptor output, serialization) vs `passthrough: true`, and URI/header versioning with `defaultVersion` and `VERSION_NEUTRAL`. Decision unit with predict-output, no challenge.
  - ✅ **Caching & rate limits with Redis** (`nest-redis-caching-and-rate-limits`) — cache-aside done right (TTL in ms, invalidate after the write, never cache a failure, collapse concurrent misses), `CacheModule` on cache-manager v7 + `@keyv/redis`, why `CacheInterceptor` keys on the URL, `@nestjs/throttler` v6 per-route/per-IP buckets and why in-memory storage and an untrusted proxy break the limit, sessions in Redis, and fail-open vs fail-closed per use when Redis is down. The lifecycle unit's `ThrottlerGuard`-as-a-guard and cache short-circuit are referenced, not retaught. Challenge: `nest-cache-aside`.
  - ✅ **Microservices & messaging** (`nest-microservices-and-messaging`) — `@MessagePattern`/`send()` vs `@EventPattern`/`emit()`, `send()` cold vs `emit()` hot, what errors look like across the wire (`RpcException`), `timeout()` without cancelling the remote work, transports by delivery guarantee (at most once vs at least once), idempotent handlers (stable event id, atomic claim, release on failure, in-flight duplicates), and the dual-write problem behind the outbox. Challenge: `nest-idempotent-event-handler`.
  - ✅ Browser run of `nest-cache-aside` and `nest-idempotent-event-handler` in Sandpack (2026-10-17): each starter fails 6/8, each solution passes 8/8.
  - ⬜ _recheck by 2027-01:_ `@nest-lab/throttler-storage-redis` 1.2.0 declares peers only up to Nest 11 (`npm install` on Nest 12 fails with `ERESOLVE`), and `@nestjs/idempotency` / `@nestjs/outbox` are 0.x — the Redis unit's medium reading and the messaging unit's complex readings name these versions.
  - ⬜ _docs vs behaviour, Nest 12.1.3:_ the controllers docs say `@Res()` loses `@HttpCode()`/`@Header()` (Nest still applies both before the handler), and the versioning docs say an unversioned route 404s once versioning is on (it's served without a version). Both hold on 11.2.7 too, and are noted in the controllers unit as checked-by-running; revisit if a Nest release changes either.
- ⬜ **Databases** — relational fundamentals (keys, joins, normalization, indexes, transactions); relational vs document vs graph; N+1 queries; migrations

### Quality, security & tooling

- ⬜ **Testing & Quality**
  - ⬜ **What to test and when** — the testing pyramid/trophy, what a test is _for_, cost vs confidence
  - ⬜ **Kinds of tests** — unit, integration, component, contract, e2e, smoke; what each catches
  - ⬜ **Anatomy & syntax** — `describe` / `it` / `test`, `expect` matchers vs node `assert`, arrange-act-assert, setup/teardown hooks, `.only`/`.skip`
  - ⬜ **Test doubles** — stub vs mock vs spy vs fake; mocking modules, timers (`vi.useFakeTimers`) and network
  - ⬜ **Designing code for testability** — pure functions, dependency seams, extracting logic out of components into its own importable file; _open question from the brain dump:_ the "you can't use enums in tests" claim (likely about `const enum` / erased-syntax + isolated transpilation, or enum identity across module boundaries) — verify before authoring, then teach the real rule
  - ⬜ Vitest specifics — config, jsdom vs node env, coverage
  - ⬜ Playwright e2e — selectors/`data-test-id`, waiting vs sleeping, flake, fixtures
- ⬜ **Web Security**
  - ⬜ **XSS** — how injected `<script>` runs with the victim's session; escaping vs sanitizing; `dangerouslySetInnerHTML`
  - ⬜ **CSP (Content-Security-Policy)** — the header as a browser-enforced allow-list; reading a real `script-src 'self' 'nonce-…' https://js.stripe.com …`; nonce vs hash vs `'unsafe-inline'` (and why `'unsafe-inline'` throws the protection away — the static-caching tradeoff); `report-only` rollout
  - ⬜ **OWASP Top 10 tour** — one card per item (injection, broken access control, auth failures, SSRF, …) with a "what it looks like in a TS/React/Node app" example
  - ⬜ CSRF, SameSite cookies, and token storage (cookie vs localStorage)
  - ⬜ Secrets & config hygiene — env vars, what never reaches the client bundle
  - ⬜ Other useful headers — HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame-ancestors
- ⬜ **Developer Tooling — Terminal, Git & GitHub**
  - ⬜ **Terminal survival kit** — paths, `cd`/`ls`/`cat`/`grep`, pipes & redirection, env vars, editing files without leaving the shell
  - ⬜ **Cloning & remotes without a GUI** — HTTPS vs **SSH** keys (`ssh-keygen`, agent, `~/.ssh/config`), `gh` CLI (`gh repo clone`, `gh pr create/checkout`), auth tokens
  - ⬜ **Everyday git** — status/add/commit/push, branches, `.gitignore`, reading `git log`/`git diff`
  - ⬜ **Git when things go wrong** — amend, `reset` (soft/mixed/hard), `restore`, `stash`, `revert`, recovering with `reflog`
  - ⬜ **Rebase vs merge**, resolving conflicts, keeping a branch current
  - ⬜ PR workflow — small commits, review comments, CI checks
- ⬜ **Reference cards** — HTTP 4xx/5xx codes (quiz-heavy); _card:_ common CLI flags; _card:_ regex basics

### Capstone

- ⬜ **Systems Design** — requirements → API shape → data model → caching → scaling; read/write paths; tradeoff interviews
- ⬜ **Infra** — Terraform, environments, CI/CD pipelines, observability basics (logs, metrics, tracing)

### Sourcing note

Some brain-dump items still need real source material before authoring: `EditableDescription.tsx`
should be pasted in (sanitized) so the effect-audit unit can be checked against the real thing, and
the `curl` signup/login exchange is the worked example for the `curl` unit. The `EditableTitle`
snippet has already been turned into `debounced-input-and-autosave`.

## Deferred / cross-cutting

- ✅ **Cards & variable lesson depth (v1, 2026-10-17)** — a `cards` block (a deck of one-idea cards), derived Card / Lesson / Full depth, card units complete on visit. Shared cards and the swipe feed are still ⬜. Was: a lightweight `card` block (info + example, flash-card style) so a "lesson" can range from a reminder to a full mastery unit, and cards can _bloom_ by appending blocks. Inline first; graduate to referenced/shared cards (challenge pattern) only when reuse is real. Proposal: `docs/cards-and-lesson-depth.md`.
- ⬜ zod 3 → 4 migration (`schema.ts`, `validate.ts`)
- ⬜ TypeScript 5 → 6
- ⬜ **Context → Zustand** for progress + drill history — the trigger fired when the interests store landed (the first Zustand store). Plan: `docs/zustand-migration.md`.
- ⬜ Pick-N / difficulty-mix quizzes (schema already supports the shape)
- ⬜ More "Go deeper" reading tiers across units
- ✅ CI — `vercel.json` makes every Vercel build run `pnpm check && pnpm build`, so a failing gate fails the PR's preview and blocks production, with no GitHub Actions minutes (2026-10-17)

## Planned features (design later)

### Swipe feed — "Reels/TikTok"-style quick practice

**Idea:** a vertical, one-question-at-a-time feed for when you have a few minutes and want quick
reps. Swipe up → a random question; answer it inline → immediate result + explanation; swipe up
again → the next one. Low-commitment micro-learning that complements the two existing modes
(Browse = read untimed, Drill = timed test). Not building now — capturing the plan.

**What it reuses:** the existing assessment renderers (`quiz`, `fill-blank`, `predict-output`)
in a single-item, "reveal after answer" mode. Readings and challenges are excluded from the feed
(too long for a card).

**Design questions to resolve before building:**

- **Sampling.** Start with uniform random across all assessment items; evolve toward weighted /
  spaced-repetition (favor unseen, previously-wrong, or low-rated items). Depends on the Phase-2
  ratings + richer progress data.
- **Item index.** Needs a flat, cross-track index of every assessment item (a new content query
  over tracks → units → blocks), tagged by skill so the feed can be filtered by track/skill.
- **Progress semantics.** Feed answers probably shouldn't count toward _unit completion_ (it's
  cross-unit) — track them as their own thing: a "practiced N today" count / streak. Pairs with a
  future streaks/XP store (and is a likely trigger for the Context → Zustand switch).
- **Session shape.** Endless scroll vs a capped "10-card session" with a little summary at the end.
- **Interaction.** Mobile-first vertical snap-scroll; arrow-key (↑/↓) navigation on desktop; no
  timer (each card self-grades on answer).
- **Persistence.** Per-item "seen/answered/last-result" state — localStorage first, Supabase later
  (same local-first → cloud path as progress).

## Conventions (quick reference)

- Content in `content/`; schema `learning/schema.ts`; pedagogy `learning/PLAYBOOK.md`.
- shadcn: never edit `components/ui/*` — wrap or re-theme (see `docs/shadcn-local-patches.md`).
- Gates: `pnpm check` (lint + typecheck + validate + test) and `pnpm build`.
