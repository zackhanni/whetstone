import { fn, spyOn } from "./spy";
import { checkout } from "./checkout";

describe("fn()", () => {
  it("returns undefined and starts with an empty call log when given no implementation", () => {
    const noop = fn();
    expect(noop.calls.length).toBe(0);
    expect(noop("a")).toBe(undefined);
    expect(noop.calls.length).toBe(1);
  });

  it("returns whatever its implementation returns", () => {
    const add = fn((a: number, b: number) => a + b);
    expect(add(2, 3)).toBe(5);
  });

  it("records every call's arguments, oldest first", () => {
    const log = fn();
    log("first", 1);
    log("second", 2);
    expect(log.calls.length).toBe(2);
    expect(JSON.stringify(log.calls)).toBe(JSON.stringify([["first", 1], ["second", 2]]));
  });
});

describe("spyOn()", () => {
  it("still runs the original method, with the right this", () => {
    const counter = {
      count: 0,
      increment() {
        this.count += 1;
        return this.count;
      },
    };
    const spy = spyOn(counter, "increment");
    counter.increment();
    counter.increment();
    expect(counter.count).toBe(2);
    expect(spy.calls.length).toBe(2);
  });

  it("spies on a class prototype without mixing up the instances' this", () => {
    class Counter {
      count = 0;
      increment() {
        this.count += 1;
        return this.count;
      }
    }
    const spy = spyOn(Counter.prototype, "increment");
    const a = new Counter();
    const b = new Counter();
    a.increment();
    a.increment();
    b.increment();
    expect(a.count).toBe(2);
    expect(b.count).toBe(1);
    expect(spy.calls.length).toBe(3);
    spy.restore();
  });

  it("restore() puts the original method back on the object", () => {
    const clock = {
      now() {
        return 1_000;
      },
    };
    const original = clock.now;
    const spy = spyOn(clock, "now");
    expect(clock.now === original).toBe(false); // replaced while spying
    spy.restore();
    expect(clock.now === original).toBe(true);
    expect(clock.now()).toBe(1_000);
  });
});

describe("as test doubles for checkout()", () => {
  const order = { subtotalCents: 1_000, currency: "EUR", email: "ada@example.com" };

  it("a stub's answer reaches the code under test", async () => {
    const getRate = fn(async () => 1.1);
    const send = fn(async () => undefined);
    const total = await checkout(order, { rates: { get: getRate }, mailer: { send } });
    expect(total).toBe(1_100);
    expect(getRate.calls.length).toBe(1);
    expect(getRate.calls[0][0]).toBe("EUR");
  });

  it("the spy records exactly one receipt, sent to the customer", async () => {
    const send = fn(async () => undefined);
    await checkout(order, { rates: { get: fn(async () => 2) }, mailer: { send } });
    expect(send.calls.length).toBe(1);
    expect(send.calls[0][0]).toBe("ada@example.com");
    expect(send.calls[0][1]).toBe("Receipt: 2000 cents");
  });
});
