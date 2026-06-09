import type { AcurisClient } from "../client.js";
import { AcurisValidationError } from "../errors.js";
import type {
  PhoneValidateOptions,
  PhoneValidationResult,
} from "../types.js";

/**
 * Validate a single phone number, entirely offline (Google libphonenumber
 * metadata): E.164 / international / national formats, validity, line type,
 * carrier, region, time zone(s), an SMS-capable flag, plus premium-rate /
 * toll-free / short-number / emergency flags.
 *
 * Charges 1 phone_credit per call — a pool separate from address validation,
 * geocoding and email (bundled free with AV/Geo plans).
 */
export async function validatePhone(
  client: AcurisClient,
  phone: string,
  options: PhoneValidateOptions = {},
): Promise<PhoneValidationResult> {
  const num = (phone || "").trim();
  if (!num) {
    throw new AcurisValidationError("phone is required", {
      endpoint: "/validate-phone",
    });
  }
  const body: Record<string, unknown> = { phone: num };
  if (options.country) body.country = options.country;
  if (options.lang) body.lang = options.lang;
  return client.request<PhoneValidationResult>({
    method: "POST",
    path: "/validate-phone",
    body,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    signal: options.signal,
  });
}
