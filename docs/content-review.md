# Content review — known accuracy issues

Found on 2026-10-17 while backfilling every unit's `sources`. Each entry is a claim that the
official docs contradict, a claim that depends on a version without naming it, or a place where a
unit contradicts itself. **None are fixed yet**: this is the work list for the content phase.

Work through it with `/improve-lesson`, like feedback issues. Check each entry against the
unit's sources before changing anything (the finder was an AI reading the docs, and could be
wrong too), and delete the entry when its fix lands; the changelog line is the record. Paths are
relative to the unit folder unless they start with `content/`.

## react-hooks-and-rendering

### use-state-and-functional-updates

- `unit.json quiz-state/three-updates explanation`: says the result is 1 because 'React batches them'; per react.dev (State as a Snapshot) the 1 comes from every call reading the same snapshot, and batching only explains the single re-render (same conflation in reading/medium/01-batching.mdx and the use-state-fix-counter README)

### use-effect

- `unit.json predict-effects/effect-after-render explanation`: says effects 'fire AFTER paint'; react.dev useEffect caveats say an effect caused by an interaction (the click here) may run before the browser paints
- `unit.json predict-effects/effect-after-render answer`: assumes no StrictMode; under StrictMode in development (React 18+) the first mount runs the effect twice
- `reading/simple/01-derived-state.mdx`: 'React paints once with the old value' is stated as certain; react.dev only says it renders with the stale value, and whether that pass is painted depends on the trigger
- `reading/complex/01-fetch-race.mdx`: calls setting state after unmount a 'leak'; React 18 removed that warning because it is usually harmless (the real leak is the uncancelled request)
- `reading/complex/01-fetch-race.mdx`: 'In React Strict Mode (dev only), effects run twice on mount' does not name a version (React 18+)
- `reading/complex/01-fetch-race.mdx`: rethrowing inside .catch to 'surface real errors' produces an unhandled promise rejection; it does not reach React or an error boundary

### use-ref

- `reading/simple/01-mutable-ref.mdx`: the Timer example does renders.current += 1 in the render body; react.dev says not to write ref.current during rendering, and StrictMode's double render makes the count unreliable
- `reading/simple/02-dom-ref.mdx`: lists .focus() among things 'React has no declarative prop for'; `<input autoFocus>` focuses on mount
- content/challenges/use-ref-focus-input: README says you can't focus declaratively, and the tests only check document.activeElement, so `<input autoFocus>` passes without a ref or effect
- `reading/complex/01-latest-value-ref.mdx`: React 19.2 made useEffectEvent stable for exactly this case (the repo runs 19.2); the reading presents the ref as the fix without mentioning it

### memoization

- `reading/complex/01-usecallback-and-caveat.mdx + quiz-memoization/when-not-to-memo`: react.dev's memo/useMemo/useCallback pages now open with React Compiler (automatic memoization); the unit never mentions it
- `reading/simple/01-usememo-expensive.mdx`: 'runs the factory once, caches the result' overstates the guarantee; React may discard the cache and StrictMode calls it twice in development
- `content/challenges/memoization-stop-rerender/Child.tsx`: counts renders with renders.current += 1 during render; StrictMode (the Sandpack preview wraps App in it) can make the on-screen count disagree with the tests

### controlled-vs-uncontrolled

- `unit.json predict-warning/undefined-flip`: says the warning fires when user.name goes from undefined to a string after a fetch, but useState ignores initialState after the first render, so name stays undefined; the warning fires on the first keystroke instead
- `reading/complex/01-controlled-uncontrolled-warning.mdx`: same error; 'value={undefined} on render 1 -> value="Ada" on render 2' cannot happen with useState(user.name), and the useState(user.name ?? "") fix silences the warning but the loaded name never appears (same in fill-controlled/keep-value-defined)

### debounced-input-and-autosave

- `reading/complex/01-flush-race-and-throttle.mdx`: latest.current = { text, commit } is written during render (react.dev says not to), and calls it 'the same pattern you saw in the useRef unit', which refreshes the ref inside an effect
- `unit.json quiz-debounce/unmount-cleanup + predict-debounce/no-unmount-cleanup`: 'React no longer warns' does not name the version (React 18)

### untangling-effects

- `reading/complex/01-dep-arrays-strict-mode-and-extraction.mdx`: latest.current = onCommit is written during render (react.dev says not to); React 19.2's stable useEffectEvent is the documented tool here
- `unit.json quiz-untangle/stale-closure-deps`: presents a ref 'refreshed on every render' as correct without saying where to refresh it or mentioning useEffectEvent
- `unit.json predict-untangle/listener-accumulates`: answer 3 assumes no StrictMode; under StrictMode in development the uncleaned effect runs twice and the span shows 5

## state-and-data-flow

### choosing-where-state-lives

