import type {
  AddressInput,
  CountryCode,
  FieldedAddressInput,
  SuggestionHit,
  ValidationResult,
} from "@acuris-geo/av-sdk";

export type { AddressInput, CountryCode, FieldedAddressInput, SuggestionHit, ValidationResult };

/**
 * Endpoints on the customer's own backend that proxy to Acuris. We never call
 * api.acuris-geo.com directly from the browser — the API key must stay on the
 * server. See the centra-storefront sample for a working pair of Next.js
 * API routes.
 *
 *   validate: POST  body { country, input }  → ValidationResult
 *   suggest:  GET   ?country=&q=&limit=      → { suggestions: SuggestionHit[] }
 *
 * For static deployments you can supply absolute URLs (different origin), but
 * make sure CORS is configured on the proxy.
 */
export interface AcurisEndpoints {
  /** Validate endpoint, e.g. `/api/acuris/validate`. */
  validate: string;
  /** Suggest endpoint, e.g. `/api/acuris/suggest`. Optional; typeahead is disabled when omitted. */
  suggest?: string;
}

export interface AcurisAddressInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "onSelect"> {
  /** Endpoints on _your_ backend. Never embed an Acuris API key in the browser. */
  endpoints: AcurisEndpoints;
  /** ISO-3 country code (e.g. `"deu"`). Suggestions are biased by country. */
  country: CountryCode;
  /** Current text in the input. */
  value: string;
  /** Called whenever the user types or picks a suggestion. */
  onChange: (value: string) => void;
  /** Called when the user picks a suggestion (lat/lng + parsed fields). */
  onSelect?: (hit: SuggestionHit) => void;
  /** Debounce window before firing a suggest request, in ms. Default 200. */
  debounceMs?: number;
  /** Minimum query length before suggesting. Default 3. */
  minQueryLength?: number;
  /** Limit on suggestions returned. Default 5. */
  limit?: number;
  /** Optional state/region bias (`"NY"`, `"BY"`). */
  state?: string;
  /** Render a custom suggestion row. */
  renderSuggestion?: (hit: SuggestionHit, index: number) => React.ReactNode;
  /** ARIA-style className passthrough for the suggestions container. */
  suggestionsClassName?: string;
}

export interface AcurisAddressValidatorProps {
  endpoints: AcurisEndpoints;
  country: CountryCode;
  /** The address to validate. Validation fires on `trigger` (default: blur of the wrapped form). */
  address: FieldedAddressInput | string;
  /** When to run validation. `"manual"` exposes `validate()` via children render prop. */
  trigger?: "blur" | "submit" | "manual";
  /** Children. Receives helpers and current state. */
  children: (state: ValidatorRenderState) => React.ReactNode;
}

export interface ValidatorRenderState {
  status: "idle" | "loading" | "ok" | "error";
  result?: ValidationResult;
  error?: Error;
  /** Trigger a validation pass programmatically. */
  validate: () => Promise<ValidationResult | undefined>;
  /** Convenience binding for forms: `<form {...formProps}>` */
  formProps: {
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLFormElement>) => void;
  };
}
