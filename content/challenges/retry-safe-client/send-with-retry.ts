import type { HttpRequest, HttpResponse, RetryOptions } from "./http";

/**
 * Sends a request, retrying the failures that can succeed later. Four bugs, in the order
 * worth fixing them:
 *   1. the idempotency key is regenerated on every attempt (and replaces one the caller sent)
 *   2. only POST gets a key, but PATCH is not idempotent either
 *   3. every 4xx/5xx is retried, including ones that will fail the same way forever
 *   4. a server's Retry-After is ignored in favour of our own backoff
 */
export async function sendWithRetry(request: HttpRequest, options: RetryOptions): Promise<HttpResponse> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    const headers = { ...request.headers };
    if (request.method === "POST") headers["idempotency-key"] = options.newKey();

    try {
      const response = await options.send({ ...request, headers });
      if (response.status < 400 || attempt === options.maxAttempts) return response;
      await options.sleep(options.baseDelayMs * 2 ** (attempt - 1));
    } catch (error) {
      lastError = error;
      if (attempt === options.maxAttempts) break;
      await options.sleep(options.baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}
