// Access policy for the dev AI endpoint (Brief v40 — HIGH security fix). Pure & Node-free so it
// unit-tests cleanly. The dev server may bind all interfaces (host:true, for mobile testing), so the
// paid /api/recipe endpoint must be LOCALHOST-ONLY BY DEFAULT and only reachable from the LAN when the
// owner explicitly opts in (AI_ALLOW_LAN), optionally behind a shared dev token (AI_DEV_TOKEN).

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function isLoopback(addr?: string): boolean {
  return !!addr && LOOPBACK.has(addr);
}

export interface AccessInput {
  remoteAddr?: string;
  allowLan: boolean;
  token?: string;
  expectedToken?: string;
}

/** Loopback is always allowed. Non-loopback is denied (403) unless LAN access is opted in, and — when
 *  a dev token is configured — the request carries the matching token. */
export function allowRequest({ remoteAddr, allowLan, token, expectedToken }: AccessInput): { ok: boolean; status?: number } {
  if (isLoopback(remoteAddr)) return { ok: true };
  if (!allowLan) return { ok: false, status: 403 };
  if (expectedToken && token !== expectedToken) return { ok: false, status: 403 };
  return { ok: true };
}
