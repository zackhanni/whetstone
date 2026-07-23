import { TAXONOMY, type TagNode } from "@/learning/taxonomy";

/**
 * Pure tag-graph helpers over the taxonomy (learning/taxonomy.ts). No React, no I/O — this is the
 * core the filter UI and card chips are built on. Design + semantics: docs/tags-design.md.
 *
 * The taxonomy is a small (~25-node), validated, acyclic DAG, so these walk it directly without
 * memoization. A tag may have multiple parents; every traversal dedupes.
 */

const BY_SLUG = new Map<string, TagNode>(TAXONOMY.map((n) => [n.slug, n]));
/** Authoring order, for stable sorts. */
const ORDER = new Map<string, number>(TAXONOMY.map((n, i) => [n.slug, i]));

/** Reverse edges: parent slug → direct child slugs (built once from the parent lists). */
const CHILDREN = new Map<string, string[]>();
for (const n of TAXONOMY) {
  for (const p of n.parents) {
    const arr = CHILDREN.get(p);
    if (arr) arr.push(n.slug);
    else CHILDREN.set(p, [n.slug]);
  }
}

/** Human label for a tag; falls back to the slug if the tag is unknown. */
export function labelOf(slug: string): string {
  return BY_SLUG.get(slug)?.label ?? slug;
}

/** Direct children of a tag (nodes that list `slug` among their parents). */
export function childrenOf(slug: string): string[] {
  // Return a copy — never hand out the internal adjacency array, or a caller's sort/push/splice
  // would corrupt the shared graph process-wide.
  return [...(CHILDREN.get(slug) ?? [])];
}

/** Top-level dimensions — tags with no parents (the roots of the DAG). */
export function dimensions(): string[] {
  return TAXONOMY.filter((n) => n.parents.length === 0).map((n) => n.slug);
}

/** Shortest distance from `slug` to a root. Roots (and unknown tags) are depth 0. */
export function depthOf(slug: string): number {
  const node = BY_SLUG.get(slug);
  if (!node || node.parents.length === 0) return 0;
  return 1 + Math.min(...node.parents.map(depthOf));
}

/** All strict descendants of a tag (transitive children), DAG-dedup'd; excludes `slug` itself. */
export function descendantsOf(slug: string): Set<string> {
  const out = new Set<string>();
  const stack = [...childrenOf(slug)];
  while (stack.length) {
    const s = stack.pop()!;
    if (out.has(s)) continue;
    out.add(s);
    for (const c of childrenOf(s)) stack.push(c);
  }
  return out;
}

/** `slug` plus all its descendants — the set that selecting `slug` "covers" (downward closure). */
export function subtreeOf(slug: string): Set<string> {
  const out = descendantsOf(slug);
  out.add(slug);
  return out;
}

/** Expand a selection into every tag it covers: the union of each selected tag's subtree. */
export function expandSelection(selected: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const s of selected) for (const t of subtreeOf(s)) out.add(t);
  return out;
}

/**
 * Does an item (tagged `itemSkills`) match the `selected` interest tags?
 *
 * Union (OR) across selected tags; each selected tag matches downward (itself + descendants), so
 * selecting `react` matches every React lesson while selecting `useEffect` matches only useEffect.
 * An empty selection matches everything (the "no filter" default).
 */
export function matches(itemSkills: readonly string[], selected: Iterable<string>): boolean {
  const covered = expandSelection(selected);
  if (covered.size === 0) return true;
  return itemSkills.some((s) => covered.has(s));
}

export type Rollup = { shown: string[]; overflow: string[] };

/**
 * Condense a (possibly large) set of tags into a few representative chips for a card, broadest
 * first. Initial heuristic: drop root dimensions (too generic to earn a chip — the whole catalog
 * is "Frontend" today) and order by depth, then authoring order; tune against real cards in step 3.
 * Returns the visible `shown` slugs and the `overflow` (for a "+N more" affordance).
 */
export function rollupForCard(skills: readonly string[], limit = 4, includeRoots = false): Rollup {
  const unique = [...new Set(skills)];
  const candidates = includeRoots ? unique : unique.filter((s) => !BY_SLUG.has(s) || depthOf(s) > 0);
  candidates.sort(
    (a, b) => depthOf(a) - depthOf(b) || (ORDER.get(a) ?? Infinity) - (ORDER.get(b) ?? Infinity),
  );
  return { shown: candidates.slice(0, limit), overflow: candidates.slice(limit) };
}
