# acuris-centra-connector

> Drop-in address validation + geocoding for [Centra](https://centra.com)
> storefronts, powered by [Acuris](https://acuris-geo.com). A TypeScript SDK
> plus React components, designed so the typical Centra customer can go
> from "I need address validation" to "shipping it in checkout" in **about
> ten minutes of copy-paste**.

[![CI](https://github.com/Acuris-GmbH/acuris-centra-connector/actions/workflows/ci.yml/badge.svg)](https://github.com/Acuris-GmbH/acuris-centra-connector/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Status:** beta (`0.1.0`). API surface may evolve before `1.0.0`.

---

## What this is

Centra is a Swedish headless commerce platform used by Paul Smith, Nudie
Jeans, Holzweiler, NN07, Eton, Björn Borg, Craft, and others. Centra
customers run modern Next.js / React storefronts and reach for specialised
APIs (payments, shipping, search, address validation) one integration at a
time.

This repo is Acuris's contribution to that stack. It is:

- **One npm SDK** — `@acuris-geo/av-sdk` — that wraps the Acuris REST API
  with TypeScript types, structured errors, retries, and timeouts.
- **One React component library** — `@acuris-geo/centra-checkout` — with
  `<AcurisAddressInput>` (typeahead), `<AcurisAddressValidator>` (full
  validation pass), and headless hooks for custom UIs.
- **A working Next.js sample** — `examples/centra-storefront` — that you
  can clone, set `ACURIS_API_KEY`, and run.

Designed for, but not exclusive to, Centra storefronts. Anything that
serves React over a Node/edge backend works the same way.

> **Note:** This is a community integration. It is **not** an officially
> endorsed Centra module. We are an [Integration Partner applicant](https://centra.com/partners/);
> the connector exists so customer-led integrations can ship without
> bespoke work on either side.

---

## Quick start

```bash
npm install @acuris-geo/av-sdk @acuris-geo/centra-checkout
```

### 1. Backend (Next.js API route)

```ts
// pages/api/acuris/validate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { AcurisClient, validateAddress, AcurisError } from "@acuris-geo/av-sdk";

const client = new AcurisClient({ apiKey: process.env.ACURIS_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { country, input } = req.body;
  try {
    const result = await validateAddress(client, input, { country });
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof AcurisError) return res.status(err.status ?? 502).json({ error: err.message });
    res.status(500).json({ error: String(err) });
  }
}
```

### 2. Frontend (React component)

```tsx
import { useState } from "react";
import { AcurisAddressInput, AcurisAddressValidator } from "@acuris-geo/centra-checkout";

const ENDPOINTS = { validate: "/api/acuris/validate", suggest: "/api/acuris/suggest" };

export default function Checkout() {
  const [value, setValue] = useState("");
  return (
    <AcurisAddressValidator endpoints={ENDPOINTS} country="deu" address={value} trigger="submit">
      {({ status, result, formProps }) => (
        <form {...formProps}>
          <AcurisAddressInput endpoints={ENDPOINTS} country="deu" value={value} onChange={setValue} />
          <button type="submit">Continue</button>
          {status === "ok" && <p>✓ {result?.standardized?.formatted_address}</p>}
        </form>
      )}
    </AcurisAddressValidator>
  );
}
```

That's the whole loop. See [`examples/centra-storefront`](./examples/centra-storefront) for the runnable version.

---

## Repository layout

```
packages/
  acuris-av-sdk/             Node/TS SDK — wraps api.acuris-geo.com
  acuris-centra-checkout/    React components for Centra storefronts
examples/
  centra-storefront/         Runnable Next.js demo
docs/
  centra-integration-guide.md
  architecture.md
```

## Documentation

- [Centra integration guide](docs/centra-integration-guide.md) — production-ready wiring for a Centra storefront.
- [Architecture](docs/architecture.md) — why the client/server split, why a proxy, retry/timeout philosophy.
- [SDK README](packages/acuris-av-sdk/README.md) — full SDK API.
- [Components README](packages/acuris-centra-checkout/README.md) — full component API.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome. The bar is "small,
focused, with tests".

## License

[MIT](LICENSE) © Acuris GmbH.

Acuris itself is a separate product — see [acuris-geo.com](https://acuris-geo.com)
for the Address Validation & Geocoding service this connector wraps, or
[eudi.acuris-geo.com](https://eudi.acuris-geo.com) for our EUDI Wallet
verifier (a separate workstream).
