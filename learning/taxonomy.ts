import { z } from "zod";

/**
 * The Whetstone tag taxonomy — the hierarchy over the flat `skills` tags that content already
 * carries (see learning/schema.ts). Association (which lesson has which tag) stays flat on each
 * unit; this file is the single place the PARENT/CHILD structure lives, so "selecting `react`
 * matches all React content" is computed by walking the tree, never by re-tagging lessons with
 * every ancestor.
 *
 * Design: docs/tags-design.md. A multi-parent DAG (a tag may have >1 parent), ~4 levels deep at
 * most. Roots (no parents) are the top-level "dimensions". Adding a node is its own commit when a
 * lesson needs a tag that isn't here yet (mirrors the schemaVersion-bump discipline).
 */

export const TagNode = z.object({
  slug: z.string().min(1), // matches a value used in content `skills`
  label: z.string().min(1), // human label for the UI; may change freely without touching content
  parents: z.array(z.string().min(1)).default([]), // [] => a top-level dimension
});
export type TagNode = z.infer<typeof TagNode>;

/**
 * The registry, with structural integrity enforced at parse time: unique slugs, every parent
 * resolves to a defined slug, and the parent graph is acyclic. `pnpm validate` parses TAXONOMY
 * through this, so a broken hierarchy fails loudly rather than misbehaving at query time.
 */
export const Taxonomy = z.array(TagNode).superRefine((nodes, ctx) => {
  const bySlug = new Map<string, TagNode>();
  nodes.forEach((n, i) => {
    if (bySlug.has(n.slug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [i, "slug"],
        message: `duplicate tag slug "${n.slug}"`,
      });
    }
    bySlug.set(n.slug, n);
  });

  // Every parent must reference a defined slug.
  nodes.forEach((n, i) => {
    n.parents.forEach((p, j) => {
      if (!bySlug.has(p)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i, "parents", j],
          message: `tag "${n.slug}" has unknown parent "${p}"`,
        });
      }
    });
  });

  // No cycles: DFS over parent edges with white/gray/black coloring. A gray node reached again is
  // a back-edge → cycle. Unknown parents are skipped (already reported above).
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  const hasCycleFrom = (slug: string): boolean => {
    color.set(slug, GRAY);
    for (const p of bySlug.get(slug)?.parents ?? []) {
      if (!bySlug.has(p)) continue;
      const c = color.get(p) ?? WHITE;
      if (c === GRAY) return true;
      if (c === WHITE && hasCycleFrom(p)) return true;
    }
    color.set(slug, BLACK);
    return false;
  };
  for (const n of nodes) {
    if ((color.get(n.slug) ?? WHITE) === WHITE && hasCycleFrom(n.slug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: `tag hierarchy has a cycle involving "${n.slug}"`,
      });
      break;
    }
  }
});
export type Taxonomy = z.infer<typeof Taxonomy>;

/**
 * Seeded from every `skills` value currently used across content. Multi-parent edges are used
 * where a tag genuinely belongs to more than one area (e.g. `useState` is both a hook and about
 * component `state`; `context` is a React feature and a state-management approach).
 */
