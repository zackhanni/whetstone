import { clock } from "./clock";

export type InboxState = "in-progress" | "done";

/**
 * The consumer's inbox: which events it has handled, kept in a store every replica shares (Redis,
 * in production). Each call is a network round trip, so each one awaits. TTLs are milliseconds.
 */
export interface Inbox {
  /** The key's state, or `undefined` if it's absent or expired. */
  get(key: string): Promise<InboxState | undefined>;
  /** Write unconditionally (Redis: `SET key value PX ttlMs`). */
  set(key: string, state: InboxState, ttlMs: number): Promise<void>;
  /**
   * Write only if the key is absent, as ONE atomic step (Redis: `SET key value NX PX ttlMs`).
   * Resolves `true` if this call wrote it, `false` if the key already existed.
   */
  setIfAbsent(key: string, state: InboxState, ttlMs: number): Promise<boolean>;
  delete(key: string): Promise<void>;
}

/** One network round trip: the value is read or written after it, as Redis would. */
const roundTrip = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** An in-memory stand-in for the Redis inbox. (Read-only support file.) */
export class FakeInbox implements Inbox {
  private readonly entries = new Map<string, { state: InboxState; expiresAt: number }>();

  private read(key: string): InboxState | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (clock.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.state;
  }

  async get(key: string): Promise<InboxState | undefined> {
    await roundTrip();
    return this.read(key);
  }

  async set(key: string, state: InboxState, ttlMs: number): Promise<void> {
    await roundTrip();
    this.entries.set(key, { state, expiresAt: clock.now() + ttlMs });
  }

  async setIfAbsent(key: string, state: InboxState, ttlMs: number): Promise<boolean> {
    await roundTrip();
    // Check and write with no await in between: nothing else can run here, which is what makes
    // it atomic — like Redis executing one command at a time.
    if (this.read(key) !== undefined) return false;
    this.entries.set(key, { state, expiresAt: clock.now() + ttlMs });
    return true;
  }

  async delete(key: string): Promise<void> {
    await roundTrip();
    this.entries.delete(key);
  }

  /** For the grader: what is stored under a key right now. */
  peek(key: string): InboxState | undefined {
    return this.read(key);
  }
}
