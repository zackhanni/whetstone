/**
 * A fake database with a little latency, a load counter, and a switch to make the next load
 * fail. (Read-only support file.)
 */
export type Product = { id: string; name: string; price: number };

export interface ProductDb {
  findProduct(id: string): Promise<Product>;
  updatePrice(id: string, price: number): Promise<void>;
}

/** How long a fake query takes, in real milliseconds. */
export const DB_LATENCY_MS = 5;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class FakeProductDb implements ProductDb {
  /** How many times findProduct has run. */
  loads = 0;
  private failNext = false;
  private readonly rows = new Map<string, Product>([
    ["p1", { id: "p1", name: "Salmon kibble", price: 1299 }],
    ["p2", { id: "p2", name: "Cat litter", price: 899 }],
  ]);

  /** The next findProduct rejects, as a query does when the database times out. */
  failNextLoad(): void {
    this.failNext = true;
  }

  async findProduct(id: string): Promise<Product> {
    this.loads += 1;
    await wait(DB_LATENCY_MS);
    if (this.failNext) {
      this.failNext = false;
      throw new Error("database timeout");
    }
    const row = this.rows.get(id);
    if (!row) throw new Error(`product ${id} not found`);
    return { ...row };
  }

  async updatePrice(id: string, price: number): Promise<void> {
    await wait(DB_LATENCY_MS);
    const row = this.rows.get(id);
    if (!row) throw new Error(`product ${id} not found`);
    this.rows.set(id, { ...row, price });
  }
}
