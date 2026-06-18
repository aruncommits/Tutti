# Research Brief v40 — Secure the dev AI endpoint (HIGH security finding)

*Status: active · continuous-enhancement / security · responds to an automated HIGH finding on the owner's new AI proxy · authored by the loop*

## Rationale — why this, now

The owner just shipped an app-provided "Ask AI" feature (`0ca206b`): a Vite dev-server middleware
(`apps/web/server/aiPlugin.ts`) that exposes `POST /api/recipe`, which calls a **paid** multi-provider
AI router using server-side keys. An automated security review flagged it **HIGH**: the endpoint is
**unauthenticated**, and the dev server runs with `host: true` (binds all interfaces), so **any device
on the same LAN can POST to it and spend the owner's AI quota/credits**. Vite's built-in Host-header
check mitigates *browser* DNS-rebinding, but not a direct `curl` from another LAN host — that path is
open. The in-memory `used >= freeLimit` cap (default 20) bounds the damage to ~20 calls per server
run, but those are real money + exhaust the legitimate free quota. This is worth fixing properly.

The subtlety: `host: true` is **likely intentional** — Tutti is a mobile-first PWA and the owner
probably tests "Ask AI" on a real phone over the LAN. So a naive "localhost-only" lock would break
their workflow. The fix must be **secure-by-default but allow an explicit opt-in** for LAN/mobile.

### Research findings folded in (web pass, June 2026)

- Vite's `server.allowedHosts` / Host-header check prevents **DNS-rebinding** (browser) attacks but
  setting it permissively (or relying on `host: true`) leaves the dev server reachable; an explicit
  allow-list is recommended. The check does **not** authenticate direct (non-browser) requests.
- For a privileged dev endpoint, the standard guards are: **bind/serve localhost-only by default**,
  and/or require a **shared dev token**, plus **Origin/Host validation** against rebinding.

## Definition of done

`POST /api/recipe` (and ideally `/api/usage`) is **not reachable unauthenticated from the LAN by
default**: localhost requests always work; non-localhost requests are rejected (403) **unless** the
owner explicitly opts into LAN access via an env flag (and then, ideally, a shared dev token). The
owner's localhost dev + an explicit mobile-testing mode both still work; gate green; no new deps.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure policy (testable, no Node).** Add `apps/web/server/accessPolicy.ts`: `isLoopback(addr?:
   string): boolean` (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`) and `allowRequest({ remoteAddr, allowLan,
   token, expectedToken }): { ok: boolean; status?: number }` — allow if loopback; else if `allowLan`
   and (no `expectedToken` OR `token === expectedToken`) allow; else deny 403. Unit-test the matrix
   (loopback always; LAN denied by default; LAN allowed with flag; LAN+token mismatch denied).
2. **Enforce in the plugin.** In `aiPlugin.ts`, read the client address (extend the minimal `Req`
   shape with `socket?: { remoteAddress?: string }`), and gate the `/api/*` handler via
   `allowRequest(...)` using env: `AI_ALLOW_LAN` (opt-in) + optional `AI_DEV_TOKEN` (checked against an
   `x-dev-token` header). On deny → `403 {error:"forbidden"}`. Plumb the two env values through
   `vite.config.ts` (alongside the existing key loading) into `aiApi(...)`.
3. **Keep the owner's workflow.** Default (no env) = localhost-only (secure). `AI_ALLOW_LAN=1` re-opens
   LAN for phone testing; if `AI_DEV_TOKEN` is also set, LAN requests must send `x-dev-token` (and
   `aiClient.ts` sends it when present). Document both in `apps/web/.env.example`.
4. **Honest + minimal.** Don't change the provider routing or the free-quota logic; this is purely an
   access gate. Don't break localhost. No new npm deps (pure TS + the existing env plumbing).
5. **Tests.** `accessPolicy` unit tests (item 1). If feasible, a small middleware test that a
   simulated non-loopback request without opt-in gets 403 and a loopback request passes.

## Enforce-what-you-build
- `allowRequest`/`isLoopback` pure + unit-tested (the loopback/LAN/token matrix).
- the endpoint denies a non-loopback request by default (regression guard for the HIGH finding).

## Acknowledgement to the owner (security finding)
This is dev-only and damage-capped at `freeLimit`, but a LAN-reachable unauthenticated paid-AI
endpoint is a real token-burning risk. This brief makes it **secure-by-default (localhost-only)** while
preserving your mobile-testing path behind an explicit `AI_ALLOW_LAN` (+ optional `AI_DEV_TOKEN`). If
you'd rather just set `server.host` to localhost (no mobile testing), say so and the gate collapses to
that.

## When substantially done
Run a web-research pass on the next gap and **author `docs/Research-Brief-v41-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://vite.dev/config/server-options
- https://github.com/vitejs/vite/security/advisories/GHSA-vg6x-rcgg-rjx6
- https://github.com/vitejs/vite/commit/bd896fb5f312fc0ff1730166d1d142fc0d34ba6d
