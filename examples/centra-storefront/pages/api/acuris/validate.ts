import type { NextApiRequest, NextApiResponse } from "next";
import {
  AcurisClient,
  validateAddress,
  AcurisError,
  type ValidationResult,
  type AddressInput,
} from "@acuris-geo/av-sdk";

// UK PAF lives on its own satellite (paf.acuris-geo.com) — sales-handled,
// separate commercial SKU. Same API key works on both (the satellite
// delegates auth to the main box via HMAC). Two cached clients so each
// keep-alive pool stays warm to its own host.
let _client: AcurisClient | null = null;
let _pafClient: AcurisClient | null = null;
function client(country?: string): AcurisClient {
  if ((country || "").toLowerCase() === "gbr") {
    if (!_pafClient) {
      _pafClient = new AcurisClient({
        apiKey: process.env.ACURIS_API_KEY,
        baseUrl: "https://paf.acuris-geo.com",
        timeoutMs: 8000,
        userAgent: "centra-storefront-example/0.1.0",
      });
    }
    return _pafClient;
  }
  if (!_client) {
    _client = new AcurisClient({
      apiKey: process.env.ACURIS_API_KEY,
      timeoutMs: 8000,
      userAgent: "centra-storefront-example/0.1.0",
    });
  }
  return _client;
}

type Body = { country?: string; input?: AddressInput };
type ErrorBody = { error: string; message?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidationResult | ErrorBody>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const { country, input } = (req.body ?? {}) as Body;
  if (!country || !input) {
    res.status(400).json({
      error: "bad_request",
      message: "Request body must include { country, input }.",
    });
    return;
  }
  try {
    const result = await validateAddress(client(country), input, { country });
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof AcurisError) {
      res.status(err.status ?? 502).json({
        error: err.name,
        message: err.message,
      });
      return;
    }
    res.status(500).json({ error: "internal", message: String(err) });
  }
}
