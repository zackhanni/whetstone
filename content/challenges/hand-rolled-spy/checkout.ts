/**
 * The code under test in the last two grader tests (read-only). It talks to two collaborators,
 * so a test needs a double for each: a stub for `rates.get` (it must return an answer) and a spy
 * for `mailer.send` (the test checks what was sent).
 */
export type Order = { subtotalCents: number; currency: string; email: string };

export type CheckoutDeps = {
  rates: { get: (currency: string) => Promise<number> };
  mailer: { send: (to: string, body: string) => Promise<void> };
};

export async function checkout(order: Order, deps: CheckoutDeps): Promise<number> {
  const rate = await deps.rates.get(order.currency);
  const totalCents = Math.round(order.subtotalCents * rate);
  await deps.mailer.send(order.email, `Receipt: ${totalCents} cents`);
  return totalCents;
}
