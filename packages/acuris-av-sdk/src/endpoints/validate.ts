import type { AcurisClient } from "../client.js";
import { AcurisValidationError } from "../errors.js";
import type {
  AddressInput,
  ValidateOptions,
  ValidationResult,
  FieldedAddressInput,
} from "../types.js";

/**
 * Validate an address. Accepts a single-line string or a structured object.
 *
 * Country must be resolvable — either on the structured input, or via
 * `options.country`. If neither is set we throw an AcurisValidationError
 * client-side rather than send a useless request.
 */
export async function validateAddress(
  client: AcurisClient,
  input: AddressInput,
  options: ValidateOptions = {},
): Promise<ValidationResult> {
  const country = resolveCountry(input, options.country);
  if (!country) {
    throw new AcurisValidationError(
      "Country is required (pass `options.country` or set `country` on the structured input).",
      { endpoint: "/validate" },
    );
  }
  const body: Record<string, unknown> = {
    country,
    input: stripCountry(input),
  };
  return client.request<ValidationResult>({
    method: "POST",
    path: "/validate",
    body,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    signal: options.signal,
  });
}

function resolveCountry(input: AddressInput, fallback?: string): string | undefined {
  if (typeof input === "object" && input && input.country) return input.country.toLowerCase();
  return fallback?.toLowerCase();
}

function stripCountry(input: AddressInput): AddressInput {
  if (typeof input === "string") return input;
  const { country: _ignored, ...rest } = input;
  return rest as FieldedAddressInput;
}
