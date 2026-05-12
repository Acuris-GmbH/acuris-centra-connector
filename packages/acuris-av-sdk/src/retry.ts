/**
 * Exponential backoff with jitter. Used internally by the client; exported
 * because consumers occasionally want to wrap their own retries with the
 * same policy.
 */
export interface RetryPolicy {
  maxRetries: number;
  /** Base delay in ms. Defaults to 200. */
  baseDelayMs?: number;
  /** Cap on a single delay in ms. Defaults to 4000. */
  maxDelayMs?: number;
}

/**
 * Compute the delay before retry attempt `attempt` (0-indexed: 0 = first retry).
 * Adds ±25% jitter so callers don't thunder.
 *
 * For testability, an optional `random` function can be passed; defaults to Math.random.
 */
export function backoffDelayMs(
  attempt: number,
  policy: RetryPolicy,
  random: () => number = Math.random,
): number {
  const base = policy.baseDelayMs ?? 200;
  const cap = policy.maxDelayMs ?? 4000;
  const exp = Math.min(cap, base * 2 ** attempt);
  const jitter = exp * (0.75 + 0.5 * random()); // 0.75x..1.25x
  return Math.max(0, Math.round(jitter));
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("aborted"));
      return;
    }
    const id = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(signal?.reason ?? new Error("aborted"));
    };
    const cleanup = () => {
      clearTimeout(id);
      signal?.removeEventListener("abort", onAbort);
    };
    signal?.addEventListener("abort", onAbort);
  });
}
