import { useEffect, useState } from "react";
import { sendWithRetry } from "./send-with-retry";
import { NetworkError, type HttpRequest, type RetryOptions } from "./http";

type Outcome = { status: number; headers?: Record<string, string> } | "network";

const scenarios: { label: string; request: HttpRequest; outcomes: Outcome[] }[] = [
  {
    label: "POST /payments — the connection drops twice",
    request: { method: "POST", url: "/payments", headers: {}, body: '{"amount":4200}' },
    outcomes: ["network", "network", { status: 201 }],
  },
  {
    label: "PATCH /orders/7 — 503, then OK",
    request: { method: "PATCH", url: "/orders/7", headers: {}, body: '{"op":"increment"}' },
    outcomes: [{ status: 503 }, { status: 200 }],
  },
  {
    label: "POST /payments — the body is invalid (422)",
    request: { method: "POST", url: "/payments", headers: {}, body: '{"amount":-1}' },
    outcomes: [{ status: 422 }],
  },
  {
    label: "GET /orders/7 — rate limited, Retry-After: 2",
    request: { method: "GET", url: "/orders/7", headers: {} },
    outcomes: [{ status: 429, headers: { "retry-after": "2" } }, { status: 200 }],
  },
];

async function run(request: HttpRequest, outcomes: Outcome[]): Promise<string[]> {
  const log: string[] = [];
  let attempt = 0;
  let keys = 0;
  const options: RetryOptions = {
    send: async (r) => {
      const outcome = outcomes[Math.min(attempt, outcomes.length - 1)];
      attempt += 1;
      const key = r.headers["idempotency-key"] ?? "(none)";
      if (outcome === "network") {
        log.push(`#${attempt} ${r.method} key=${key} → connection dropped`);
        throw new NetworkError();
      }
      log.push(`#${attempt} ${r.method} key=${key} → ${outcome.status}`);
      return { status: outcome.status, headers: outcome.headers ?? {}, body: "" };
    },
    sleep: async (ms) => {
      log.push(`   wait ${ms} ms`);
    },
    newKey: () => `key-${++keys}`,
    maxAttempts: 3,
    baseDelayMs: 100,
  };
  try {
    const response = await sendWithRetry(request, options);
    log.push(`=> returned ${response.status}`);
  } catch (error) {
    log.push(`=> threw ${(error as Error).name}`);
  }
  return log;
}

export default function App() {
  const [logs, setLogs] = useState<string[][]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(scenarios.map((s) => run(s.request, s.outcomes))).then((result) => {
      if (!cancelled) setLogs(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>sendWithRetry — what the server sees</h3>
      {scenarios.map((s, i) => (
        <div key={s.label} style={{ marginBottom: 12 }}>
          <div style={{ color: "#64748b" }}>{s.label}</div>
          {(logs[i] ?? ["running…"]).map((line, j) => (
            <div key={j}>{line}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
