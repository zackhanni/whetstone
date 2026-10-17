import { HashRing } from "./hash-ring";

const NODES = ["node-a", "node-b", "node-c", "node-d"];
const KEYS = Array.from({ length: 10000 }, (_, i) => `user:${i}`);

/** Four nodes with the default hash and the default number of virtual nodes. */
function fourNodeRing(): HashRing {
  const ring = new HashRing();
  for (const node of NODES) ring.addNode(node);
  return ring;
}

/**
 * A hash the test controls, so nodes and keys sit at exact positions: a node's replica labels
 * ("b", "b#0" — or "b-0", "b:0") hash to the node's position, and a key "k:<n>" hashes to n.
 * One virtual node each, so each node is exactly one point.
 */
function placedRing(positions: Record<string, number>): HashRing {
  const hash = (input: string): number =>
    input.startsWith("k:") ? Number(input.slice(2)) : positions[input.replace(/[^a-z]*\d+$/, "")];
  const ring = new HashRing({ vnodes: 1, hash });
  for (const node of Object.keys(positions)) ring.addNode(node);
  return ring;
}

describe("HashRing", () => {
  it("routes a key to the first position at or after its hash, comparing positions as numbers", () => {
    // Numerically 900 < 5000 < 10000; as strings "10000" < "5000" < "900".
    const ring = placedRing({ a: 900, b: 10000, c: 5000 });
    expect(ring.nodeFor("k:50")).toBe("a");
    expect(ring.nodeFor("k:1000")).toBe("c");
    expect(ring.nodeFor("k:5000")).toBe("c");
    expect(ring.nodeFor("k:6000")).toBe("b");
  });

  it("wraps a key that hashes past the highest position around to the lowest", () => {
    const ring = placedRing({ a: 100, b: 2000, c: 30000 });
    expect(ring.nodeFor("k:40000")).toBe("a");
    expect(ring.nodeFor("k:30001")).toBe("a");
  });

  it("gives each of four nodes between 15% and 35% of 10,000 keys", () => {
    const ring = fourNodeRing();
    const counts = new Map<string, number>();
    for (const key of KEYS) {
      const node = String(ring.nodeFor(key));
      counts.set(node, (counts.get(node) ?? 0) + 1);
    }
    for (const node of NODES) {
      const share = (counts.get(node) ?? 0) / KEYS.length;
      expect(share).toBeGreaterThanOrEqual(0.15);
      expect(share).toBeLessThanOrEqual(0.35);
    }
  });

  it("removing a node moves only the keys it owned, and nothing routes to it afterwards", () => {
    const ring = fourNodeRing();
    const before = KEYS.map((key) => ring.nodeFor(key));
    ring.removeNode("node-b");

    let stayed = 0;
    KEYS.forEach((key, i) => {
      const after = ring.nodeFor(key);
      expect(after).not.toBe("node-b");
      expect(after === undefined).toBe(false);
      if (before[i] !== "node-b") {
        expect(after).toBe(before[i]);
        stayed += 1;
      }
    });
    expect(stayed).toBeGreaterThan(0);
  });

  it("adding a fifth node moves keys only to the new node, and about a fifth of them", () => {
    const ring = fourNodeRing();
    const before = KEYS.map((key) => ring.nodeFor(key));
    ring.addNode("node-e");

    let moved = 0;
    KEYS.forEach((key, i) => {
      const after = ring.nodeFor(key);
      if (after !== before[i]) {
        expect(after).toBe("node-e");
        moved += 1;
      }
    });
    expect(moved / KEYS.length).toBeGreaterThanOrEqual(0.1);
    expect(moved / KEYS.length).toBeLessThanOrEqual(0.3);
  });

  it("routes nothing when the ring is empty", () => {
    const ring = new HashRing();
    expect(ring.nodeFor("user:1")).toBe(undefined);
    ring.addNode("node-a");
    ring.removeNode("node-a");
    expect(ring.nodeFor("user:1")).toBe(undefined);
  });
});
