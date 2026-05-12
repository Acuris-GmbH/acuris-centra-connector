# Architecture

This document explains the shape of the connector: how the two packages
relate, why the API key always lives on the server, and the rationale
behind retry/timeout defaults. It is written for engineers integrating the
connector into a production storefront — not exhaustive reference docs;
those live in the per-package READMEs.

## 30-second summary

```
   Browser                       Your backend                   Acuris
   ─────────                     ─────────                      ─────────

   <AcurisAddressInput>   ──►    /api/acuris/suggest   ──►   GET  /suggest
   <AcurisAddressValidator> ─►   /api/acuris/validate  ──►   POST /validate
                                 (acuris-av-sdk +            (api.acuris-geo.com)
                                  ACURIS_API_KEY)
```

The React components in `@acuris-geo/centra-checkout` never talk to
`api.acuris-geo.com` directly. They talk to **your** backend, which uses
`@acuris-geo/av-sdk` to forward the request — with the API key attached.

## The two packages

### `@acuris-geo/av-sdk` (server / edge)

Tiny TypeScript wrapper over the Acuris REST API.

- **Zero runtime dependencies.** Uses native `fetch`, native `AbortController`,
  native `URL`. Works on Node 18+, Bun, Deno, and modern edge runtimes.
- Exposes four functions: `validateAddress`, `geocodeAddress`,
  `reverseGeocode`, `suggestAddress`. Each accepts an `AcurisClient` and
  the call-specific options.
- Errors are a typed hierarchy (`AcurisAuthError`, `AcurisRateLimitError`,
  …) so callers can branch cleanly.
- Retries are automatic for transient classes (5xx, 429, network, timeout)
  with exponential backoff + jitter, three attempts by default.

### `@acuris-geo/centra-checkout` (client)

React components and headless hooks.

- Peer-depends on `react ^18 || ^19`.
- Depends on `@acuris-geo/av-sdk` only for shared types (no runtime use of
  the SDK in the browser).
- Components: `<AcurisAddressInput>` (debounced typeahead),
  `<AcurisAddressValidator>` (render-prop wrapper around a form).
- Hooks: `useAcurisSuggest`, `useAcurisValidation` — for teams that want
  to roll their own UI.
- SSR-safe. No browser-only globals are touched during render.
- Unstyled by default; the sample app shows a ~80-line CSS layer.

## Why a backend proxy is non-negotiable

An Acuris API key is a paid credential — every call decrements credits. If
we let the browser carry the key:

1. Anyone visiting the storefront can read it from the network tab.
2. Bots will scrape it within hours.
3. The customer's credit pool drains overnight.

The connector therefore enforces the proxy pattern by design:

- **The SDK refuses to instantiate without an API key.** That key has to
  come from `process.env.ACURIS_API_KEY` on the server.
- **The React components require an `endpoints` prop** pointing at your
  own routes. There is no escape hatch to call Acuris directly from the
  browser.

For Centra storefronts on Next.js this means two API routes (validate +
suggest). For other stacks (Remix loaders, Express, Cloudflare Workers)
the shape is identical: receive request → call SDK → forward response.

## Retry and timeout defaults

The SDK ships with conservative defaults that work well for a checkout
flow:

| Setting           | Default | Rationale                                         |
| ----------------- | ------- | ------------------------------------------------- |
| `timeoutMs`       | 5000 ms | Long enough for cold-start cascades, short enough that users don't sit on a spinner. |
| `maxRetries`      | 3       | Acuris occasionally returns 429 during peak hours; three attempts smooths that without amplifying real outages. |
| backoff base      | 200 ms  | First retry lands at ~200 ms.                      |
| backoff cap       | 4000 ms | Worst-case retry pair never delays a user >5 s.   |
| jitter            | ±25 %   | Avoids thundering when many clients see the same 429 simultaneously. |

Only transient statuses (5xx, 429), network errors, and client-side
timeouts are retried. Auth errors (401/403), validation errors (400/422),
and not-found (404) propagate immediately — retrying them won't help.

For an interactive typeahead you might want shorter values:

```ts
new AcurisClient({ timeoutMs: 2500, maxRetries: 1 })
```

For a batch job tolerating slower passes:

```ts
new AcurisClient({ timeoutMs: 15000, maxRetries: 5 })
```

## Field-shape conventions

The SDK preserves Acuris's wire-format field names verbatim
(`accuracy_type`, `match_score`, `standardized.formatted_address`, …)
rather than re-aliasing them. Two reasons:

1. **Diffs map directly.** If you `console.log` an SDK result and compare
   it to a raw curl call from the docs, they line up.
2. **Forward-compatibility.** New fields Acuris adds (e.g.
   `confidence_level`, `house_number_not_found`) appear in the typed
   response without an SDK release.

If you want a vendor-agnostic shape (e.g. for swapping providers), map
once at your application boundary rather than asking the SDK to do it.

## Server-side typeahead — when it is and isn't appropriate

`<AcurisAddressInput>` is debounced and aborts in-flight requests when the
user keeps typing, but it still issues a network call per stable
prefix. Two implications:

- **Cost.** Each suggest call decrements one geocoding credit. A
  high-traffic page will burn through credits quickly. Consider raising
  `minQueryLength` (default 3) or `debounceMs` (default 200) on high-volume
  pages, or putting your own cache in front of `/api/acuris/suggest`.
- **Latency.** A 200 ms debounce + ~80 ms server hop + ~50 ms Acuris
  lookup feels instant on broadband but can bite on mobile. The component
  shows a "Loading…" row while in-flight; you can swap that text via
  `renderSuggestion`.

If you don't want typeahead at all, omit `endpoints.suggest`. The input
becomes a plain controlled text field, and validation runs only on blur
or submit via `<AcurisAddressValidator>`.

## SSR and Next.js

The components are written so that:

- First server render produces a closed-dropdown DOM with stable IDs.
- Client hydration attaches event handlers without re-rendering.
- No `window`, `document`, `localStorage`, or `IntersectionObserver` is
  touched outside an event handler.

Tested against Next.js 14 pages router (the sample) and Next.js 14 app
router. If you hit hydration warnings, the most common cause is an
uncontrolled input where the server and client compute different default
values — make sure `value` and `onChange` are controlled from the parent.

## Versioning

Both packages are versioned in lockstep (`0.1.0`, `0.1.1`, …). They will
remain in lockstep through `1.0.0`; after that they may diverge if one
matures faster than the other.

While in the `0.x` series, minor versions can include breaking changes.
We aim to call them out explicitly in the changelog and ship a codemod
where the migration isn't obvious.
