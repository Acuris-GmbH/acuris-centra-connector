/**
 * Public types for the Acuris AV SDK.
 *
 * Field names mirror the live API at https://api.acuris-geo.com — we
 * deliberately do not rename them. If you need a stable, vendor-agnostic
 * shape downstream, map them once at your application boundary.
 */

/** ISO-3 country code, lowercase (e.g. "usa", "deu", "gbr"). */
export type CountryCode = string;

/** Either a single-line address string or a structured object. */
export type AddressInput = string | FieldedAddressInput;

export interface FieldedAddressInput {
  /** Street name without the house number. */
  street?: string;
  /** House number, separate from street where possible. */
  house_number?: string;
  /** City / town / locality. */
  city?: string;
  /** Sub-locality / district where the country splits city further. */
  locality?: string;
  /** ISO state, province, region, or admin-1 unit. */
  state?: string;
  /** Postal / ZIP code. */
  postcode?: string;
  /** Optional ISO-3 country code; takes precedence over the top-level `country` if both present. */
  country?: CountryCode;
}

/**
 * Coarse classification of how close the match is to the user's intent.
 *
 * The set is open — Acuris adds new tiers over time (e.g. `street_interpolated`,
 * `street_center`, `locality_centroid`). Treat unrecognized values as opaque
 * rather than throwing.
 */
export type AccuracyType =
  | "rooftop"
  | "parcel"
  | "street_interpolated"
  | "street_center"
  | "postcode"
  | "postcode_center"
  | "locality"
  | "locality_centroid"
  | "centroid"
  | "country"
  | (string & {});

export type MatchType =
  | "exact"
  | "interpolated"
  | "partial"
  | "no_match"
  | "rooftop"
  | (string & {});

export interface MatchComponents {
  city?: boolean;
  house_number?: boolean;
  state?: boolean;
  street?: boolean;
  zip?: boolean;
}

export interface MatchDetails extends MatchComponents {
  postcode?: boolean;
  postcode_corrected?: boolean;
}

export interface StandardizedAddress {
  country: CountryCode;
  city?: string;
  state?: string;
  postcode?: string;
  street?: string;
  house_number?: string;
  /** Multi-line, locale-appropriate formatted address. */
  formatted_address?: string;
}

export interface ValidationResult {
  /** Coarse precision bucket. See AccuracyType. */
  accuracy_type: AccuracyType | null;
  /** Numeric 0..1; higher is more confident. */
  confidence: number;
  /** Legacy letter grade (A/B/C/D) — kept for callers that already key on it. */
  confidence_level?: string;
  match_type: MatchType;
  match_score: number;
  match_components: MatchComponents;
  match_details?: MatchDetails;
  /** True when Acuris altered the input to produce a match. */
  input_corrected: boolean;
  /** Best-known canonical form of the address. */
  standardized?: StandardizedAddress;
  /** Echo of how Acuris parsed the raw input. */
  parsed?: StandardizedAddress;
  /** List of human-readable corrections, if any. */
  corrections?: string[];
  /** Forward-geocoded lat/lng when available. */
  lat?: number;
  lng?: number;
  /** When true, address-level coords were not found and a coarser tier was used. */
  house_number_not_found?: boolean;
  /** Acuris cascade version that produced this result. */
  status?: "V1" | "V2" | (string & {});
}

export interface GeocodingResult {
  accuracy_type: AccuracyType | null;
  match_type: MatchType;
  match_score: number;
  match_components: MatchComponents;
  input_corrected: boolean;
  lat?: number;
  lng?: number;
  country?: CountryCode;
  city?: string;
  state?: string;
  postcode?: string;
  street?: string;
  hno?: string;
  formatted_address?: string;
  house_number_not_found?: boolean;
}

export interface ReverseGeocodingHit {
  accuracy_type: AccuracyType | null;
  match_type: MatchType;
  match_score: number;
  /** Metres from the query point to the matched address. */
  distance_m: number;
  lat: number;
  lng: number;
  country: CountryCode;
  city?: string;
  state?: string;
  zip?: string;
  street?: string;
  hno?: string;
}

export interface ReverseGeocodingResult {
  hits: ReverseGeocodingHit[];
  /** Echo of the query for callers that fan out. */
  query: { lat: number; lng: number; radius_m: number };
}

export interface SuggestionHit {
  country: CountryCode;
  city?: string;
  state?: string;
  postcode?: string;
  street?: string;
  house_number?: string;
  lat?: number;
  lng?: number;
  formatted_address?: string;
}

export interface ValidateOptions {
  /** ISO-3 country code; required if not present on the fielded input. */
  country?: CountryCode;
  /** Override per-call request timeout, in ms. */
  timeoutMs?: number;
  /** Override per-call retry count. */
  maxRetries?: number;
  /** AbortSignal to cancel the call early. */
  signal?: AbortSignal;
}

