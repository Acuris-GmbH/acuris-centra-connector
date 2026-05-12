import { useCallback, useMemo } from "react";
import { useAcurisValidation } from "./useAcurisValidation.js";
import type { AcurisAddressValidatorProps, ValidatorRenderState } from "./types.js";

/**
 * Wraps any address form (or arbitrary children) and validates the supplied
 * `address` on blur, submit, or manually. Uses the render-prop pattern so we
 * don't impose markup on the host app.
 *
 *   <AcurisAddressValidator endpoints={...} country="deu" address={addr}>
 *     {({ status, result, formProps }) => (
 *       <form {...formProps}>
 *         {status === "ok" && <p>Match: {result?.standardized?.formatted_address}</p>}
 *         ...
 *       </form>
 *     )}
 *   </AcurisAddressValidator>
 */
export function AcurisAddressValidator(props: AcurisAddressValidatorProps): React.ReactNode {
  const { endpoints, country, address, trigger = "blur", children } = props;
  const v = useAcurisValidation({ endpoints, country });

  const doValidate = useCallback(() => v.validate(address), [v, address]);

  const formProps = useMemo(
    () => ({
      onBlur: () => {
        if (trigger === "blur") void doValidate();
      },
      onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
        if (trigger === "submit") {
          e.preventDefault();
          void doValidate();
        }
      },
    }),
    [doValidate, trigger],
  );

  const state: ValidatorRenderState = {
    status: v.status,
    result: v.result,
    error: v.error,
    validate: doValidate,
    formProps,
  };

  return children(state);
}
