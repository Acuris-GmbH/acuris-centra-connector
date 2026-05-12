import { describe, expect, it } from "vitest";
import { backoffDelayMs, sleep } from "../src/retry.js";

describe("backoffDelayMs", () => {
  it("grows exponentially up to the cap", () => {
    const policy = { maxRetries: 5, baseDelayMs: 100, maxDelayMs: 1000 };
    const noJitter = () => 0.5; // exact 1.0x multiplier
    expect(backoffDelayMs(0, policy, noJitter)).toBe(100);
    expect(backoffDelayMs(1, policy, noJitter)).toBe(200);
    expect(backoffDelayMs(2, policy, noJitter)).toBe(400);
    expect(backoffDelayMs(3, policy, noJitter)).toBe(800);
    expect(backoffDelayMs(4, policy, noJitter)).toBe(1000); // capped
    expect(backoffDelayMs(99, policy, noJitter)).toBe(1000);
  });

  it("applies ±25% jitter window", () => {
    const policy = { maxRetries: 1, baseDelayMs: 1000, maxDelayMs: 10000 };
    const low = backoffDelayMs(0, policy, () => 0);
    const high = backoffDelayMs(0, policy, () => 1);
    expect(low).toBe(750);
    expect(high).toBe(1250);
  });
});

describe("sleep", () => {
  it("resolves after the requested delay", async () => {
    const start = Date.now();
    await sleep(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  it("rejects immediately if signal is already aborted", async () => {
    const ac = new AbortController();
    ac.abort(new Error("nope"));
    await expect(sleep(100, ac.signal)).rejects.toThrow();
  });

  it("rejects when signal aborts mid-sleep", async () => {
    const ac = new AbortController();
    setTimeout(() => ac.abort(new Error("mid")), 5);
    await expect(sleep(1000, ac.signal)).rejects.toThrow();
  });
});
