import type { AcurisClient } from "../client.js";
import { AcurisValidationError } from "../errors.js";
import type { PhoneMatchOptions, PhoneMatchResult } from "../types.js";

/**
 * Offline de-duplication: decide whether two differently-formatted phone
 * numbers refer to the same line (e.g. "+1 415 555 2671" vs "(415) 555-2671").
 * Charges 1 phone_credit. `same_number` is true for exact / nsn matches — the
 * field most callers collapse duplicates on.
 */
export async function phoneMatch(
  client: AcurisClient,
  a: string,
  b: string,
  options: PhoneMatchOptions = {},
): Promise<PhoneMatchResult> {
  const aStr = (a || "").trim();
  const bStr = (b || "").trim();
  if (!aStr || !bStr) {
    throw new AcurisValidationError("both a and b are required", {
      endpoint: "/validate-phone/match",
    });
  }
  const body: Record<string, unknown> = { a: aStr, b: bStr };
  if (options.country) body.country = options.country;
  return client.request<PhoneMatchResult>({
    method: "POST",
    path: "/validate-phone/match",
    body,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    signal: options.signal,
  });
}
