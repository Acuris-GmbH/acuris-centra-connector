# @acuris-geo/centra-checkout

> React components for integrating Acuris Address Validation & Geocoding into
> Centra-based storefronts. SSR-safe, unstyled by default, no design-system
> assumptions.

**Status:** beta (`0.1.0`).

## Install

```bash
npm install @acuris-geo/centra-checkout
```

`react` and `react-dom` are peer dependencies (`^18` or `^19`).

## Security model

**Do not put an Acuris API key in the browser.** This package never calls
`api.acuris-geo.com` directly. Instead, it calls _your_ proxy endpoints on
the same origin (or any origin with permissive CORS), which then forward to
Acuris using the server-side `@acuris-geo/av-sdk` with the API key attached.

```
Browser ──► /api/acuris/validate ──► acuris-av-sdk ──► api.acuris-geo.com
            (your backend)           (your backend)
```

A working pair of Next.js API routes lives in `examples/centra-storefront/`.

## Components

### `<AcurisAddressInput>`

Controlled input with debounced typeahead suggestions.

```tsx
import { AcurisAddressInput } from "@acuris-geo/centra-checkout";
import { useState } from "react";

const [value, setValue] = useState("");

<AcurisAddressInput
  endpoints={{ validate: "/api/acuris/validate", suggest: "/api/acuris/suggest" }}
  country="deu"
  value={value}
  onChange={setValue}
  onSelect={(hit) => {
    // hit.lat, hit.lng, hit.street, hit.city, ...
  }}
  placeholder="Start typing an address…"
/>
```

**Props of note**

| Prop                  | Default | Notes                                          |
| --------------------- | ------- | ---------------------------------------------- |
| `endpoints.suggest`   | _none_  | Omit to disable typeahead (input still works). |
| `debounceMs`          | `200`   | Per-keystroke debounce.                        |
| `minQueryLength`      | `3`     | No request fires below this length.            |
| `limit`               | `5`     | Server caps at 50.                             |
| `renderSuggestion`    | _none_  | Render-prop for custom suggestion rows.        |
| `suggestionsClassName`| _none_  | CSS class for the `<ul>` container.            |

Keyboard: ↑/↓ to highlight, Enter to pick, Esc to close. Mouse: click to
pick.

### `<AcurisAddressValidator>`

Render-prop wrapper that validates an address on blur, submit, or manually.

```tsx
<AcurisAddressValidator
  endpoints={{ validate: "/api/acuris/validate" }}
  country="deu"
  address={{ street: "Friedrichstraße", house_number: "43", city: "Berlin", postcode: "10117" }}
  trigger="submit"
>
  {({ status, result, error, formProps }) => (
    <form {...formProps}>
      {/* your fields */}
      {status === "ok" && <p>✓ {result?.standardized?.formatted_address}</p>}
      {status === "error" && <p>Error: {error?.message}</p>}
      <button type="submit">Continue</button>
    </form>
  )}
</AcurisAddressValidator>
```

## Hooks

If you'd rather build your own UI:

```ts
import { useAcurisValidation, useAcurisSuggest } from "@acuris-geo/centra-checkout";

const { status, result, error, validate, reset } = useAcurisValidation({
  endpoints: { validate: "/api/acuris/validate" },
  country: "deu",
});

const { suggestions, isLoading } = useAcurisSuggest({
  endpoint: "/api/acuris/suggest",
  country: "deu",
  q: typedText,
  debounceMs: 200,
});
```

Both hooks abort inflight requests automatically so the latest user input
always wins (no stale-response races).

## SSR

All components are pure and rely only on `useState`/`useEffect`. They render
to a closed (`aria-expanded="false"`) state on the server, then hydrate and
become interactive client-side. Tested against Next.js 14 app router.

## License

MIT © Acuris GmbH