export const TAXONOMY: TagNode[] = [
  // Dimensions (roots)
  { slug: "frontend", label: "Frontend", parents: [] },
  { slug: "backend", label: "Backend", parents: [] },

  // frontend → areas
  { slug: "react", label: "React", parents: ["frontend"] },
  { slug: "async", label: "Async & Timing", parents: ["frontend", "javascript"] },
  {
    slug: "state-management",
    label: "State Management",
    parents: ["frontend"],
  },
  // Architecture spans both dimensions: "where does this responsibility live?" is the same
  // question in a component tree and in a module graph.
  {
    slug: "architecture",
    label: "Architecture",
    parents: ["frontend", "backend"],
  },

  // react → topics
  { slug: "hooks", label: "Hooks", parents: ["react"] },
  { slug: "rendering", label: "Rendering", parents: ["react"] },
  { slug: "refs", label: "Refs", parents: ["react"] },
  { slug: "forms", label: "Forms", parents: ["react"] },
  { slug: "state", label: "Component State", parents: ["react"] },
  { slug: "data-fetching", label: "Data Fetching", parents: ["react"] },
  { slug: "context", label: "Context", parents: ["react", "state-management"] },

  // hooks (multi-parent where a hook is also "about" another topic)
  { slug: "useState", label: "useState", parents: ["hooks", "state"] },
  { slug: "useEffect", label: "useEffect", parents: ["hooks"] },
  { slug: "cleanup", label: "Effect Cleanup", parents: ["useEffect"] },
  {
    slug: "useSyncExternalStore",
    label: "useSyncExternalStore",
    parents: ["hooks", "state-management"],
  },
  { slug: "useRef", label: "useRef", parents: ["hooks", "refs"] },
  { slug: "useMemo", label: "useMemo", parents: ["hooks", "rendering"] },
  {
    slug: "useCallback",
    label: "useCallback",
    parents: ["hooks", "rendering"],
  },

  // rendering
  {
    slug: "referential-identity",
    label: "Referential Identity",
    parents: ["rendering"],
  },
  { slug: "memo", label: "React.memo", parents: ["rendering"] },
  { slug: "performance", label: "Performance", parents: ["rendering"] },

  // refs
  { slug: "dom", label: "DOM", parents: ["refs"] },

  // forms
  {
    slug: "controlled-components",
    label: "Controlled Components",
    parents: ["forms"],
  },

  // state
  {
    slug: "functional-updates",
    label: "Functional Updates",
    parents: ["state"],
  },
  { slug: "derived-state", label: "Derived State", parents: ["state"] },

  // async
  { slug: "timers", label: "Timers", parents: ["async"] },
  {
    slug: "debounce",
    label: "Debounce & Throttle",
    parents: ["async", "forms"],
  },

  // data-fetching
  {
    slug: "tanstack-query",
    label: "TanStack Query",
    parents: ["data-fetching"],
  },
  {
    slug: "AbortController",
    label: "AbortController",
    parents: ["data-fetching", "async"],
  },

  // state-management
  { slug: "zustand", label: "Zustand", parents: ["state-management"] },
  { slug: "persistence", label: "Persistence", parents: ["state-management"] },
  {
    slug: "server-state",
    label: "Server State",
    parents: ["state-management", "data-fetching"],
  },

  // backend → areas
  { slug: "nestjs", label: "NestJS", parents: ["backend"] },
  { slug: "validation", label: "Validation", parents: ["backend"] },
  { slug: "auth", label: "Auth", parents: ["backend"] },
  { slug: "http", label: "HTTP", parents: ["backend"] },

  // http
  { slug: "routing", label: "Routing", parents: ["http", "nestjs"] },

  // nestjs → topics
  { slug: "modules", label: "Modules", parents: ["nestjs"] },
  { slug: "controllers", label: "Controllers", parents: ["nestjs", "http"] },
  // Decorators are a TypeScript feature, but every learner meets them *as* the Nest surface.
  { slug: "decorators", label: "Decorators", parents: ["nestjs"] },
  {
    slug: "dependency-injection",
    label: "Dependency Injection",
    parents: ["nestjs", "architecture"],
  },
  { slug: "providers", label: "Providers", parents: ["dependency-injection"] },
  {
    slug: "request-lifecycle",
    label: "Request Lifecycle",
    parents: ["nestjs", "architecture"],
  },
  { slug: "guards", label: "Guards", parents: ["request-lifecycle", "auth"] },
  {
    slug: "interceptors",
    label: "Interceptors",
    parents: ["request-lifecycle"],
  },
  {
    slug: "exception-filters",
    label: "Exception Filters",
    parents: ["request-lifecycle"],
  },
  {
    slug: "pipes",
    label: "Pipes",
    parents: ["request-lifecycle", "validation"],
  },
  {
    slug: "dto",
    label: "DTOs & Contracts",
    parents: ["validation", "architecture"],
  },

  // ── javascript-typescript-fundamentals ──
  { slug: "languages", label: "Languages", parents: [] },
  { slug: "javascript", label: "JavaScript", parents: ["languages"] },
  { slug: "typescript", label: "TypeScript", parents: ["languages"] },
  { slug: "collections", label: "Map, Set & Collections", parents: ["javascript"] },
  { slug: "syntax", label: "Modern Syntax", parents: ["javascript"] },
  { slug: "equality", label: "Equality & Truthiness", parents: ["javascript"] },
  { slug: "null-and-undefined", label: "null vs undefined", parents: ["equality", "typescript"] },
  { slug: "narrowing", label: "Narrowing & Unions", parents: ["typescript"] },
  { slug: "enums", label: "Enums", parents: ["typescript"] },
  // Immutable updates are a language skill that every state owner (React state, a store) relies on.
  { slug: "immutability", label: "Immutability", parents: ["javascript", "state-management"] },

  // ── dates-and-time ──
  { slug: "dates", label: "Dates & Time", parents: ["javascript"] },
  { slug: "time-zones", label: "Time Zones", parents: ["dates"] },
  { slug: "date-arithmetic", label: "Date Arithmetic", parents: ["dates"] },
  { slug: "date-libraries", label: "Date Libraries", parents: ["dates"] },
  // Intl formats numbers, lists and plural rules too, so it sits under the language, not under dates.
  { slug: "intl", label: "Intl", parents: ["javascript"] },

  // ── async-javascript ──
  { slug: "event-loop", label: "Event Loop", parents: ["async"] },
  { slug: "promises", label: "Promises & async/await", parents: ["async"] },

  // ── data-fetching-tanstack ──
  { slug: "web", label: "Web & Network", parents: [] },
  { slug: "caching", label: "Caching", parents: ["web", "backend"] },
  { slug: "query-keys", label: "Query Keys", parents: ["tanstack-query"] },
  { slug: "mutations", label: "Mutations", parents: ["data-fetching"] },
  { slug: "optimistic-updates", label: "Optimistic Updates", parents: ["mutations"] },
  // A client-side router: not under `routing`, which sits under http/nestjs (server routes).
  { slug: "tanstack-router", label: "TanStack Router", parents: ["react"] },
];

/** Fast membership set of every defined tag slug — used by the validator and (later) the app. */
export const TAXONOMY_SLUGS: ReadonlySet<string> = new Set(
  TAXONOMY.map((n) => n.slug),
);
