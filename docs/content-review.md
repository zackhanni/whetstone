# Content review — known accuracy issues

Found on 2026-10-17 while backfilling every unit's `sources`. Each entry is a claim that the
official docs contradict, a claim that depends on a version without naming it, or a place where a
unit contradicts itself. This is the work list for the content phase.

Work through it with `/improve-lesson`, like feedback issues. Check each entry against the
unit's sources before changing anything (the finder was an AI reading the docs, and could be
wrong too), and delete the entry when its fix lands; the changelog line is the record. Paths are
relative to the unit folder unless they start with `content/`.

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
