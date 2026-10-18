/**
 * A reading block's tier folders (<dir>/{simple,medium,complex}/*.mdx, learning/schema.ts), in
 * the order the app stacks them. Its own module, not part of schema.ts, so the client reading
 * view can import it without pulling zod and the whole schema into the lesson page's bundle.
 * Kept free of `@/` imports so the tsx-run validator can load it.
 */
export const TIERS = ["simple", "medium", "complex"] as const;
