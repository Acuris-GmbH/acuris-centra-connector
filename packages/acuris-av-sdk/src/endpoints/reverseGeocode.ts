import type { AcurisClient } from "../client.js";
import { AcurisValidationError } from "../errors.js";
import type {
  ReverseGeocodeOptions,
  ReverseGeocodingResult,
  ReverseGeocodingHit,
} from "../types.js";

interface RawReverseSingle {
  accuracy_type: string | null;
  match_type: string;
  match_score: number;
  distance_m?: number;
  lat: number;
  lng: number;
  country: string;
  city?: string;
  state?: string;
  zip?: string;
  street?: string;
  hno?: string;
  query?: { lat: number; lng: number; radius_m: number };
}

interface RawReverseMulti {
  matches: RawReverseSingle[];
  query?: { lat: number; lng: number; radius_m: number };
}

/**
 * Reverse geocode lat/lng to the nearest known address within `radius_m`.
 *
 * The live API returns either a single match (default) or an array under
 * `matches` when `limit > 1`. We normalize to `{ hits, query }` in both cases.
 */
export async function reverseGeocode(
  client: AcurisClient,
  coords: { lat: number; lng: number },
  options: ReverseGeocodeOptions,
): Promise<ReverseGeocodingResult> {
  if (!options.country) {
    throw new AcurisValidationError("Country is required for reverse geocoding.", {
      endpoint: "/reverse",
    });
  }
  if (
    !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng) ||
    coords.lat < -90 || coords.lat > 90 ||
    coords.lng < -180 || coords.lng > 180
  ) {
    throw new AcurisValidationError(
      "lat must be in [-90, 90] and lng in [-180, 180].",
      { endpoint: "/reverse" },
    );
  }

  const query: Record<string, string | number> = {
    country: options.country.toLowerCase(),
    lat: coords.lat,
    lng: coords.lng,
    radius_m: options.radius_m ?? 50,
    limit: options.limit ?? 1,
  };

  const raw = await client.request<RawReverseSingle | RawReverseMulti>({
    method: "GET",
    path: "/reverse",
    query,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    signal: options.signal,
  });

  const hits = "matches" in raw && Array.isArray(raw.matches)
    ? raw.matches.map(normalizeHit)
    : [normalizeHit(raw as RawReverseSingle)];

  const queryEcho =
    raw.query ?? { lat: coords.lat, lng: coords.lng, radius_m: query.radius_m as number };

  return { hits, query: queryEcho };
}

function normalizeHit(r: RawReverseSingle): ReverseGeocodingHit {
  return {
    accuracy_type: r.accuracy_type ?? null,
    match_type: r.match_type,
    match_score: r.match_score,
    distance_m: r.distance_m ?? 0,
    lat: r.lat,
    lng: r.lng,
    country: r.country,
    city: r.city,
    state: r.state,
    zip: r.zip,
    street: r.street,
    hno: r.hno,
  };
}
