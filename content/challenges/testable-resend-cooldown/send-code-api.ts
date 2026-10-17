/**
 * Stands in for the real network call (`fetch("/api/send-code", …)` in the app) so the preview
 * works without a server. Read-only. The point of the challenge is that the code you test should
 * not have to call this at all — a test passes in its own `send`.
 */
export async function postSendCode(email: string): Promise<void> {
  void email; // the real version POSTs it
  await new Promise((resolve) => setTimeout(resolve, 300));
}
