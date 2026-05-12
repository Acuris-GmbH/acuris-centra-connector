import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAcurisSuggest } from "../src/useAcurisSuggest.js";

const suggestPayload = {
  suggestions: [
    { country: "deu", city: "Berlin", formatted_address: "Friedrichstraße 43, 10117 Berlin" },
    { country: "deu", city: "Berlin", formatted_address: "Friedrichstraße 100, 10117 Berlin" },
  ],
};

describe("useAcurisSuggest", () => {
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(suggestPayload), { status: 200 }),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it("does nothing when endpoint is undefined", async () => {
    const { result } = renderHook(() =>
      useAcurisSuggest({ endpoint: undefined, country: "deu", q: "Friedrich" }),
    );
    await new Promise((r) => setTimeout(r, 30));
    expect(result.current.suggestions).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("does nothing for queries shorter than minQueryLength", async () => {
    renderHook(() =>
      useAcurisSuggest({
        endpoint: "/api/acuris/suggest",
        country: "deu",
        q: "Fr",
        debounceMs: 0,
        minQueryLength: 3,
      }),
    );
    await new Promise((r) => setTimeout(r, 30));
    expect(spy).not.toHaveBeenCalled();
  });

  it("fetches and surfaces suggestions after debounce", async () => {
    const { result } = renderHook(() =>
      useAcurisSuggest({
        endpoint: "/api/acuris/suggest",
        country: "deu",
        q: "Friedrich",
        debounceMs: 0,
      }),
    );
    await waitFor(() => expect(result.current.suggestions.length).toBe(2));
    expect(result.current.isLoading).toBe(false);
    const calledUrl = (spy.mock.calls[0]?.[0] as string) ?? "";
    expect(calledUrl).toContain("country=deu");
    expect(calledUrl).toContain("q=Friedrich");
  });

  it("surfaces errors when the proxy returns non-OK", async () => {
    spy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 }),
    );
    const { result } = renderHook(() =>
      useAcurisSuggest({
        endpoint: "/api/acuris/suggest",
        country: "deu",
        q: "Friedrich",
        debounceMs: 0,
      }),
    );
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.suggestions).toEqual([]);
  });
});
