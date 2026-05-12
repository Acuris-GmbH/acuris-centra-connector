/**
 * @acuris-geo/centra-checkout — React components for Centra customers
 * integrating Acuris Address Validation & Geocoding.
 *
 *   import { AcurisAddressInput, AcurisAddressValidator } from "@acuris-geo/centra-checkout";
 *
 * Components NEVER call api.acuris-geo.com directly. They call YOUR proxy
 * endpoints (see `AcurisEndpoints`), which forward to Acuris with the API
 * key attached server-side.
 */
export { AcurisAddressInput, hitToDisplay } from "./AcurisAddressInput.js";
export { AcurisAddressValidator } from "./AcurisAddressValidator.js";
export { useAcurisValidation } from "./useAcurisValidation.js";
export { useAcurisSuggest } from "./useAcurisSuggest.js";
export { postValidateViaProxy, getSuggestViaProxy } from "./transport.js";

export type {
  AcurisAddressInputProps,
  AcurisAddressValidatorProps,
  AcurisEndpoints,
  ValidatorRenderState,
  AddressInput,
  CountryCode,
  FieldedAddressInput,
  SuggestionHit,
  ValidationResult,
} from "./types.js";

export type {
  UseAcurisValidationArgs,
  UseAcurisValidationReturn,
  ValidationStatus,
} from "./useAcurisValidation.js";

export type {
  UseAcurisSuggestArgs,
  UseAcurisSuggestReturn,
} from "./useAcurisSuggest.js";
