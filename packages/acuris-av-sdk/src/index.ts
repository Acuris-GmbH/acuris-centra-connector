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
export { postcodeLookup } from "./endpoints/postcodeLookup.js";
export { emailValidate } from "./endpoints/emailValidate.js";
export { emailValidateBatch } from "./endpoints/emailValidateBatch.js";
export { validatePhone } from "./endpoints/validatePhone.js";
export { validatePhoneBatch } from "./endpoints/validatePhoneBatch.js";
export { phoneMatch } from "./endpoints/phoneMatch.js";

export type {
  PhoneValidateOptions,
  PhoneVerdict,
  PhoneValidationResult,
  PhoneValidateBatchResult,
  PhoneMatchType,
  PhoneMatchResult,
  PhoneMatchOptions,
} from "./types.js";

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
  EmailDeliverability,
  EmailValidateBatchOptions,
  EmailValidateBatchResult,
  EmailValidateOptions,
  EmailValidationResult,
  FieldedAddressInput,
  GeocodeOptions,
  GeocodingResult,
  MatchComponents,
  MatchDetails,
  MatchType,
  PostcodeLookupAddress,
  PostcodeLookupOptions,
  PostcodeLookupResult,
  ReverseGeocodeOptions,
  ReverseGeocodingHit,
  ReverseGeocodingResult,
  StandardizedAddress,
  SuggestionHit,
  SuggestOptions,
  ValidateOptions,
  ValidationResult,
} from "./types.js";
