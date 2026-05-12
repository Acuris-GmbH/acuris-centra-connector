import { describe, expect, it, vi, afterEach } from "vitest";
import { postValidateViaProxy, getSuggestViaProxy } from "../src/transport.js";

describe("postValidateViaProxy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("POSTs JSON to the supplied endpoint", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const r = await postValidateViaProxy("/api/v", "deu", { street: "x" });
    expect(r).toMatchObject({ ok: true });
    const init = spy.mock.calls[0]![1]!;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      country: "deu",
      input: { street: "x" },
    });
  });

  it("throws with proxy error message on non-2xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Insufficient credits" }), { status: 402 }),
    );
    await expect(postValidateViaProxy("/api/v", "deu", "x")).rejects.toThrow(
      /Insufficient credits/,
    );
  });
});

describe("getSuggestViaProxy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("builds query string and returns suggestions[]", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ suggestions: [{ country: "deu" }] }), { status: 200 }),
    );
    const r = await getSuggestViaProxy("/api/s", "deu", "Fried", { limit: 3, state: "BE" });
    expect(r).toHaveLength(1);
    const url = spy.mock.calls[0]![0] as string;
    expect(url).toContain("country=deu");
    expect(url).toContain("q=Fried");
    expect(url).toContain("limit=3");
    expect(url).toContain("state=BE");
  });

  it("returns [] when proxy body lacks suggestions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    expect(await getSuggestViaProxy("/api/s", "deu", "x")).toEqual([]);
  });
});
