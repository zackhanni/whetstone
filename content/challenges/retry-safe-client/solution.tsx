import type { HttpRequest, HttpResponse, RetryOptions } from "./http";

/** Methods RFC 9110 defines as idempotent: repeating them has the same intended effect. */
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS", "PUT", "DELETE"]);

/**
 * "Later", not "never": a timeout the server owns up to (408), rate limiting (429), and the
 * gateway/overload family (502, 503, 504). Every other status is the final answer — resending
 * the same bytes gets the same 400/409/422, and a 500 is "unexpected", not "temporary".
 */
const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504]);

/** Retry-After in its delay-seconds form; null when absent or not a plain number of seconds. */
function retryAfterMs(response: HttpResponse): number | null {
  const value = response.headers["retry-after"];
  if (value === undefined || !/^\d+$/.test(value.trim())) return null;
  return Number(value) * 1000;
}

export async function sendWithRetry(request: HttpRequest, options: RetryOptions): Promise<HttpResponse> {
  // One key per OPERATION, decided before the first attempt. A key minted per attempt makes
  // every retry look like a brand-new payment to the server — the header protects nothing.
  const headers = { ...request.headers };
  if (!IDEMPOTENT_METHODS.has(request.method) && headers["idempotency-key"] === undefined) {
    headers["idempotency-key"] = options.newKey();
  }
  const prepared: HttpRequest = { ...request, headers };

  const backoff = (attempt: number) => options.baseDelayMs * 2 ** (attempt - 1);
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      const response = await options.send(prepared);
      const retryable = RETRYABLE_STATUSES.has(response.status);
      if (!retryable || attempt === options.maxAttempts) return response;
      // The server knows how long it needs better than our formula does.
      await options.sleep(retryAfterMs(response) ?? backoff(attempt));
    } catch (error) {
      // No response at all: the work may or may not have happened. The key (or an idempotent
      // method) is what makes sending it again safe.
      lastError = error;
      if (attempt === options.maxAttempts) break;
      await options.sleep(backoff(attempt));
    }
  }

  throw lastError;
}
