import { describe, expect, it } from "vitest";
import { AcurisClient } from "../src/client.js";
import { reverseGeocode } from "../src/endpoints/reverseGeocode.js";
import { AcurisValidationError } from "../src/errors.js";
import { mockFetch } from "./helpers/mockFetch.js";
import reverseFixture from "./fixtures/reverse.ok.json" with { type: "json" };

describe("reverseGeocode", () => {
  it("issues GET /reverse with required params and normalizes to {hits, query}", async () => {
    const m = mockFetch([{ kind: "ok", body: reverseFixture }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    const r = await reverseGeocode(c, { lat: 37.7749, lng: -122.4194 }, {
      country: "usa",
      radius_m: 50,
    });
    const u = new URL(m.calls[0]!.url);
    expect(u.pathname).toBe("/reverse");
    expect(u.searchParams.get("country")).toBe("usa");
    expect(u.searchParams.get("lat")).toBe("37.7749");
    expect(u.searchParams.get("lng")).toBe("-122.4194");
    expect(u.searchParams.get("radius_m")).toBe("50");
    expect(r.hits).toHaveLength(1);
    expect(r.hits[0]!.street).toBe("MARKET ST");
    expect(r.query.radius_m).toBe(50);
  });

  it("normalizes multi-hit responses (matches[] form)", async () => {
    const m = mockFetch([
      {
        kind: "ok",
        body: {
          matches: [reverseFixture, { ...reverseFixture, hno: "1520" }],
          query: { lat: 0, lng: 0, radius_m: 100 },
        },
      },
    ]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    const r = await reverseGeocode(c, { lat: 0, lng: 0 }, {
      country: "usa",
      radius_m: 100,
      limit: 2,
    });
    expect(r.hits).toHaveLength(2);
    expect(r.hits[1]!.hno).toBe("1520");
  });

  it("rejects out-of-range coordinates client-side", async () => {
    const m = mockFetch([]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn });
    await expect(
      reverseGeocode(c, { lat: 100, lng: 0 }, { country: "usa" }),
    ).rejects.toBeInstanceOf(AcurisValidationError);
    await expect(
      reverseGeocode(c, { lat: 0, lng: 200 }, { country: "usa" }),
    ).rejects.toBeInstanceOf(AcurisValidationError);
    expect(m.calls).toHaveLength(0);
  });

  it("requires country", async () => {
    const c = new AcurisClient({ apiKey: "k", fetch: mockFetch().fn });
    await expect(
      reverseGeocode(c, { lat: 0, lng: 0 }, { country: "" }),
    ).rejects.toBeInstanceOf(AcurisValidationError);
  });
});
