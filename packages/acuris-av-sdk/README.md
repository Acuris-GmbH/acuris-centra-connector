# @acuris-geo/av-sdk

> TypeScript SDK for the Acuris Address Validation & Geocoding API. Wraps
> `api.acuris-geo.com` with typed inputs, structured errors, retries, and
> timeouts. Zero runtime dependencies; works on Node 18+, modern browsers
> (in a server-only role — see "Security" below), and edge runtimes that
> expose `fetch`.

**Status:** beta (`0.1.0`). API surface may evolve before `1.0.0`.

## Install

```bash
npm install @acuris-geo/av-sdk
```

You also need an Acuris API key — get one at
[acuris-geo.com/acuris-pricing](https://acuris-geo.com/acuris-pricing/). The
SDK reads `process.env.ACURIS_API_KEY` if no `apiKey` is passed.

## Quick start

```ts
import { AcurisClient, validateAddress } from "@acuris-geo/av-sdk";

const client = new AcurisClient({ apiKey: process.env.ACURIS_API_KEY });

const result = await validateAddress(client, {
  country: "deu",
  street: "Friedrichstraße",
  house_number: "43",
  city: "Berlin",
  postcode: "10117",
});

console.log(result.accuracy_type);       // e.g. "rooftop"
console.log(result.confidence);          // 0..1
console.log(result.standardized?.formatted_address);
```

## API

### `new AcurisClient(options?)`

| Option       | Default                      | Notes                                            |
| ------------ | ---------------------------- | ------------------------------------------------ |
| `apiKey`     | `process.env.ACURIS_API_KEY` | Required.                                        |
| `baseUrl`    | `https://api.acuris-geo.com` | Override for self-hosted / on-prem deployments.  |
| `timeoutMs`  | `5000`                       | Per-request timeout.                             |
| `maxRetries` | `3`                          | Only applied to 5xx, 429, network and timeout.   |
| `fetch`      | `globalThis.fetch`           | Inject a different fetch impl for testing.       |
| `userAgent`  | _none_                       | Appended after `acuris-av-sdk/<version>`.        |

### `validateAddress(client, input, options?)`

Validates a structured or single-line address. Returns a `ValidationResult`
with `accuracy_type`, `confidence`, `match_components`, and a `standardized`
canonical form.

```ts
const v = await validateAddress(client, "100 Main St, San Francisco CA 94105", {
  country: "usa",
});
```

### `geocodeAddress(client, input, options?)`

Forward-geocode to lat/lng. Same input shape as `validateAddress`. Returns a
`GeocodingResult` with `lat`, `lng`, and the matched canonical components.

### `reverseGeocode(client, { lat, lng }, options)`

Nearest known address within `radius_m` (default `50`, max `5000`). Returns
`{ hits: [...], query }`. Pass `limit > 1` for multiple results.

```ts
const r = await reverseGeocode(client, { lat: 37.7749, lng: -122.4194 }, {
  country: "usa",
  radius_m: 100,
  limit: 3,
});
```

### `suggestAddress(client, q, options)`

Autocomplete prefix → list of suggestions (`SuggestionHit[]`). Powers the
`<AcurisAddressInput>` typeahead in `@acuris-geo/centra-checkout`.

```ts
const hits = await suggestAddress(client, "Friedrichstr", {
  country: "deu",
  limit: 5,
});
```

## Errors

All errors extend `AcurisError`:

```ts
import {
  AcurisAuthError,        // 401, 403
  AcurisValidationError,  // 400, 422
  AcurisNotFoundError,    // 404
  AcurisRateLimitError,   // 429 (carries `retryAfterSeconds` if provided)
  AcurisServerError,      // 5xx
  AcurisTimeoutError,     // client-side timeout
  AcurisNetworkError,     // fetch failed
} from "@acuris-geo/av-sdk";

try {
  await validateAddress(client, addr, { country: "deu" });
} catch (err) {
  if (err instanceof AcurisRateLimitError) {
    // back off
  }
}
```

Transient errors (5xx, 429, network, timeout) retry automatically with
exponential backoff (3 attempts by default). Other errors propagate
immediately.

## Security

**Do not call this SDK from the browser with a real Acuris API key.** Keys
must live server-side. The companion package `@acuris-geo/centra-checkout`
ships React components that call _your_ backend endpoint, which then calls
this SDK. See `docs/architecture.md` in the repo for the recommended pattern.

## License

MIT © Acuris GmbH
