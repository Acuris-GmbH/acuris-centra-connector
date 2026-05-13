import { useEffect } from "react";
import type { AppProps } from "next/app";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  // Warm the /api/acuris/suggest serverless function on first paint so the
  // user's first typeahead keystroke doesn't pay a 500-1500 ms Vercel
  // cold-start. Empty `q=` short-circuits in the SDK (returns []), so no
  // Acuris credits are consumed by this prefetch.
  // Note: Centra uses ISO-3 country codes ("deu"), unlike commercetools/scayle.
  useEffect(() => {
    fetch("/api/acuris/suggest?country=deu&q=").catch(() => undefined);
  }, []);

  return <Component {...pageProps} />;
}
