import { describe, expect, it } from "vitest";
import { AcurisClient } from "../src/client.js";
import { suggestAddress } from "../src/endpoints/suggest.js";
import { AcurisValidationError } from "../src/errors.js";
import { mockFetch } from "./helpers/mockFetch.js";
import suggestFixture from "./fixtures/suggest.ok.json" with { type: "json" };

describe("suggestAddress", () => {
  it("returns empty array when query is whitespace-only (no network call)", async () => {
    const m = mockFetch([]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn });
    const r = await suggestAddress(c, "   ", { country: "usa" });
    expect(r).toEqual([]);
    expect(m.calls).toHaveLength(0);
  });

  it("GETs /suggest with q/country/limit", async () => {
    const m = mockFetch([{ kind: "ok", body: suggestFixture }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    const r = await suggestAddress(c, "100 Main", { country: "usa", limit: 5 });
    expect(r).toHaveLength(2);
    expect(r[0]!.city).toBe("WATSONVILLE");
    const u = new URL(m.calls[0]!.url);
    expect(u.searchParams.get("q")).toBe("100 Main");
    expect(u.searchParams.get("limit")).toBe("5");
  });

  it("clamps limit to [1, 50] and defaults to 10", async () => {
    const m = mockFetch([
      { kind: "ok", body: suggestFixture },
      { kind: "ok", body: suggestFixture },
      { kind: "ok", body: suggestFixture },
    ]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    await suggestAddress(c, "x", { country: "usa" });
    await suggestAddress(c, "x", { country: "usa", limit: 0 });
    await suggestAddress(c, "x", { country: "usa", limit: 999 });
    expect(new URL(m.calls[0]!.url).searchParams.get("limit")).toBe("10");
    expect(new URL(m.calls[1]!.url).searchParams.get("limit")).toBe("10");
    expect(new URL(m.calls[2]!.url).searchParams.get("limit")).toBe("50");
  });

  it("requires country", async () => {
    const c = new AcurisClient({ apiKey: "k", fetch: mockFetch().fn });
    await expect(suggestAddress(c, "x", {})).rejects.toBeInstanceOf(AcurisValidationError);
  });

  it("tolerates missing suggestions key", async () => {
    const m = mockFetch([{ kind: "ok", body: {} }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    expect(await suggestAddress(c, "x", { country: "usa" })).toEqual([]);
  });
});
