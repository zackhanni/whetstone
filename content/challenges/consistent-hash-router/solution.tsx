import { hash32, type HashFn } from "./hash";

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
      // The replica index is what makes each virtual node a different point on the ring.
      const position = this.hash(`${name}#${i}`);
      // A rare 32-bit collision with another node's point: keep the existing owner.
      if (this.owners.has(position)) continue;
      this.owners.set(position, name);
      this.positions.push(position);
    }
    // Without a comparator, sort() compares numbers as strings: 10000 would sort before 900.
    this.positions.sort((a, b) => a - b);
  }

  /** Take the node off the ring; its keys fall to the next position clockwise. */
  removeNode(name: string): void {
    if (!this.nodes.delete(name)) return;
    // positions and owners describe the same ring, so both must lose the node's points.
    this.positions = this.positions.filter((position) => this.owners.get(position) !== name);
    this.owners.forEach((owner, position) => {
      if (owner === name) this.owners.delete(position);
    });
  }

  /** The node owning the first position at or after the key's hash, wrapping past the top. */
  nodeFor(key: string): string | undefined {
    if (this.positions.length === 0) return undefined;
    const h = this.hash(key);

    // Binary search for the first position >= h (positions are sorted).
    let low = 0;
    let high = this.positions.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.positions[mid] < h) low = mid + 1;
      else high = mid;
    }

    // Past the highest position, the ring wraps around to the lowest one.
    const index = low === this.positions.length ? 0 : low;
    return this.owners.get(this.positions[index]);
  }
}
