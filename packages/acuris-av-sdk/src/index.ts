/**
 * @acuris-geo/av-sdk — TypeScript client for the Acuris Address Validation
 * & Geocoding API (api.acuris-geo.com).
 *
 *   import { AcurisClient, validateAddress } from "@acuris-geo/av-sdk";
 *
 *   const client = new AcurisClient({ apiKey: process.env.ACURIS_API_KEY });
 *   const result = await validateAddress(client, {
 *     country: "deu",
 *     street: "Friedrichstraße",
 *     house_number: "43",
 *     city: "Berlin",
 *     postcode: "10117",
 *   });
 */
export { AcurisClient } from "./client.js";
export type { RequestOptions } from "./client.js";

export { validateAddress } from "./endpoints/validate.js";
export { geocodeAddress } from "./endpoints/geocode.js";
export { reverseGeocode } from "./endpoints/reverseGeocode.js";
export { suggestAddress } from "./endpoints/suggest.js";

export {
  AcurisError,
  AcurisAuthError,
  AcurisValidationError,
  AcurisNotFoundError,
  AcurisRateLimitError,
  AcurisServerError,
  AcurisTimeoutError,
  AcurisNetworkError,
  isTransientStatus,
} from "./errors.js";

export { backoffDelayMs } from "./retry.js";
export type { RetryPolicy } from "./retry.js";

export { SDK_VERSION } from "./version.js";

export type {
  AccuracyType,
  AddressInput,
  ClientOptions,
  CountryCode,
  FieldedAddressInput,
  GeocodeOptions,
  GeocodingResult,
  MatchComponents,
  MatchDetails,
  MatchType,
  ReverseGeocodeOptions,
  ReverseGeocodingHit,
  ReverseGeocodingResult,
  StandardizedAddress,
  SuggestionHit,
  SuggestOptions,
  ValidateOptions,
  ValidationResult,
} from "./types.js";
