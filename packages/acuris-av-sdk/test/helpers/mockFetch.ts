/**
 * Minimal fetch mock — records calls, scripts responses. We avoid msw because
 * the SDK has zero runtime deps and we want the test surface to stay narrow.
 */
export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  signalAborted: boolean;
}

export type Scripted =
  | { kind: "ok"; status?: number; body: unknown }
  | { kind: "raw"; status: number; bodyText: string }
  | { kind: "error"; error: Error }
  | { kind: "stall"; ms: number };

export interface MockFetch {
  fn: typeof globalThis.fetch;
  calls: RecordedCall[];
  push: (s: Scripted) => void;
  remaining: () => number;
}

export function mockFetch(initial: Scripted[] = []): MockFetch {
  const scripted: Scripted[] = [...initial];
  const calls: RecordedCall[] = [];

  const fn: typeof globalThis.fetch = async (input, init) => {
    const req: RecordedCall = {
      url: typeof input === "string" || input instanceof URL ? input.toString() : input.url,
      method: (init?.method ?? "GET").toUpperCase(),
      headers: extractHeaders(init?.headers),
      body: init?.body ? safeJson(init.body) : undefined,
      signalAborted: init?.signal?.aborted ?? false,
    };
    calls.push(req);

    const s = scripted.shift();
    if (!s) throw new Error("mockFetch: no scripted response remaining");

    if (s.kind === "stall") {
      await new Promise<void>((resolve, reject) => {
        const id = setTimeout(resolve, s.ms);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(id);
          reject(init.signal!.reason ?? new Error("aborted"));
        });
      });
      // After stall, default to 200 empty body unless caller scripts more.
      return new Response(JSON.stringify({}), { status: 200 });
    }

    if (s.kind === "error") throw s.error;

    if (s.kind === "raw") {
      return new Response(s.bodyText, { status: s.status });
    }

    return new Response(JSON.stringify(s.body), {
      status: s.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  return {
    fn,
    calls,
    push: (s) => scripted.push(s),
    remaining: () => scripted.length,
  };
}

function extractHeaders(h: HeadersInit | undefined): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((v, k) => {
      out[k.toLowerCase()] = v;
    });
    return out;
  }
  if (Array.isArray(h)) {
    return Object.fromEntries(h.map(([k, v]) => [k.toLowerCase(), v]));
  }
  return Object.fromEntries(
    Object.entries(h as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]),
  );
}

function safeJson(body: BodyInit): unknown {
  try {
    if (typeof body === "string") return JSON.parse(body);
  } catch {
    /* ignore */
  }
  return body;
}
