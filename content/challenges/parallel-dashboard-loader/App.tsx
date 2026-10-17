import { useRef, useState } from "react";
import { __setApi, type Panel } from "./api";
import { loadDashboard } from "./loader";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Scenario = { label: string; failUser?: boolean; failPanel?: Panel };
const SCENARIOS: Scenario[] = [
  { label: "Everything works" },
  { label: "Notifications service is down", failPanel: "notifications" },
  { label: "User service is down", failUser: true },
];

// Each request takes 500 ms here, so sequential vs parallel is visible in the timing.
function install({ failUser, failPanel }: Scenario) {
  __setApi({
    async getUser(userId) {
      await sleep(500);
      if (failUser) throw new Error("user service down");
      return { id: userId, name: "Ada Lovelace", accountId: `acct-${userId}` };
    },
    async getPanel(panel) {
      await sleep(500);
      if (panel === failPanel) throw new Error(`${panel} service down`);
      return [`${panel} item 1`, `${panel} item 2`];
    },
  });
}

export default function App() {
  const [output, setOutput] = useState("Pick a scenario.");
  // Each click starts a new run. Only the newest may write the output, or a slow earlier run
  // that finishes last would show its result under the scenario picked after it.
  const latestRun = useRef(0);

  const run = async (scenario: Scenario) => {
    const runId = ++latestRun.current;
    install(scenario);
    setOutput("Loading…");
    const start = performance.now();
    try {
      const dashboard = await loadDashboard("u1");
      if (runId !== latestRun.current) return;
      setOutput(`Loaded in ${Math.round(performance.now() - start)} ms\n${JSON.stringify(dashboard, null, 2)}`);
    } catch (error) {
      if (runId !== latestRun.current) return;
      setOutput(`Rejected after ${Math.round(performance.now() - start)} ms: ${(error as Error).message}`);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Dashboard loader</h3>
      <p style={{ color: "#64748b", fontSize: 13 }}>
        Every request takes 500 ms: parallel panels load in about 1 s in total, sequential in about 2 s.
      </p>
      {SCENARIOS.map((s) => (
        <button key={s.label} onClick={() => run(s)} style={{ marginRight: 8 }}>
          {s.label}
        </button>
      ))}
      <pre style={{ fontSize: 12, background: "#f1f5f9", padding: 8 }}>{output}</pre>
    </div>
  );
}
