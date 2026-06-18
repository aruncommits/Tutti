# Research Brief v7 — PWA / Offline-First (P4 made real)

*Status: active · continuous-enhancement phase · realizes Doc 1 P4 + Doc 7 §12 · authored by the loop*

## Rationale — why this, now

The whole roadmap is delivered, but one core promise is only *architecturally* true, not *actually*
true: **"the cook is never blocked by the tool; the app works offline" (Doc 1 P4, P2, Doc 7 §12)**.
Tutti's cooking path is already 100% local — pure engine, `localStorage`, no network calls on the
cooking path — so it is *capable* of working offline. But as a plain Vite SPA it currently **won't
load without the dev/host server**, and it isn't installable. A kitchen is exactly where
connectivity is flaky and a phone is propped on a counter — making Tutti a real **installable,
offline-first PWA** is the single highest-value, most spec-aligned enhancement available.

This is the first brief of the "compounding quality" phase: the roadmap is built; now we harden the
promises it made.

### Research findings folded in (web pass, June 2026)

- **`vite-plugin-pwa`** (zero-config, Workbox-based) is the standard: generates the service worker +
  `manifest.webmanifest`, **precaches the built css/js/html**, and supports `registerType:
  "autoUpdate"`. Drop-in for Vite + React.
- **Precache covers app assets; cross-origin needs runtime caching.** Tutti pulls Google Fonts from
  a CDN — for *true* offline either self-host the fonts (best, no third-party + no FOUT offline) or
  add a Workbox runtime-cache rule for `fonts.gstatic.com`. Prefer **self-hosting** the three fonts
  (Fraunces/Caveat/Inter) so the app is fully self-contained (and faster).
- **Dev vs build:** the service worker is emitted on `build`, not `dev` (unless devOptions on), so
  the existing dev-server gate/smoke is unaffected; assert the SW + manifest in the build output.

## Definition of done

`npm run build` emits a service worker + web manifest; the built app loads and cooks **with the
network offline** (engine, plan, ingestion-from-paste, shopping, voice/pace all already local);
Tutti is installable (valid manifest + icons); fonts are self-contained so there's no offline FOUT.
Verified by building + serving `dist` and asserting the SW/manifest exist (and ideally a Playwright
offline check).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Add `vite-plugin-pwa`.** `npm i -D vite-plugin-pwa -w apps/web`; add `VitePWA({ registerType:
   "autoUpdate", manifest: {...Tutti name/short_name/theme_color #100e0c/background/display
   standalone/icons}, workbox: { globPatterns: ["**/*.{js,css,html,svg,woff2}"] } })` to
   `vite.config.ts`. Keep strictPort/port 5180.
2. **Icons + manifest.** Provide an SVG app icon (reuse the "T" ember mark) and 192/512 maskable
   icons (an SVG icon entry works for install on most engines; if PNGs are needed, generate simple
   ones). `theme_color`/`background_color` from the dark theme. Verify the build emits
   `manifest.webmanifest` and it parses.
3. **Self-host the fonts (true offline).** Vendor Fraunces/Caveat/Inter `woff2` into the app (or via
   `@fontsource/*` packages) and replace the Google Fonts `<link>` in `index.html` with a local
   `@font-face`/import. Confirms no cross-origin dependency at runtime → fully offline + no FOUT.
   (If vendoring is heavy, fall back to a Workbox runtime-cache for the Google Fonts origins and
   note the tradeoff.)
4. **Update prompt / offline affordance (optional, light).** A tiny "ready to cook offline" / update-
   available toast using the plugin's `registerSW` (autoUpdate handles refresh) — keep minimal.
5. **Gate assertion.** Extend the build step or `scripts/smoke.mjs` (a separate `scripts/pwa-check.mjs`)
   to assert `apps/web/dist/manifest.webmanifest` and a service worker file (`sw.js`/`registerSW.js`)
   exist after build; wire into `npm run gate`. Optionally a Playwright check that loads the served
   `dist` with `context.setOffline(true)` and still renders Cook Mode.

## Enforce-what-you-build
- gate asserts the manifest + service worker are emitted by the build.
- (if added) an offline Playwright smoke that Cook Mode renders with the network disabled.

## When substantially done
Run a web-research pass on the next compounding-quality gap (Lighthouse performance budget, deeper
keyboard/screen-reader a11y, motion/Queue→NOW transition polish, or competitor-parity features like
a recipe library/search) and **author `docs/Research-Brief-v8-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://vite-pwa-org.netlify.app/guide/service-worker-precache
- https://adueck.github.io/blog/caching-everything-for-totally-offline-pwa-vite-react/
- https://vite-pwa-org.netlify.app/guide/inject-manifest
- https://css-tricks.com/vitepwa-plugin-offline-service-worker/
