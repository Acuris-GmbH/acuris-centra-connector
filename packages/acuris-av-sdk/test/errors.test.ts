import { describe, expect, it } from "vitest";
import {
  AcurisAuthError,
  AcurisError,
  AcurisNotFoundError,
  AcurisRateLimitError,
  AcurisServerError,
  AcurisValidationError,
  errorFromResponse,
  isTransientStatus,
} from "../src/errors.js";

describe("isTransientStatus", () => {
  it("marks 429 and 5xx as transient", () => {
    expect(isTransientStatus(429)).toBe(true);
    expect(isTransientStatus(500)).toBe(true);
    expect(isTransientStatus(503)).toBe(true);
    expect(isTransientStatus(599)).toBe(true);
  });
  it("rejects 2xx, 3xx, 4xx (non-429) as non-transient", () => {
    expect(isTransientStatus(200)).toBe(false);
    expect(isTransientStatus(304)).toBe(false);
    expect(isTransientStatus(400)).toBe(false);
    expect(isTransientStatus(401)).toBe(false);
    expect(isTransientStatus(404)).toBe(false);
  });
});

describe("errorFromResponse", () => {
  it.each([
    [401, AcurisAuthError],
    [403, AcurisAuthError],
    [404, AcurisNotFoundError],
    [400, AcurisValidationError],
    [422, AcurisValidationError],
    [500, AcurisServerError],
    [502, AcurisServerError],
  ] as const)("maps status %s to %s", (status, klass) => {
    const e = errorFromResponse(status, { error: "boom" }, "/x");
    expect(e).toBeInstanceOf(klass);
    expect(e.status).toBe(status);
    expect(e.endpoint).toBe("/x");
    expect(e.message).toBe("boom");
  });

  it("falls back to a generic message when body lacks one", () => {
    const e = errorFromResponse(418, "I am a teapot", "/tea");
    expect(e).toBeInstanceOf(AcurisError);
    expect(e.message).toMatch(/HTTP 418/);
  });

  it("extracts retry_after for 429", () => {
    const e = errorFromResponse(429, { error: "slow down", retry_after: 12 }, "/x");
    expect(e).toBeInstanceOf(AcurisRateLimitError);
    expect((e as AcurisRateLimitError).retryAfterSeconds).toBe(12);
  });

  it("prefers `message` over `error` field", () => {
    const e = errorFromResponse(500, { message: "specific", error: "generic" }, "/x");
    expect(e.message).toBe("specific");
  });
});