export interface GeocodeOptions extends ValidateOptions {}
export interface SuggestOptions extends ValidateOptions {
  /** ISO state to bias against (USA/CAN/AUS/...). */
  state?: string;
  /** Max suggestions to return; server caps at 50. Default 10. */
  limit?: number;
}

export interface ReverseGeocodeOptions {
  country: CountryCode;
  /** Search radius in metres. Default 50, max 5000. */
  radius_m?: number;
  /** Max results to return. Default 1. */
  limit?: number;
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}

export interface ClientOptions {
  /** Acuris API key. Falls back to `process.env.ACURIS_API_KEY` if omitted. */
  apiKey?: string;
  /** Base URL. Defaults to `https://api.acuris-geo.com`. */
  baseUrl?: string;
  /** Default request timeout in ms. Defaults to 5000. */
  timeoutMs?: number;
  /** Max retries for transient failures (5xx / 429). Defaults to 3. */
  maxRetries?: number;
  /** Override `fetch` (for tests or non-Node runtimes without globalThis.fetch). */
  fetch?: typeof globalThis.fetch;
  /** User-Agent suffix appended after `acuris-av-sdk/<version>`. */
  userAgent?: string;
}

/* --- /postcode-lookup (UK PAF-backed) ----------------------------------- */

export interface PostcodeLookupOptions {
  /** ISO-3166 country (currently UK-only — pass "gbr"). */
  country?: string;
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}

export interface PostcodeLookupAddress {
  street: string;
  house_number: string;
  building_name?: string;
  organisation_name?: string;
  dependent_street?: string;
  city: string;
  postcode: string;
  county?: string;
  udprn?: string;
  uprn?: string;
  lat?: number;
  lng?: number;
  accuracy_type?: "rooftop" | "postcode";
}

export interface PostcodeLookupResult {
  postcode: string;
  country: string;
  count: number;
  addresses: PostcodeLookupAddress[];
  validation_credits_remaining?: number;
  geocode_credits_remaining?: number;
}

/* --- /email-validate (+ batch) ----------------------------------------- */

export type EmailDeliverability =
  | "deliverable"
  | "risky"
  | "undeliverable"
  | "unknown";

export interface EmailValidateOptions {
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}

export interface EmailValidationResult {
  email: string;
  deliverable: EmailDeliverability;
  format_valid: boolean;
  domain_has_mx: boolean | null;
  is_disposable: boolean;
  is_role: boolean;
  is_free: boolean;
  did_you_mean: string | null;
  mx_record: string | null;
  reasons: string[];
  email_credits_remaining?: number;
  validation_credits_remaining?: number;
  geocode_credits_remaining?: number;
}

export interface EmailValidateBatchOptions extends EmailValidateOptions {}

export interface EmailValidateBatchResult {
  count: number;
  results: EmailValidationResult[];
  email_credits_remaining?: number;
  email_quota_limit?: number;
  email_quota_used?: number;
  email_quota_remaining?: number;
}


// ---------- Phone validation (offline Tier 1) ----------

export interface PhoneValidateOptions {
  /** Default region (ISO-3166 alpha-2, e.g. "US") for numbers without a "+". */
  country?: string;
  /** 2-letter language for carrier/location text ("de" -> "Deutschland"). */
  lang?: string;
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}

export type PhoneVerdict = "valid" | "possible" | "invalid" | "unknown";

export interface PhoneValidationResult {
  phone: string;
  valid: boolean;
  verdict: PhoneVerdict;
  score: number;
  is_possible: boolean;
  e164: string | null;
  international: string | null;
  national: string | null;
  tel_uri: string | null;
  country_code: number | null;
  region: string | null;
  line_type: string | null;
  can_receive_sms: boolean;
  carrier: string | null;
  location: string | null;
  timezones: string[];
  is_premium_rate: boolean;
  is_toll_free: boolean;
  is_short_number: boolean;
  is_emergency: boolean;
  reasons: string[];
  phone_credits_remaining?: number;
  validation_credits_remaining?: number;
  geocode_credits_remaining?: number;
}

export interface PhoneValidateBatchResult {
  count: number;
  results: PhoneValidationResult[];
  phone_credits_remaining?: number;
  phone_quota_limit?: number;
  phone_quota_used?: number;
  phone_quota_remaining?: number;
}

export type PhoneMatchType =
  | "exact_match"
  | "nsn_match"
  | "short_nsn_match"
  | "no_match"
  | "not_a_number";

export interface PhoneMatchResult {
  a: string;
  b: string;
  match: PhoneMatchType;
  same_number: boolean;
  phone_credits_remaining?: number;
}

export interface PhoneMatchOptions {
  country?: string;
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}
