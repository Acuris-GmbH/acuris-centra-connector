import { describe, expect, it } from "vitest";
import { AcurisClient } from "../src/client.js";
import { validateAddress } from "../src/endpoints/validate.js";
import { AcurisValidationError } from "../src/errors.js";
import { mockFetch } from "./helpers/mockFetch.js";
import okFixture from "./fixtures/validate.ok.json" with { type: "json" };

describe("validateAddress", () => {
  it("posts to /validate with country + fielded input (country stripped from input)", async () => {
    const m = mockFetch([{ kind: "ok", body: okFixture }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    const r = await validateAddress(c, {
      country: "usa",
      street: "Main St",
      house_number: "100",
      city: "San Francisco",
      state: "CA",
      postcode: "94105",
    });
    expect(r.accuracy_type).toBe("street_interpolated");
    expect(r.standardized?.city).toBe("SAN FRANCISCO");

    const call = m.calls[0]!;
    expect(call.method).toBe("POST");
    expect(new URL(call.url).pathname).toBe("/validate");
    const sent = call.body as { country: string; input: Record<string, string> };
    expect(sent.country).toBe("usa");
    expect(sent.input.country).toBeUndefined();
    expect(sent.input.street).toBe("Main St");
  });

  it("accepts a single-line string when options.country is set", async () => {
    const m = mockFetch([{ kind: "ok", body: okFixture }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    await validateAddress(c, "100 Main St San Francisco CA 94105", { country: "usa" });
    const sent = m.calls[0]!.body as { country: string; input: string };
    expect(sent.country).toBe("usa");
    expect(sent.input).toBe("100 Main St San Francisco CA 94105");
  });

  it("throws AcurisValidationError when no country is resolvable", async () => {
    const m = mockFetch([]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn });
    await expect(validateAddress(c, "100 Main St")).rejects.toBeInstanceOf(
      AcurisValidationError,
    );
    expect(m.calls).toHaveLength(0);
  });

  it("lowercases country at the wire", async () => {
    const m = mockFetch([{ kind: "ok", body: okFixture }]);
    const c = new AcurisClient({ apiKey: "k", fetch: m.fn, maxRetries: 0 });
    await validateAddress(c, "x", { country: "DEU" });
    const sent = m.calls[0]!.body as { country: string };
    expect(sent.country).toBe("deu");
  });
});
