import type { AcurisClient } from "../client.js";
import { AcurisValidationError } from "../errors.js";
import type { SuggestOptions, SuggestionHit } from "../types.js";

interface RawSuggestResponse {
  suggestions: SuggestionHit[];
}

/**
 * Autocomplete prefix → up to N suggestion hits. Used by
 * `<AcurisAddressInput>` to power its typeahead.
 *
 * Requires an Acuris API key (the `/suggest` endpoint is paid-only for
 * arbitrary callers; widget-token mode is restricted to the marketing site).
 */
export async function suggestAddress(
  client: AcurisClient,
  query: string,
  options: SuggestOptions = {},
): Promise<SuggestionHit[]> {
  if (!options.country) {
    throw new AcurisValidationError("Country is required for suggestions.", {
      endpoint: "/suggest",
    });
  }
  const q = query.trim();
  if (!q) return [];

  const params: Record<string, string | number> = {
    country: options.country.toLowerCase(),
    q,
    limit: clampLimit(options.limit),
  };
  if (options.state) params.state = options.state.toUpperCase();

  const raw = await client.request<RawSuggestResponse>({
    method: "GET",
    path: "/suggest",
    query: params,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    signal: options.signal,
  });
  return Array.isArray(raw?.suggestions) ? raw.suggestions : [];
}

function clampLimit(limit: number | undefined): number {
  if (!limit || limit <= 0) return 10;
  if (limit > 50) return 50;
  return Math.floor(limit);
}
