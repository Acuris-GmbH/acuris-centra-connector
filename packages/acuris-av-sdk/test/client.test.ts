import { describe, expect, it } from "vitest";
import { AcurisClient } from "../src/client.js";
import {
  AcurisAuthError,
  AcurisError,
  AcurisNetworkError,
  AcurisRateLimitError,
  AcurisServerError,
  AcurisTimeoutError,
  AcurisValidationError,
} from "../src/errors.js";
import { mockFetch } from "./helpers/mockFetch.js";

describe("AcurisClient constructor", () => {
  it("throws when no API key is given and ACURIS_API_KEY is unset", () => {
    const prev = process.env.ACURIS_API_KEY;
    delete process.env.ACURIS_API_KEY;
    try {
      expect(() => new AcurisClient({ fetch: () => Promise.reject("x") as never }))
        .toThrowError(/API key/);
    } finally {
      if (prev !== undefined) process.env.ACURIS_API_KEY = prev;
    }
  });

  it("reads API key from env when not passed explicitly", () => {
    process.env.ACURIS_API_KEY = "env-key";
    try {
      const c = new AcurisClient({ fetch: () => Promise.reject("x") as never });
      expect(c.baseUrl).toBe("https://api.acuris-geo.com");
      expect(c.timeoutMs).toBe(5000);
      expect(c.maxRetries).toBe(3);
    } finally {
      delete process.env.ACURIS_API_KEY;
    }
  });

  it("normalizes baseUrl by stripping trailing slashes", () => {
    const c = new AcurisClient({
      apiKey: "k",
      baseUrl: "https://acuris.local/",
      fetch: () => Promise.reject("x") as never,
    });
    expect(c.baseUrl).toBe("https://acuris.local");
  });
});

describe("AcurisClient.request", () => {
  it("sends auth header and parses JSON on success", async () => {
    const m = mockFetch([{ kind: "ok", body: { hello: "world" } }]);
    const c = new AcurisClient({ apiKey: "secret", fetch: m.fn });
    const r = await c.request<{ hello: string }>({ path: "/ping" });
    expect(r).toEqual({ hello: "world" });
    expect(m.calls[0]?.headers["x-acuris-key"]).toBe("secret");
    expect(m.calls[0]?.headers["user-agent"]).toMatch(/acuris-av-sdk\//);
  });

  it("appends query params and skips undefined/null/empty values", async () => {
    const m = mockFetch([{ kind: "ok", body: {} }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn });
    await c.request({
      path: "/x",
      query: { a: "1", b: undefined, c: null, d: "", e: 7, f: false },
    });
    const u = new URL(m.calls[0]!.url);
    expect(u.searchParams.get("a")).toBe("1");
    expect(u.searchParams.has("b")).toBe(false);
    expect(u.searchParams.has("c")).toBe(false);
    expect(u.searchParams.has("d")).toBe(false);
    expect(u.searchParams.get("e")).toBe("7");
    expect(u.searchParams.get("f")).toBe("false");
  });

  it("maps 401 → AcurisAuthError", async () => {
    const m = mockFetch([{ kind: "ok", status: 401, body: { error: "invalid_api_key" } }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    await expect(c.request({ path: "/x" })).rejects.toBeInstanceOf(AcurisAuthError);
  });

  it("maps 400 → AcurisValidationError", async () => {
    const m = mockFetch([{ kind: "ok", status: 400, body: { error: "bad input" } }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    await expect(c.request({ path: "/x" })).rejects.toBeInstanceOf(AcurisValidationError);
  });

  it("retries 5xx then succeeds", async () => {
    const m = mockFetch([
      { kind: "ok", status: 500, body: { error: "boom" } },
      { kind: "ok", status: 500, body: { error: "still boom" } },
      { kind: "ok", body: { ok: true } },
    ]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 3 });
    const r = await c.request<{ ok: boolean }>({ path: "/x" });
    expect(r.ok).toBe(true);
    expect(m.calls).toHaveLength(3);
  });

  it("gives up after maxRetries and throws AcurisServerError", async () => {
    const m = mockFetch([
      { kind: "ok", status: 503, body: {} },
      { kind: "ok", status: 503, body: {} },
    ]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 1 });
    await expect(c.request({ path: "/x" })).rejects.toBeInstanceOf(AcurisServerError);
    expect(m.calls).toHaveLength(2);
  });

  it("retries 429 and surfaces retry-after on final failure", async () => {
    const m = mockFetch([
      { kind: "ok", status: 429, body: { error: "rate", retry_after: 7 } },
      { kind: "ok", status: 429, body: { error: "rate", retry_after: 7 } },
    ]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 1 });
    try {
      await c.request({ path: "/x" });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AcurisRateLimitError);
      expect((err as AcurisRateLimitError).retryAfterSeconds).toBe(7);
    }
  });

  it("throws AcurisTimeoutError when fetch exceeds timeout", async () => {
    const m = mockFetch([{ kind: "stall", ms: 200 }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, timeoutMs: 20, maxRetries: 0 });
    await expect(c.request({ path: "/x" })).rejects.toBeInstanceOf(AcurisTimeoutError);
  });

  it("wraps fetch failures as AcurisNetworkError", async () => {
    const m = mockFetch([{ kind: "error", error: new TypeError("ECONNREFUSED") }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    await expect(c.request({ path: "/x" })).rejects.toBeInstanceOf(AcurisNetworkError);
  });

  it("throws when response is HTTP 200 but not JSON", async () => {
    const m = mockFetch([{ kind: "raw", status: 200, bodyText: "<html>oops</html>" }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    await expect(c.request({ path: "/x" })).rejects.toBeInstanceOf(AcurisError);
  });

  it("respects external AbortSignal", async () => {
    const ac = new AbortController();
    const m = mockFetch([{ kind: "stall", ms: 200 }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, timeoutMs: 1000, maxRetries: 0 });
    const p = c.request({ path: "/x", signal: ac.signal });
    setTimeout(() => ac.abort(new Error("user-cancel")), 10);
    await expect(p).rejects.toThrow();
  });
});
