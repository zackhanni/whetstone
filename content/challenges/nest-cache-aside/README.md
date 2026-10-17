`product-cache.ts` is the service a Nest app would wrap around `@Inject(CACHE_MANAGER)`:
cache-aside for product reads. On a read it checks the cache, falls back to the database on a
miss, and writes what it loaded back to the cache.

`cache-store.ts` stands in for the injected cache — the same `get` / `set` / `del` as
cache-manager v7 (the version under `@nestjs/cache-manager` in Nest 12), TTLs in milliseconds,
`undefined` for a miss. It keeps values the way Redis does (as JSON) and can be taken down. Down,
it does what cache-manager v7 over `@keyv/redis` does when Redis is unreachable: `get` reports a
miss, while `set` and `del` reject. `product-db.ts` is the database, with a load counter and a
switch that makes the next load fail. `clock.ts` lets the tests step past a TTL without waiting.

The service passes a happy-path demo. Four things break it under real traffic:

1. **No TTL.** Entries never expire, so anything that changes the database behind the cache's
   back (an admin tool, a migration, another service) is never seen again.
2. **No invalidation.** `updatePrice` writes the database and leaves the old price cached.
3. **Stampede.** When a hot product isn't cached — after a deploy, after it expires — every
   request that arrives during the load runs its own database query.
4. **Outage.** With Redis down, `set` rejects after the database has already answered, so a read
   that could have succeeded fails. The cache is an optimisation: losing it should cost speed,
   not correctness.

## Hints

- Invalidate by deleting the key, and do it **after** the database write. Deleting first leaves a
  window in which a concurrent read reloads the old price and caches it again.
- Single-flight: keep a `Map` from cache key to the in-progress load's promise. Concurrent misses
  await the same promise; remove the entry once it settles — **whichever way** it settles, or one
  failed load is handed to every later reader.
- Failing open means catching the cache's errors, not the database's: a load that fails must
  still reach the caller.
