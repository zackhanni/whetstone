/**
 * Read-only support file: the hash the ring uses by default.
 *
 * A hash function maps any string to an unsigned 32-bit integer — a position on a ring that
 * runs from 0 to 2^32 - 1 and wraps around. The ring takes the function through its
 * constructor, so a test (or a caller) can swap in its own.
 */
export type HashFn = (input: string) => number;

/** FNV-1a (32-bit) plus a final mixing step. Returns an integer in [0, 2^32). */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // FNV-1a alone leaves keys that differ only in their last character ("user:1", "user:2")
  // close together on the ring. This finalizer (MurmurHash3's fmix32) spreads them out.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
