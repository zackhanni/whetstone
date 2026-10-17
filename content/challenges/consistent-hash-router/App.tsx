import { HashRing } from "./hash-ring";
import { hash32 } from "./hash";

const NODES = ["node-a", "node-b", "node-c", "node-d"];
const KEYS = Array.from({ length: 10000 }, (_, i) => `user:${i}`);

function countByNode(owners: (string | undefined)[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const owner of owners) {
    const label = owner ?? "(undefined)";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
}

const percent = (n: number) => `${((n / KEYS.length) * 100).toFixed(1)}%`;

export default function App() {
  const ring = new HashRing();
  for (const node of NODES) ring.addNode(node);
  const before = KEYS.map((key) => ring.nodeFor(key));

  ring.addNode("node-e");
  const after = KEYS.map((key) => ring.nodeFor(key));
  const movedOnRing = after.filter((owner, i) => owner !== before[i]).length;

  // The naive alternative: shard = hash % nodeCount, going from 4 nodes to 5.
  const movedByModulo = KEYS.filter((key) => hash32(key) % 4 !== hash32(key) % 5).length;

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>10,000 keys on 4 nodes</h3>
      {countByNode(before).map(([node, count]) => (
        <div key={node}>
          {node}: {count} ({percent(count)})
        </div>
      ))}
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>Add node-e</h3>
      <div>keys moved on the ring: {movedOnRing} ({percent(movedOnRing)})</div>
      <div>keys moved with hash % N (4 → 5): {movedByModulo} ({percent(movedByModulo)})</div>
    </div>
  );
}
