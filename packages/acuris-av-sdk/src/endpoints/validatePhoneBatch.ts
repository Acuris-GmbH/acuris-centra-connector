import type { AcurisClient } from "../client.js";
import { AcurisValidationError } from "../errors.js";
import type {
  PhoneValidateOptions,
  PhoneValidateBatchResult,
} from "../types.js";

const BATCH_MAX = 1000;

/**
 * Validate up to 1,000 phone numbers in one synchronous request. Charges N
 * phone credits atomically — rejects with HTTP 403 `insufficient_phone_credits`
 * if the key doesn't have enough headroom. Fully offline, so there is no
 * per-number network cost.
 */
export async function validatePhoneBatch(
  client: AcurisClient,
  phones: string[],
  options: PhoneValidateOptions = {},
): Promise<PhoneValidateBatchResult> {
  if (!Array.isArray(phones) || phones.length === 0) {
    throw new AcurisValidationError(
      "phones must be a non-empty array of strings",
      { endpoint: "/validate-phone/batch" },
    );
  }
  if (phones.length > BATCH_MAX) {
    throw new AcurisValidationError(
      `batch too large — ${phones.length} > ${BATCH_MAX}`,
      { endpoint: "/validate-phone/batch" },
    );
  }
  const body: Record<string, unknown> = {
    phones: phones.map((p) => String(p || "").trim()).filter(Boolean),
  };
  if (options.country) body.country = options.country;
  if (options.lang) body.lang = options.lang;
  return client.request<PhoneValidateBatchResult>({
    method: "POST",
    path: "/validate-phone/batch",
    body,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    signal: options.signal,
  });
}
