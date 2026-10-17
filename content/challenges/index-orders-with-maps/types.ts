/** Read-only support file: the shapes the API returns. The functions live in orders.ts. */
export type Customer = { id: number; name: string };

export type Order = { id: number; customerId: number; total: number; tags: string[] };

export type OrderRow = Order & { customerName: string };
