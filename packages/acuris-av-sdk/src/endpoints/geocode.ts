import type { AcurisClient } from "../client.js";
import { AcurisValidationError } from "../errors.js";
import type {
  AddressInput,
  GeocodeOptions,
  GeocodingResult,
} from "../types.js";

/**
 * Forward geocode an address to lat/lng. The live API exposes this as
 * `GET /geocode` with query params, which is what we wire under the hood.
 *
 * Accepts a structured input or a single-line string (the latter goes through
 * `/validate` internally, since `/geocode` is fielded-only).
 */
export async function geocodeAddress(
  client: AcurisClient,
  input: AddressInput,
  options: GeocodeOptions = {},
): Promise<GeocodingResult> {
  const country = resolveCountry(input, options.country);
  if (!country) {
    throw new AcurisValidationError(
      "Country is required (pass `options.country` or set `country` on the structured input).",
      { endpoint: "/geocode" },
    );
  }

  // For string input we fall back to /validate which accepts free-form text
  // and returns a compatible shape. Callers who want strict /geocode semantics
  // should pass a structured object.
  if (typeof input === "string") {
    const { validateAddress } = await import("./validate.js");
    const v = await validateAddress(client, input, options);
    return mapValidationToGeocoding(v);
  }

  const query: Record<string, string | undefined> = {
    country,
    street: input.street,
    hno: input.house_number,
    city: input.city,
    town: input.locality,
    state: input.state,
    postalcode: input.postcode,
  };
  return client.request<GeocodingResult>({
    method: "GET",
    path: "/geocode",
    query,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    signal: options.signal,
  });
}

function resolveCountry(input: AddressInput, fallback?: string): string | undefined {
  if (typeof input === "object" && input && input.country) return input.country.toLowerCase();
  return fallback?.toLowerCase();
}

function mapValidationToGeocoding(v: import("../types.js").ValidationResult): GeocodingResult {
  return {
    accuracy_type: v.accuracy_type,
    match_type: v.match_type,
    match_score: v.match_score,
    match_components: v.match_components,
    input_corrected: v.input_corrected,
    lat: v.lat,
    lng: v.lng,
    country: v.standardized?.country,
    city: v.standardized?.city,
    state: v.standardized?.state,
    postcode: v.standardized?.postcode,
    street: v.standardized?.street,
    hno: v.standardized?.house_number,
    formatted_address: v.standardized?.formatted_address,
    house_number_not_found: v.house_number_not_found,
  };
}
