import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAcurisValidation } from "../src/useAcurisValidation.js";

const okResult = {
  accuracy_type: "rooftop",
  confidence: 1,
  match_type: "rooftop",
  match_score: 1,
  match_components: { city: true, house_number: true, state: true, street: true, zip: true },
  input_corrected: false,
  standardized: {
    country: "deu",
    city: "Berlin",
    formatted_address: "Friedrichstraße 43, 10117 Berlin",
  },
};

const endpoints = { validate: "/api/acuris/validate" };

describe("useAcurisValidation", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(okResult), { status: 200 }),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it("transitions idle → loading → ok and returns the result", async () => {
    const { result } = renderHook(() =>
      useAcurisValidation({ endpoints, country: "deu" }),
    );
    expect(result.current.status).toBe("idle");
    let returned: unknown;
    await act(async () => {
      returned = await result.current.validate({ street: "Friedrichstraße", city: "Berlin" });
    });
    expect(returned).toMatchObject({ accuracy_type: "rooftop" });
    expect(result.current.status).toBe("ok");
    expect(result.current.result?.match_score).toBe(1);
  });

  it("transitions to error on failed proxy response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "bad" }), { status: 400 }),
    );
    const { result } = renderHook(() =>
      useAcurisValidation({ endpoints, country: "deu" }),
    );
    await act(async () => {
      await result.current.validate({ street: "X" });
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toBe("bad");
  });

  it("reset() clears state", async () => {
    const { result } = renderHook(() =>
      useAcurisValidation({ endpoints, country: "deu" }),
    );
    await act(async () => {
      await result.current.validate({ street: "X" });
    });
    expect(result.current.status).toBe("ok");
    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeUndefined();
  });

  it("aborts an inflight request when validate is called again (second wins)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    let firstAborted = false;
    fetchSpy.mockImplementationOnce(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            firstAborted = true;
            reject(init.signal!.reason ?? new DOMException("aborted", "AbortError"));
          });
        }),
    );
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(okResult), { status: 200 }),
    );

    const { result } = renderHook(() =>
      useAcurisValidation({ endpoints, country: "deu" }),
    );
    // Kick the first call but don't await it — it's intentionally hanging.
    let firstPromise!: Promise<unknown>;
    act(() => {
      firstPromise = result.current.validate({ street: "first" });
    });
    await act(async () => {
      await result.current.validate({ street: "second" });
    });
    expect(result.current.status).toBe("ok");
    await firstPromise.catch(() => undefined);
    expect(firstAborted).toBe(true);
  });
});
