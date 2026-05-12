import { describe, expect, it } from "vitest";
import { AcurisClient } from "../src/client.js";
import { geocodeAddress } from "../src/endpoints/geocode.js";
import { AcurisValidationError } from "../src/errors.js";
import { mockFetch } from "./helpers/mockFetch.js";
import geocodeFixture from "./fixtures/geocode.ok.json" with { type: "json" };
import validateFixture from "./fixtures/validate.ok.json" with { type: "json" };

describe("geocodeAddress", () => {
  it("issues GET /geocode with query params for fielded input", async () => {
    const m = mockFetch([{ kind: "ok", body: geocodeFixture }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    const r = await geocodeAddress(c, {
      country: "usa",
      street: "Main St",
      house_number: "100",
      city: "San Francisco",
      state: "CA",
      postcode: "94105",
    });
    expect(r.lat).toBeCloseTo(37.79215);
    expect(r.lng).toBeCloseTo(-122.39535);

    const u = new URL(m.calls[0]!.url);
    expect(u.pathname).toBe("/geocode");
    expect(m.calls[0]!.method).toBe("GET");
    expect(u.searchParams.get("country")).toBe("usa");
    expect(u.searchParams.get("street")).toBe("Main St");
    expect(u.searchParams.get("hno")).toBe("100");
    expect(u.searchParams.get("city")).toBe("San Francisco");
    expect(u.searchParams.get("state")).toBe("CA");
    expect(u.searchParams.get("postalcode")).toBe("94105");
  });

  it("falls back to /validate for single-line strings and maps result", async () => {
    const m = mockFetch([{ kind: "ok", body: validateFixture }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    const r = await geocodeAddress(c, "100 Main St SF CA 94105", { country: "usa" });
    expect(m.calls[0]!.method).toBe("POST");
    expect(new URL(m.calls[0]!.url).pathname).toBe("/validate");
    expect(r.lat).toBeCloseTo(37.79215);
    expect(r.city).toBe("SAN FRANCISCO");
    expect(r.formatted_address).toContain("Main St");
  });

  it("requires country", async () => {
    const m = mockFetch([]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn });
    await expect(geocodeAddress(c, { street: "X" })).rejects.toBeInstanceOf(
      AcurisValidationError,
    );
  });
});
