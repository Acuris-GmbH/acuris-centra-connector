import type {
  AddressInput,
  SuggestionHit,
  ValidationResult,
} from "@acuris-geo/av-sdk";
import type { AcurisEndpoints } from "./types.js";

/**
 * Browser-safe wrappers that call _your_ proxy endpoints (not Acuris directly).
 * Kept tiny — no retries, no auth headers; the proxy handles all of that.
 *
 * Signal is forwarded so consumers can wire AbortController to component
 * lifetimes (e.g. cancel inflight typeahead on unmount).
 */

export async function postValidateViaProxy(
  endpoint: string,
  country: string,
  input: AddressInput,
  signal?: AbortSignal,
): Promise<ValidationResult> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ country, input }),
    signal,
  });
  const body: unknown = await safeJson(res);
  if (!res.ok) {
    throw buildProxyError(res.status, body, endpoint);
  }
  return body as ValidationResult;
}

export async function getSuggestViaProxy(
  endpoint: string,
  country: string,
  q: string,
  options: { limit?: number; state?: string; signal?: AbortSignal } = {},
): Promise<SuggestionHit[]> {
  const url = new URL(endpoint, browserBaseUrl());
  url.searchParams.set("country", country);
  url.searchParams.set("q", q);
  if (options.limit) url.searchParams.set("limit", String(options.limit));
  if (options.state) url.searchParams.set("state", options.state);

  const res = await fetch(url.toString().replace(browserBaseUrl(), "").startsWith("/")
    ? url.pathname + url.search
    : url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: options.signal,
  });
  const body: unknown = await safeJson(res);
  if (!res.ok) {
    throw buildProxyError(res.status, body, endpoint);
  }
  if (body && typeof body === "object" && Array.isArray((body as { suggestions?: unknown }).suggestions)) {
    return (body as { suggestions: SuggestionHit[] }).suggestions;
  }
  return [];
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function browserBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "http://localhost";
}

function buildProxyError(status: number, body: unknown, endpoint: string): Error {
  const msg =
    (body && typeof body === "object" && typeof (body as { message?: string }).message === "string"
      ? (body as { message: string }).message
      : undefined) ??
    (body && typeof body === "object" && typeof (body as { error?: string }).error === "string"
      ? (body as { error: string }).error
      : undefined) ??
    `HTTP ${status} from ${endpoint}`;
  const err = new Error(msg);
  (err as { status?: number }).status = status;
  (err as { body?: unknown }).body = body;
  return err;
}
