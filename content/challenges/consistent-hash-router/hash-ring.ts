import { hash32, type HashFn } from "./hash";

/**
 * A consistent-hash ring that routes keys to nodes (cache servers, database shards).
 *
 * Four bugs, in the order worth fixing them:
 *   1. Order — the ring positions are sorted as strings, so lookups walk the ring out of order.
 *   2. Wrap-around — a key hashing above the highest position gets `undefined`.
 *   3. Virtual nodes — every replica of a node lands on the same position.
 *   4. Removal — a removed node's positions stay on the ring, so keys still route to it.
 */

export type RingOptions = {
  /** How many positions ("virtual nodes") each node gets on the ring. */
  vnodes?: number;
  /** Maps a string to an unsigned 32-bit ring position. */
  hash?: HashFn;
};

export class HashRing {
  /** Every node's ring positions, kept sorted ascending so a lookup can walk them in order. */
  private positions: number[] = [];
  /** Which node owns each position. */
  private owners = new Map<number, string>();
  private readonly nodes = new Set<string>();
  private readonly vnodes: number;
  private readonly hash: HashFn;

  constructor({ vnodes = 100, hash = hash32 }: RingOptions = {}) {
    this.vnodes = vnodes;
    this.hash = hash;
  }

  /** Place `vnodes` positions for the node: replica i of node n sits at hash(`${n}#${i}`). */
  addNode(name: string): void {
    if (this.nodes.has(name)) return;
    this.nodes.add(name);
    for (let i = 0; i < this.vnodes; i++) {
      const position = this.hash(name);
      this.owners.set(position, name);
      this.positions.push(position);
    }
    this.positions.sort();
  }

  /** Take the node off the ring; its keys fall to the next position clockwise. */
  removeNode(name: string): void {
    if (!this.nodes.delete(name)) return;
    this.owners.forEach((owner, position) => {
      if (owner === name) this.owners.delete(position);
    });
  }

  /** The node owning the first position at or after the key's hash, wrapping past the top. */
  nodeFor(key: string): string | undefined {
    if (this.positions.length === 0) return undefined;
    const h = this.hash(key);
    const index = this.positions.findIndex((position) => position >= h);
    return this.owners.get(this.positions[index]);
  }
}