- `reading/complex/01-tradeoffs-and-antipatterns.mdx`: says persist 'gives you hasHydrated() to implement the same gate', but with sync storage (localStorage) Zustand hydrates at store creation, so hasHydrated() is already true on the first client render and cannot prevent the mismatch (the app's interests store uses useMounted for this reason)
- `reading/complex/01-tradeoffs-and-antipatterns.mdx`: the case study says Zustand comes 'the moment a second persisted store appears'; that trigger has fired (docs/zustand-migration.md), so the case study is stale
- `reading/medium/01-context-vs-store-vs-server.mdx`: isPending is TanStack Query v5 naming (v4 used isLoading); the version is not named (minor)

### context-vs-store-vs-server-state

- `reading/complex/01-combining-owners.mdx`: 'const [params, setParams] = useSearchParams()' is React Router's API, but the library is not named and the track otherwise targets Next.js, whose useSearchParams is read-only
- `reading/complex/01-combining-owners.mdx`: isPending is TanStack Query v5 naming; the version is not named (minor)
- `reading/simple/02-triage-table.mdx`: puts 'Multi-step wizard draft' in a persisted client store, while reading/medium/01-failure-modes.mdx and quiz-owners/wizard-scope use the wizard as the example of a store that wrongly outlives its screen (internal inconsistency)

### zustand-basics

- `reading/complex/01-how-it-works-and-testing.mdx`: says real Zustand uses useSyncExternalStoreWithSelector from the shim with an equalityFn; that is v4. In v5 (repo has zustand 5.0.14) create calls React's useSyncExternalStore directly; the shim path survives only in zustand/traditional
- `unit.json quiz-zustand/selector-identity + predict-zustand/object-selector-rerender (and the medium reading, and a comment in challenges/selector-store-subscription/solution.tsx)`: say an object-returning selector re-renders on every store change; that is v4 behaviour. v5's migration guide says it can cause an infinite loop ('Maximum update depth exceeded')
- `reading/medium/01-selectors-and-persist.mdx`: 'Rehydration is async-ish ... replaced once storage is read' contradicts the persist docs: with sync storage like localStorage the store is hydrated at creation
- `unit.json quiz-zustand/ssr-hydration explanation (and the medium reading)`: gating on hasHydrated() does not prevent the mismatch with localStorage; a mounted flag, or skipHydration plus rehydrate() after mount, does
- `unit.json fill-zustand/persist-config explanation`: says partialize keeps 'the store's functions' from being serialized, contradicting the unit's own quiz-zustand/partialize explanation and medium reading
- `unit.json predict-zustand/stale-set-object`: two clicks that 'both read before either writes' cannot interleave with synchronous set and click handlers, so the lost update can't happen as written
- `unit.json quiz-zustand/test-reset`: marks 'Mock the zustand module' wrong, but the official Zustand testing guide recommends a shared __mocks__/zustand.ts that resets every store after each test
- `reading/medium/01-selectors-and-persist.mdx`: presents create`<T>`()(...) as needed only with middleware, but Zustand's TypeScript guide says to use the curried form whenever you annotate T (minor)

## backend-nestjs

### nest-vocabulary

- `reading/complex/01-the-cast-around-your-handler.mdx`: says the named "{*splat}" form is what current docs use for every route, but docs.nestjs.com now documents Nest 12 and binds all-routes middleware with .forRoutes('*'); the reading pins this to Nest 11

### nest-modules-and-providers

- `reading/medium/01-reading-the-error.mdx`: the quoted error ends 'is available in the OrdersModule context', which is Nest 11 wording; Nest 12 prints '...is available in the OrdersModule module.' Version not named
- `unit.json quiz-di/usefactory explanation`: says useValue 'would run the connect at module-load time', but the unit's complex reading says node-redis v4 createClient does not connect on create (true only for clients like ioredis; client and version not named)
- `reading/complex/01-tokens-factories-scopes.mdx`: says enableShutdownHooks() lets a deployment drain in-flight requests; the Nest 12 migration guide lists Express-adapter draining as new in v12, so this depends on version and adapter

### nest-dtos-and-validation

- `unit.json quiz-dto/patch-dto + fill-dto/optional-field explanations, and reading/complex/01-nested-partial-custom.mdx`: say @IsOptional() does not permit null; the class-validator README says it skips all validators when the value is null or undefined
- `unit.json quiz-dto/nested-pair explanation + reading/complex/01-nested-partial-custom.mdx`: say @Type for nested validation needs transform: true; ValidationPipe always runs plainToInstance before validating, so nested validation works without it
- `unit.json quiz-dto/query-strings + reading/simple/02-where-validation-runs.mdx`: say @Query('page') page: number stays '2'; with the global transform: true this unit recommends, Nest converts named params to the declared number (the vocabulary unit's param-is-string explanation says the opposite)
- `reading/simple/02-where-validation-runs.mdx`: says pipes at the four levels 'narrowest wins where they overlap'; the Request lifecycle FAQ says every bound pipe runs, global then controller then route then parameter
- `content/challenges/nest-validation-pipe (meta.json + README.md)`: present string-to-int/boolean body coercion as what ValidationPipe({ whitelist: true, transform: true }) gives you; for DTO properties that also needs @Type(() => Number) or enableImplicitConversion

### nest-request-lifecycle

- `unit.json predict-lifecycle/forgot-return answer + fill-lifecycle/envelope-interceptor explanation + reading/medium/01-guards-and-interceptors.mdx`: say a missing return makes the request hang; Nest pipes intercept() through mergeAll, so undefined throws 'You provided undefined where a stream was expected' and the client gets a 500 (the handler still never runs)
- `reading/complex/01-filters-and-ordering.mdx + unit.json quiz-lifecycle/filters-dont-chain`: say Nest picks 'the most specific match'; Nest checks route, then controller, then global filters and takes the first whose @Catch matches, so a route-level @Catch() beats a controller-level @Catch(DomainError)
- `unit.json fill-lifecycle/guard-shape`: the sample guard returns req.headers['x-api-key'] === process.env.API_KEY, which fails open when API_KEY is unset; the vocabulary unit teaches the fail-closed check
