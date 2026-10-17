/**
 * The shapes the retry helper works with — a stand-in for `fetch`'s Request/Response that a
 * test can build by hand. Header names are lowercase, as HTTP/2 sends them.
 *
 * Read-only support file — the helper lives in send-with-retry.ts.
 */
export type HttpRequest = {
  method: string; // "GET", "POST", …
  url: string;
  headers: Record<string, string>; // lowercase names, e.g. "idempotency-key"
  body?: string;
};

export type HttpResponse = {
  status: number;
  headers: Record<string, string>; // lowercase names, e.g. "retry-after"
  body: string;
};

/**
 * Sends ONE request. Resolves with whatever response came back — a 404 or a 503 is still a
 * response. Rejects with a NetworkError only when no response arrived (a dropped connection,
 * a timeout), which is exactly when the client can't know whether the server did the work.
 */
export type Send = (request: HttpRequest) => Promise<HttpResponse>;

export class NetworkError extends Error {
  constructor(message = "connection reset before a response arrived") {
    super(message);
    this.name = "NetworkError";
  }
}

export type RetryOptions = {
  send: Send;
  /** Waits before the next attempt. Tests pass a fake that records the delay. */
  sleep: (ms: number) => Promise<void>;
  /** Makes a fresh idempotency key (crypto.randomUUID() in real code). */
  newKey: () => string;
  /** Total attempts, including the first. */
  maxAttempts: number;
  /** Backoff when the server didn't say how long to wait: base, 2×base, 4×base, … */
  baseDelayMs: number;
};
