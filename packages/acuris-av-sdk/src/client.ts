import {
  AcurisError,
  AcurisNetworkError,
  AcurisTimeoutError,
  errorFromResponse,
  isTransientStatus,
} from "./errors.js";
import { backoffDelayMs, sleep } from "./retry.js";
import { SDK_VERSION } from "./version.js";
import type { ClientOptions } from "./types.js";

const DEFAULT_BASE_URL = "https://api.acuris-geo.com";
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_RETRIES = 3;

export interface RequestOptions {
  method?: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}

/**
 * Low-level HTTP client. Handles auth, timeouts, retries, and JSON parsing.
 *
 * Typically you'll use the higher-level helpers (`validateAddress`,
 * `geocodeAddress`, etc.) which instantiate this for you, but this class is
 * exported for callers who want full control over a long-lived connection
 * (e.g. server-side batch jobs).
 */
export class AcurisClient {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  private readonly apiKey: string;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(options: ClientOptions = {}) {
    const apiKey =
      options.apiKey ??
      (typeof process !== "undefined" ? process.env?.ACURIS_API_KEY : undefined);
    if (!apiKey) {
      throw new AcurisError(
        "Acuris API key not provided. Pass `apiKey` or set ACURIS_API_KEY in the environment.",
      );
    }
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new AcurisError(
        "No global `fetch` available. Pass a `fetch` implementation to the client, or run on Node 18+.",
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.userAgent = `acuris-av-sdk/${SDK_VERSION}${
      options.userAgent ? ` ${options.userAgent}` : ""
    }`;
    this.fetchImpl = fetchImpl;
  }

  async request<T>(opts: RequestOptions): Promise<T> {
    const method = opts.method ?? "GET";
    const url = this.buildUrl(opts.path, opts.query);
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    const maxRetries = opts.maxRetries ?? this.maxRetries;
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Acuris-Key": this.apiKey,
      "User-Agent": this.userAgent,
    };
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }

    let attempt = 0;
    let lastError: unknown;
    while (true) {
      try {
        return await this.executeOnce<T>(url, init, opts.path, timeoutMs, opts.signal);
      } catch (err) {
        lastError = err;
        const shouldRetry =
          attempt < maxRetries &&
          err instanceof AcurisError &&
          shouldRetryError(err);
        if (!shouldRetry) throw err;
        const delay = backoffDelayMs(attempt, { maxRetries });
        await sleep(delay, opts.signal);
        attempt += 1;
      }
    }
  }

  private async executeOnce<T>(
    url: string,
    init: RequestInit,
    endpoint: string,
    timeoutMs: number,
    externalSignal?: AbortSignal,
  ): Promise<T> {
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort(externalSignal!.reason);
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort(externalSignal.reason);
      else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }
    const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (controller.signal.aborted && !externalSignal?.aborted) {
        throw new AcurisTimeoutError(`Request to ${endpoint} timed out after ${timeoutMs}ms`, {
          endpoint,
          cause: err,
        });
      }
      throw new AcurisNetworkError(`Network error calling ${endpoint}`, {
        endpoint,
        cause: err,
      });
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }

    const text = await response.text();
    const parsed = parseJson(text);
    if (!response.ok) {
      throw errorFromResponse(response.status, parsed ?? text, endpoint);
    }
    if (parsed === undefined) {
      throw new AcurisError(`Malformed JSON response from ${endpoint}`, {
        endpoint,
        body: text,
        status: response.status,
      });
    }
    return parsed as T;
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const u = new URL(this.baseUrl + (path.startsWith("/") ? path : "/" + path));
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        u.searchParams.set(k, String(v));
      }
    }
    return u.toString();
  }
}

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function shouldRetryError(err: AcurisError): boolean {
  if (err.status !== undefined && isTransientStatus(err.status)) return true;
  if (err.name === "AcurisNetworkError") return true;
  if (err.name === "AcurisTimeoutError") return true;
  return false;
}
