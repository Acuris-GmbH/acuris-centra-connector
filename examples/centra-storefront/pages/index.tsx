import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Acuris × Centra — sample storefront</h1>
      <p>
        This is a minimal Next.js app showing how a Centra customer wires the
        Acuris Centra Connector into their checkout flow. It uses
        <code> @acuris-geo/centra-checkout </code> on the client and
        <code> @acuris-geo/av-sdk </code> behind a Next.js API route.
      </p>
      <p>
        <Link href="/checkout">→ Go to the demo checkout</Link>
      </p>
      <h2>How it works</h2>
      <ol>
        <li>Browser renders the address fields with <code>&lt;AcurisAddressInput&gt;</code>.</li>
        <li>Each keystroke (debounced) hits <code>/api/acuris/suggest</code> on this app.</li>
        <li>That route uses the SDK server-side with <code>ACURIS_API_KEY</code> from the env.</li>
        <li>On submit, <code>&lt;AcurisAddressValidator&gt;</code> runs a full validate pass.</li>
      </ol>
      <p>
        Read <a href="https://github.com/Acuris-GmbH/acuris-centra-connector/blob/main/docs/centra-integration-guide.md">the integration guide</a> for production deployment.
      </p>
    </main>
  );
}
