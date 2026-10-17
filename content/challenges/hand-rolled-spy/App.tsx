import { fn, spyOn } from "./spy";

/** Runs a few calls through the learner's spy and shows what it saw — a live view of the bugs. */
function demo(): string[] {
  const lines: string[] = [];
  const show = (label: string, run: () => unknown) => {
    try {
      lines.push(`${label} → ${JSON.stringify(run())}`);
    } catch (err) {
      lines.push(`${label} → threw ${(err as Error).message}`);
    }
  };

  const add = fn((a: number, b: number) => a + b);
  show("add(2, 3)", () => add(2, 3));
  show("add(10, 1)", () => add(10, 1));
  show("add.calls", () => add.calls);

  const counter = {
    count: 0,
    increment() {
      this.count += 1;
      return this.count;
    },
  };
  const spy = spyOn(counter, "increment");
  show("counter.increment()", () => counter.increment());
  show("counter.count", () => counter.count);
  spy.restore();
  show("typeof counter.increment after restore()", () => typeof counter.increment);

  return lines;
}

export default function App() {
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>What your spy sees</h3>
      {demo().map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}
