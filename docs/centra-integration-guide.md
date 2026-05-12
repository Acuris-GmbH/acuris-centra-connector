# Centra integration guide

> Wiring the Acuris Centra Connector into a Centra-based storefront.
> Written for the engineer doing the integration — assumes you're
> comfortable with Next.js and have at least one Centra GraphQL call
> working in your codebase already.

## What you'll have at the end

- Address typeahead on your checkout's address fields, powered by Acuris.
- A "validate on submit" step that catches bad addresses **before** the
  Centra order is created (cheaper to fix at this stage than after the
  Centra order is in DTC fulfilment).
- Zero Acuris credentials in your browser bundle.

This guide does **not** cover replacing Centra's address fields with the
Acuris components — that's a design call for your team. We focus on the
integration mechanics.

## Prerequisites

- Centra storefront on Next.js (any version 13+).
- An Acuris API key. Get one at
  [acuris-geo.com/acuris-pricing](https://acuris-geo.com/acuris-pricing/);
  the trial includes 5,000 calls.
- Node 18.17+.

## Install

```bash
npm install @acuris-geo/av-sdk @acuris-geo/centra-checkout
```

Add the API key to your server-side env. In Vercel, set `ACURIS_API_KEY`
in the project Environment Variables panel (mark it as "server-only").
For self-hosted, drop it into `.env.local`.

```
# .env.local
ACURIS_API_KEY=sk-...your-key...
```

## Step 1 — Add the proxy API routes

The connector's React components call your backend, not Acuris directly.
Drop two files into `pages/api/acuris/`:

### `pages/api/acuris/validate.ts`

```ts
import type { NextApiRequest, NextApiResponse } from "next";
import { AcurisClient, validateAddress, AcurisError } from "@acuris-geo/av-sdk";

let client: AcurisClient | null = null;
function getClient() {
  if (!client) client = new AcurisClient({ apiKey: process.env.ACURIS_API_KEY });
  return client;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const { country, input } = req.body ?? {};
  if (!country || !input) return res.status(400).json({ error: "bad_request" });
  try {
    res.status(200).json(await validateAddress(getClient(), input, { country }));
  } catch (err) {
    if (err instanceof AcurisError) return res.status(err.status ?? 502).json({ error: err.message });
    res.status(500).json({ error: String(err) });
  }
}
```

### `pages/api/acuris/suggest.ts`

```ts
import type { NextApiRequest, NextApiResponse } from "next";
import { AcurisClient, suggestAddress, AcurisError } from "@acuris-geo/av-sdk";

let client: AcurisClient | null = null;
function getClient() {
  if (!client) client = new AcurisClient({ apiKey: process.env.ACURIS_API_KEY });
  return client;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const country = String(req.query.country ?? "");
  const q = String(req.query.q ?? "");
  if (!country) return res.status(400).json({ error: "bad_request" });
  try {
    res.status(200).json({
      suggestions: await suggestAddress(getClient(), q, { country, limit: 5 }),
    });
  } catch (err) {
    if (err instanceof AcurisError) return res.status(err.status ?? 502).json({ error: err.message });
    res.status(500).json({ error: String(err) });
  }
}
```

If you're on the **App Router**, the equivalent route handlers go in
`app/api/acuris/validate/route.ts` and `app/api/acuris/suggest/route.ts`
with the same logic — `export async function POST(req: Request)` etc.

## Step 2 — Wire the components into your checkout

Identify the address step in your existing Centra checkout flow. The
typical Centra storefront has something like this:

```tsx
<AddressForm
  onSubmit={(addr) => centraClient.setAddress(addr)}
/>
```

Replace the address input with `<AcurisAddressInput>` and wrap the form
in `<AcurisAddressValidator>`:

```tsx
import { useState } from "react";
import {
  AcurisAddressInput,
  AcurisAddressValidator,
  type SuggestionHit,
} from "@acuris-geo/centra-checkout";

const ENDPOINTS = { validate: "/api/acuris/validate", suggest: "/api/acuris/suggest" };

function CheckoutAddressStep({ country, onAddressVerified }: Props) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<SuggestionHit | null>(null);

  const address = picked ?? search;

  return (
    <AcurisAddressValidator
      endpoints={ENDPOINTS}
      country={country}
      address={pickedToFielded(picked) ?? search}
      trigger="submit"
    >
      {({ status, result, error, formProps }) => (
        <form
          {...formProps}
          onSubmit={(e) => {
            formProps.onSubmit(e);
            // Validator runs first; if it succeeded, continue to Centra.
            if (status === "ok" && result?.accuracy_type) {
              onAddressVerified(result);
            }
          }}
        >
          <AcurisAddressInput
            endpoints={ENDPOINTS}
            country={country}
            value={search}
            onChange={(v) => { setSearch(v); setPicked(null); }}
            onSelect={setPicked}
            placeholder="Start typing your address…"
          />
          <button type="submit">Continue to shipping</button>
          {status === "error" && <p role="alert">Couldn't verify: {error?.message}</p>}
        </form>
      )}
    </AcurisAddressValidator>
  );
}

function pickedToFielded(s: SuggestionHit | null) {
  if (!s) return null;
  return {
    street: s.street,
    house_number: s.house_number,
    city: s.city,
    state: s.state,
    postcode: s.postcode,
  };
}
```

## Step 3 — Hand the verified address to Centra

Once `<AcurisAddressValidator>` reports `status: "ok"`, you have:

- `result.standardized.formatted_address` — canonical address string.
- `result.standardized.{street, house_number, city, state, postcode}` —
  fielded.
- `result.lat`, `result.lng` — useful for shipping cost estimation and
  delivery slot availability.
- `result.accuracy_type` — e.g. `"rooftop"`, `"street_interpolated"`. Use
  this to decide whether to require user confirmation.

Map those into Centra's GraphQL `Address` shape:

```ts
const centraAddress = {
  address1: [r.standardized.house_number, r.standardized.street].filter(Boolean).join(" "),
  city: r.standardized.city,
  state: r.standardized.state,
  zipCode: r.standardized.postcode,
  country: r.standardized.country?.toUpperCase(), // Centra expects ISO-3
};
```

Then call your existing `selection.setShippingAddress` or equivalent
Centra mutation.

## Step 4 — Decide what to do with imperfect matches

`accuracy_type` gives you a coarse precision bucket. A reasonable policy:

| accuracy_type            | Action                                           |
| ------------------------ | ------------------------------------------------ |
| `rooftop`, `parcel`      | Auto-accept, proceed to next step.               |
| `street_interpolated`    | Auto-accept but log for ops dashboard.           |
| `street_center`, `postcode` | Show a "Looks like X — is this right?" inline confirmation. |
| `locality`, `centroid`   | Reject; show the user a list of suggestions to refine. |
| `null` (no match)        | Reject; surface Acuris's `corrections[]` array. |

This is a starting point — tune to your shipping carrier's quality bar.
Some carriers happily ship on `postcode`-only matches in postal-grid
countries (NLD, GBR); others want rooftop.

## Step 5 — Test

Manual smoke test before going live:

1. **A real address.** Type a known-good address from your customer DB.
   Expect `accuracy_type: "rooftop"`, confidence ≈ 1.0.
2. **A typo.** Swap two characters in the street name. Expect
   `input_corrected: true` and the corrected form in
   `standardized.formatted_address`.
3. **A made-up address.** Type "Nonsuch Street 999, Nowhereville".
   Expect `accuracy_type` lower than `street_center` or no match at all.
4. **Rate-limit handling.** Drop `maxRetries: 0` temporarily and hammer
   the typeahead. Confirm your UI gracefully shows the 429.
5. **A non-Latin script country.** If you ship to e.g. Japan or Saudi
   Arabia, send a kanji / Arabic address. Acuris returns side-by-side
   Latin + native fields — make sure your UI doesn't drop the native form.

## Common pitfalls

**API key is empty in production.** Vercel doesn't inherit `.env.local`;
make sure `ACURIS_API_KEY` is set in the project Environment Variables
and the deployment was rebuilt after the change.

**Stale typeahead suggestions.** If you see suggestions from a previous
country after switching `country={...}`, reset the input value and
`picked` state in your `onChange` handler for the country dropdown. The
sample's `checkout.tsx` shows this pattern.

**Centra expects ISO-2 country codes.** Acuris uses ISO-3 (`"deu"`,
`"usa"`). Map at your boundary; don't try to mix them.

**Hydration mismatch on first paint.** Make sure the `endpoints` object
isn't recreated each render — either define it as a module constant or
memoise it. Otherwise Next.js may warn about prop instability on the
initial hydration.

## Going further

- **Batch validation.** If you re-validate the full customer DB nightly,
  use the SDK directly from a worker rather than going through React.
  The SDK is the same package — just call `validateAddress(client, ...)`
  in a loop with `Promise.allSettled` and your own concurrency cap.
- **Geocoding-only.** Replace `validateAddress` with `geocodeAddress` for
  the same input shape and a leaner response.
- **Reverse geocoding.** For map-pin checkouts (uncommon in fashion but
  common in QSR / delivery), `reverseGeocode(client, {lat, lng}, {country})`
  returns the nearest known address.

For anything unclear, file an issue at
[github.com/Acuris-GmbH/acuris-centra-connector/issues](https://github.com/Acuris-GmbH/acuris-centra-connector/issues)
or email `support@acuris-geo.com`.
