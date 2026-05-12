import { describe, expect, it } from "vitest";
import { hitToDisplay } from "../src/AcurisAddressInput.js";

describe("hitToDisplay", () => {
  it("collapses multi-line formatted_address to a single line with commas", () => {
    expect(
      hitToDisplay({
        country: "deu",
        formatted_address: "Hammanstr. 1\n67549 Worms\nGERMANY",
      }),
    ).toBe("Hammanstr. 1, 67549 Worms, GERMANY");
  });

  it("handles CRLF line endings", () => {
    expect(
      hitToDisplay({
        country: "deu",
        formatted_address: "Friedrichstraße 43\r\n10117 Berlin\r\nGERMANY",
      }),
    ).toBe("Friedrichstraße 43, 10117 Berlin, GERMANY");
  });

  it("falls back to a synthesised form when formatted_address is missing", () => {
    expect(
      hitToDisplay({
        country: "usa",
        house_number: "100",
        street: "MAIN ST",
        city: "SAN FRANCISCO",
        state: "CA",
        postcode: "94105",
      }),
    ).toMatch(/100\s+MAIN ST/);
  });

  it("does not produce double-commas when intermediate lines are empty", () => {
    expect(
      hitToDisplay({
        country: "swe",
        formatted_address: "Drottninggatan 1\n\n111 51 Stockholm\nSWEDEN",
      }),
    ).toBe("Drottninggatan 1, 111 51 Stockholm, SWEDEN");
  });
});
