import { useState } from "react";
import {
  AcurisAddressInput,
  AcurisAddressValidator,
  type SuggestionHit,
} from "@acuris-geo/centra-checkout";

const ENDPOINTS = {
  validate: "/api/acuris/validate",
  suggest: "/api/acuris/suggest",
};

const COUNTRIES = [
  { code: "deu", label: "Germany" },
  { code: "usa", label: "United States" },
  { code: "gbr", label: "United Kingdom" },
  { code: "fra", label: "France" },
  { code: "swe", label: "Sweden" },
];

export default function Checkout() {
  const [country, setCountry] = useState("deu");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<SuggestionHit | null>(null);
  const [name, setName] = useState("");

  return (
    <main>
      <h1>Demo checkout</h1>
      <p>
        Start typing an address — suggestions come from Acuris (proxied by this
        app&apos;s <code>/api/acuris</code> routes). Pick one to autofill the
        fields below, then submit to run a full validate pass.
      </p>

      <label htmlFor="name">Recipient</label>
      <input
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Jane Brand-Owner"
      />

      <label htmlFor="country">Country</label>
      <select
        id="country"
        value={country}
        onChange={(e) => {
          setCountry(e.target.value);
          setSearch("");
          setPicked(null);
        }}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.label}</option>
        ))}
      </select>

      <label htmlFor="addr">Address</label>
      <AcurisAddressInput
        id="addr"
        endpoints={ENDPOINTS}
        country={country}
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPicked(null);
        }}
        onSelect={(hit) => setPicked(hit)}
        debounceMs={200}
        minQueryLength={3}
        placeholder="Friedrichstraße 43, 10117 Berlin"
      />

      {picked && (
        <p className="acuris-status" data-state="ok">
          Picked: {picked.formatted_address ?? "(no formatted address)"} —
          lat {picked.lat?.toFixed(5)}, lng {picked.lng?.toFixed(5)}
        </p>
      )}

      <AcurisAddressValidator
        endpoints={ENDPOINTS}
        country={country}
        address={
          picked
            ? {
                street: picked.street,
                house_number: picked.house_number,
                city: picked.city,
                state: picked.state,
                postcode: picked.postcode,
              }
            : search
        }
        trigger="submit"
      >
        {({ status, result, error, formProps }) => (
          <form {...formProps}>
            <button type="submit" disabled={!search}>
              Validate &amp; continue
            </button>
            {status === "loading" && (
              <p className="acuris-status" data-state="loading">Validating…</p>
            )}
            {status === "ok" && result && (
              <p className="acuris-status" data-state="ok">
                ✓ {result.accuracy_type ?? "match"} — confidence {result.confidence.toFixed(2)}<br />
                {result.standardized?.formatted_address}
              </p>
            )}
            {status === "error" && error && (
              <p className="acuris-status" data-state="error">✗ {error.message}</p>
            )}
          </form>
        )}
      </AcurisAddressValidator>
    </main>
  );
}
