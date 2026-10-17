`hash-ring.ts` decides which node (a cache server, a database shard) owns each key, using
**consistent hashing**. Every node is hashed onto a ring of 32-bit positions — once per
*virtual node*, so replica `i` of node `n` sits at ``hash(`${n}#${i}`)`` — and a key belongs to the
node at the first position **at or after** the key's own hash. A key that hashes above the
highest position wraps around to the lowest.

That rule is what makes resizing cheap. A new node only takes over the arcs just before its own
positions, so only those keys move. Compare `hash(key) % nodeCount`: going from 4 nodes to 5
changes the answer for about 80% of keys, which for a cache means a fleet-wide miss storm. The
preview prints both numbers.

The ring compiles and answers every lookup, and it's wrong in four ways:

1. **Order** — positions are sorted with `sort()` and no comparator, which compares numbers as
   strings (`10000` sorts before `900`), so a lookup walks the ring out of order.
2. **Wrap-around** — a key that hashes above the highest position finds no position "at or
   after" it, and gets `undefined` instead of the lowest position's node.
3. **Virtual nodes** — every replica of a node lands on the same point, so each node really has
   one position and the load is lopsided.
4. **Removal** — `removeNode` drops the node's owner entries but leaves its positions on the
   ring, so keys still land on a node that's gone.

`hash.ts` (read-only) provides `hash32`. The tests pass their own hash function through the
constructor to put nodes and keys at exact positions — the same seam you'd use to test any
router without depending on what a real hash happens to produce.

## Hints

- `sort()` with no argument converts the elements to strings before comparing them. Give it a
  comparator that compares the numbers.
- A key past the last position belongs to the first position on the ring.
- Each replica needs a string of its own to hash — the label format is in the first paragraph.
- `positions` and `owners` describe the same ring; removing a node has to update both, and the
  order you update them in matters if one is used to filter the other.
- Optional: once positions are sorted, a binary search finds the first one ≥ the hash in
  O(log n) instead of scanning all of them.
