import { sendWithRetry } from "./send-with-retry";
import { NetworkError, type HttpRequest, type HttpResponse, type RetryOptions } from "./http";

/** One scripted outcome per attempt: a response, or "network" for a dropped connection. */
type Outcome = { status: number; headers?: Record<string, string> } | "network";

function fakeServer(outcomes: Outcome[]) {
  const seen: HttpRequest[] = [];
  const delays: number[] = [];
  let keysMade = 0;
  const options: RetryOptions = {
    send: async (request) => {
      seen.push(request);
      const outcome = outcomes[Math.min(seen.length - 1, outcomes.length - 1)];
      if (outcome === "network") throw new NetworkError();
      const response: HttpResponse = { status: outcome.status, headers: outcome.headers ?? {}, body: "" };
      return response;
    },
    sleep: async (ms) => {
      delays.push(ms);
    },
    newKey: () => `key-${++keysMade}`,
    maxAttempts: 3,
    baseDelayMs: 100,
  };
  return { options, seen, delays, keysMade: () => keysMade };
}

const post: HttpRequest = { method: "POST", url: "/payments", headers: { "content-type": "application/json" }, body: "{}" };

describe("sendWithRetry", () => {
  it("returns a 2xx from the first attempt without retrying", async () => {
    const server = fakeServer([{ status: 201 }]);
    const response = await sendWithRetry(post, server.options);
    expect(response.status).toBe(201);
    expect(server.seen.length).toBe(1);
  });

  it("sends ONE idempotency key on every attempt of a POST", async () => {
    const server = fakeServer(["network", "network", { status: 201 }]);
    const response = await sendWithRetry(post, server.options);
    expect(response.status).toBe(201);
    expect(server.seen.length).toBe(3);
    const keys = server.seen.map((r) => r.headers["idempotency-key"]);
    expect(typeof keys[0]).toBe("string");
    expect(new Set(keys).size).toBe(1);
    expect(server.keysMade()).toBe(1);
  });

  it("gives a PATCH an idempotency key too", async () => {
    const patch: HttpRequest = { method: "PATCH", url: "/orders/7", headers: {}, body: '{"op":"increment"}' };
    const server = fakeServer([{ status: 503 }, { status: 200 }]);
    await sendWithRetry(patch, server.options);
    expect(server.seen.length).toBe(2);
    expect(typeof server.seen[0].headers["idempotency-key"]).toBe("string");
    expect(server.seen[1].headers["idempotency-key"]).toBe(server.seen[0].headers["idempotency-key"]);
  });

  it("keeps an idempotency key the caller already chose", async () => {
    const withKey: HttpRequest = { ...post, headers: { ...post.headers, "idempotency-key": "checkout-42" } };
    const server = fakeServer(["network", { status: 201 }]);
    await sendWithRetry(withKey, server.options);
    expect(server.seen.map((r) => r.headers["idempotency-key"]).join(",")).toBe("checkout-42,checkout-42");
    expect(server.keysMade()).toBe(0);
  });

  it("retries idempotent methods without adding a key", async () => {
    for (const method of ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"]) {
      const request: HttpRequest = { method, url: "/orders/7", headers: {} };
      const server = fakeServer(["network", { status: 200 }]);
      const response = await sendWithRetry(request, server.options);
      const keys = server.seen.map((r) => r.headers["idempotency-key"] ?? "none").join(",");
      expect(`${method}: ${response.status} after ${server.seen.length}, keys ${keys}`).toBe(
        `${method}: 200 after 2, keys none,none`,
      );
    }
  });

  it("retries 408, 429, 502, 503 and 504", async () => {
    for (const status of [408, 429, 502, 503, 504]) {
      const server = fakeServer([{ status }, { status: 201 }]);
      const response = await sendWithRetry(post, server.options);
      expect(`${status}: ${response.status} after ${server.seen.length} attempt(s)`).toBe(
        `${status}: 201 after 2 attempt(s)`,
      );
    }
  });

  it("returns a final status (400, 409, 422, 500) after one attempt", async () => {
    for (const status of [400, 409, 422, 500]) {
      const server = fakeServer([{ status }, { status: 201 }]);
      const response = await sendWithRetry(post, server.options);
      expect(`${status}: ${response.status} after ${server.seen.length} attempt(s)`).toBe(
        `${status}: ${status} after 1 attempt(s)`,
      );
    }
  });

  it("waits as long as Retry-After says before retrying a 429 or 503", async () => {
    const server = fakeServer([
      { status: 429, headers: { "retry-after": "2" } },
      { status: 503, headers: { "retry-after": "5" } },
      { status: 201 },
    ]);
    const response = await sendWithRetry(post, server.options);
    expect(response.status).toBe(201);
    expect(server.delays.join(",")).toBe("2000,5000");
  });

  it("backs off exponentially when the server gives no Retry-After", async () => {
    const server = fakeServer(["network", { status: 502 }, { status: 200 }]);
    await sendWithRetry(post, server.options);
    expect(server.delays.join(",")).toBe("100,200");
  });

  it("falls back to the backoff when Retry-After is a date, not a number of seconds", async () => {
    const server = fakeServer([{ status: 503, headers: { "retry-after": "Sat, 17 Oct 2026 07:28:00 GMT" } }, { status: 201 }]);
    const response = await sendWithRetry(post, server.options);
    expect(response.status).toBe(201);
    expect(server.delays.join(",")).toBe("100");
  });

  it("returns the last response once maxAttempts is used up", async () => {
    const server = fakeServer([{ status: 503 }]);
    const response = await sendWithRetry(post, server.options);
    expect(response.status).toBe(503);
    expect(server.seen.length).toBe(3);
  });

  it("rethrows the network error once maxAttempts is used up", async () => {
    const server = fakeServer(["network"]);
    let caught: unknown = null;
    try {
      await sendWithRetry(post, server.options);
    } catch (error) {
      caught = error;
    }
    expect(caught instanceof NetworkError).toBe(true);
    expect(server.seen.length).toBe(3);
  });
});
