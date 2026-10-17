/**
 * The side effect the event triggers: booking a courier. Not idempotent on its own — call it twice
 * and the customer gets two parcels. It takes a few real milliseconds, and can be told to fail
 * once, to wait until it's released (a slow courier API), or to hang forever (a worker that died
 * mid-call). (Read-only support file.)
 */
export interface Shipments {
  create(orderId: string): Promise<void>;
}

/** How long booking a courier takes, in real milliseconds. */
export const SHIPMENT_LATENCY_MS = 10;

export class FakeShipments implements Shipments {
  /** Every shipment actually booked, by order id. */
  readonly booked: string[] = [];
  /** How many create() calls have started (booked, failed or still running). */
  started = 0;
  private mode: "ok" | "fail-once" | "hold-once" | "hang-once" = "ok";
  private gate: Promise<void> | null = null;

  /** The next create() rejects, as a courier API does when it times out. */
  failNext(): void {
    this.mode = "fail-once";
  }

  /**
   * The next create() doesn't finish until the returned function is called: the courier API is
   * slow to answer, for exactly as long as the grader needs.
   */
  holdNext(): () => void {
    let release: () => void = () => {};
    this.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.mode = "hold-once";
    return release;
  }

  /** The next create() never settles: the worker running it has died. */
  hangNext(): void {
    this.mode = "hang-once";
  }

  async create(orderId: string): Promise<void> {
    this.started += 1;
    const mode = this.mode;
    const gate = this.gate;
    this.mode = "ok";
    this.gate = null;
    if (mode === "hang-once") return new Promise<void>(() => {});
    if (gate) await gate;
    await new Promise<void>((resolve) => setTimeout(resolve, SHIPMENT_LATENCY_MS));
    if (mode === "fail-once") throw new Error("courier API timed out");
    this.booked.push(orderId);
  }

  count(orderId: string): number {
    return this.booked.filter((id) => id === orderId).length;
  }
}
