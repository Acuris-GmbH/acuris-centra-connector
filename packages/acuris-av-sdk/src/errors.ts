/**
 * Error hierarchy for the Acuris SDK.
 *
 *   AcurisError                   — base class; check `instanceof AcurisError`
 *   ├─ AcurisAuthError            — 401/403 from the API
 *   ├─ AcurisValidationError      — 400/422 (bad input)
 *   ├─ AcurisNotFoundError        — 404 (no match found)
 *   ├─ AcurisRateLimitError       — 429
 *   ├─ AcurisServerError          — 5xx
 *   ├─ AcurisTimeoutError         — request timed out client-side
 *   └─ AcurisNetworkError         — fetch threw before producing a response
 */
export class AcurisError extends Error {
  readonly status?: number;
  readonly body?: unknown;
  readonly endpoint?: string;
  constructor(
    message: string,
    opts: { status?: number; body?: unknown; endpoint?: string; cause?: unknown } = {},
  ) {
    super(message, opts.cause ? { cause: opts.cause } : undefined);
    this.name = "AcurisError";
    this.status = opts.status;
    this.body = opts.body;
    this.endpoint = opts.endpoint;
  }
}

export class AcurisAuthError extends AcurisError {
  constructor(message: string, opts: ConstructorParameters<typeof AcurisError>[1]) {
    super(message, opts);
    this.name = "AcurisAuthError";
  }
}

export class AcurisValidationError extends AcurisError {
  constructor(message: string, opts: ConstructorParameters<typeof AcurisError>[1]) {
    super(message, opts);
    this.name = "AcurisValidationError";
  }
}

export class AcurisNotFoundError extends AcurisError {
  constructor(message: string, opts: ConstructorParameters<typeof AcurisError>[1]) {
    super(message, opts);
    this.name = "AcurisNotFoundError";
  }
}

export class AcurisRateLimitError extends AcurisError {
  /** Server-suggested retry-after, in seconds, if provided. */
  readonly retryAfterSeconds?: number;
  constructor(
    message: string,
    opts: ConstructorParameters<typeof AcurisError>[1] & { retryAfterSeconds?: number },
  ) {
    super(message, opts);
    this.name = "AcurisRateLimitError";
    this.retryAfterSeconds = opts.retryAfterSeconds;
  }
}

export class AcurisServerError extends AcurisError {
  constructor(message: string, opts: ConstructorParameters<typeof AcurisError>[1]) {
    super(message, opts);
    this.name = "AcurisServerError";
  }
}

export class AcurisTimeoutError extends AcurisError {
  constructor(message: string, opts: ConstructorParameters<typeof AcurisError>[1] = {}) {
    super(message, opts);
    this.name = "AcurisTimeoutError";
  }
}

export class AcurisNetworkError extends AcurisError {
  constructor(message: string, opts: ConstructorParameters<typeof AcurisError>[1] = {}) {
    super(message, opts);
    this.name = "AcurisNetworkError";
  }
}

/** True if a status code is a transient class the SDK retries automatically. */
export function isTransientStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

/** Map an HTTP status + parsed body to the right AcurisError subclass. */
export function errorFromResponse(
  status: number,
  body: unknown,
  endpoint: string,
): AcurisError {
  const message = extractMessage(body) ?? `HTTP ${status} from ${endpoint}`;
  const opts = { status, body, endpoint };
  if (status === 401 || status === 403) return new AcurisAuthError(message, opts);
  if (status === 404) return new AcurisNotFoundError(message, opts);
  if (status === 429) {
    const retryAfter = extractRetryAfter(body);
    return new AcurisRateLimitError(message, { ...opts, retryAfterSeconds: retryAfter });
  }
  if (status >= 500) return new AcurisServerError(message, opts);
  if (status === 400 || status === 422) return new AcurisValidationError(message, opts);
  return new AcurisError(message, opts);
}

function extractMessage(body: unknown): string | undefined {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.message === "string") return b.message;
    if (typeof b.error === "string") return b.error;
  }
  return undefined;
}

function extractRetryAfter(body: unknown): number | undefined {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.retry_after === "number") return b.retry_after;
  }
  return undefined;
}
