# centra-storefront-example

A minimal Next.js (pages router) app that demonstrates the Acuris Centra
Connector end-to-end. It uses both packages from this repo:

- `@acuris-geo/centra-checkout` — `<AcurisAddressInput>` + `<AcurisAddressValidator>` in the browser.
- `@acuris-geo/av-sdk` — server-side, behind two Next.js API routes that proxy to Acuris.

## Run locally

```bash
# from the repo root
npm install
cp examples/centra-storefront/.env.example examples/centra-storefront/.env.local
# then edit .env.local and set ACURIS_API_KEY=<your key>

npm run build -w @acuris-geo/av-sdk -w @acuris-geo/centra-checkout
npm run dev -w centra-storefront-example
# open http://localhost:3000
```

## Deploy to Vercel

```bash
cd examples/centra-storefront
npx vercel
# when prompted, set ACURIS_API_KEY as an environment variable in the dashboard
```

## File map

```
pages/
  index.tsx                 Landing page (links to /checkout)
  checkout.tsx              Demo checkout with the Acuris components
  api/
    acuris/
      validate.ts           POST proxy → /v1/validate via SDK
      suggest.ts            GET  proxy → /v1/suggest  via SDK
styles/
  globals.css               Minimal styles for the suggestions dropdown
.env.example                Template for ACURIS_API_KEY
```

## Why a proxy?

Your Acuris API key must stay on the server. The components in
`@acuris-geo/centra-checkout` call _your_ endpoints (`/api/acuris/*` in this
sample) which forward to `api.acuris-geo.com` with the key attached. See
`docs/architecture.md` in the repo root.

## What this sample is NOT

- A real Centra integration (no Centra GraphQL calls; we just show the AV/geo wiring).
- A real checkout (no cart, no payments, no inventory).
- Production-styled (the CSS is intentionally minimal).

The goal is to show, in ~100 lines of app code, how to wire the connector.
Real Centra storefronts will replace the surrounding UI with their own.
