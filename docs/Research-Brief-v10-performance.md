# Research Brief v10 — Performance: Route-Level Code-Splitting

*Status: active · continuous-enhancement · realizes Doc 1 P4 (instant, never-blocked) · authored by the loop*

## Rationale — why this, now

Tutti is one eager bundle: **~207 KB of JS** is parsed before the first paint, and it includes every
screen — Browse, Stats, Shopping, the Plan-Preview Gantt, and crucially **AddRecipe, which imports
the whole `@tutti/ingest` parser package** (JSON-LD + heuristic text parsing) that a user only needs
when they actually add a recipe. On a phone propped on a counter (often a mid-range device on
kitchen Wi-Fi), that's slower first paint and wasted parse time for code most sessions never touch.
P4 says the cook is *never blocked by the tool* and the app responds *instantly* — a lean initial
load on the **cook path** is the most direct way to honor that. Code-splitting is the highest-ROI,
lowest-risk performance win and is measurable (Lighthouse performance + chunk sizes).

### Research findings folded in (web pass, June 2026)

- **Route-level code-splitting is the best first move** — each screen becomes its own chunk, only
  the active one loads, typically the largest cut to initial JS. `React.lazy` + `Suspense` works out
  of the box with Vite (auto-creates per-import chunks).
- Keep the **critical cook path eager** (Home → the engine + CookScreen are tiny and must be
  instant); lazy-load the **secondary screens** (AddRecipe/ingest, Browse, Shopping, Stats, Preview,
  Kitchen, Onboarding). A small `Suspense` fallback (a centered spinner/"…") covers the brief load.
- Vite/Workbox already precache all chunks for offline, so splitting **does not** hurt offline — the
  SW caches the lazy chunks too; the PWA gate keeps enforcing the precache.

## Definition of done

The initial JS chunk shrinks materially (target: secondary screens — especially the ingest-pulling
AddRecipe — are split into separate chunks and out of the entry); the app still loads, cooks,
browses, and works offline; the gate (incl. pwa-check) stays green; a Lighthouse run shows the
split. Verified by the build's chunk output + a quick audit.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Lazy-load the secondary screens (App).** Convert the heavy/secondary screens to `React.lazy`
   dynamic imports: `AddRecipe` (pulls `@tutti/ingest`), `BrowseScreen`, `ShoppingScreen`,
   `StatsScreen`, `PreviewScreen`, `KitchenScreen`, `OnboardingScreen`. Keep `CookScreen` + the
   engine eager (critical path). Wrap the routed `<main>` content in a single `<Suspense fallback={…}>`
   with a minimal, accessible fallback (e.g. `<div className="idle" role="status">Loading…</div>`).
   Ensure named exports are adapted (`React.lazy(() => import("./BrowseScreen").then(m => ({default: m.BrowseScreen})))`).
2. **Verify the split + ingest out of the entry.** After build, assert the entry chunk no longer
   contains the ingest parser code and that separate chunks exist for the lazy screens. Extend
   `scripts/pwa-check.mjs` (or a new `scripts/perf-check.mjs` wired into the gate) to assert: (a) more
   than one JS chunk in dist, and (b) the entry/main chunk is below a budget (e.g. < 170 KB) — a
   regression guard. Keep it lenient enough not to be flaky.
3. **Keep tests green.** Component tests import screens directly (not via App's lazy), so they're
   unaffected; App-level tests render through `Suspense` — if a test now needs to await a lazy screen,
   use `findBy*`/`await`. Fix any that break.
4. **Quick audit.** Run Lighthouse (Chrome DevTools MCP) before/after note in the commit; confirm the
   PWA precache still lists all chunks + fonts (offline intact).

## Enforce-what-you-build
- gate asserts the bundle is split (multiple chunks) and the entry stays under budget.
- pwa-check still passes (offline precache covers the new chunks).

## When substantially done
Run a web-research pass on the next gap (motion polish for the Queue→NOW promotion — Doc 7 §13 — or a
deeper competitor-parity feature like saved meals / favorites) and **author
`docs/Research-Brief-v11-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://www.greatfrontend.com/blog/code-splitting-and-lazy-loading-in-react
- http://www.mykolaaleksandrov.dev/posts/2025/10/react-lazy-suspense-vite-manualchunks/
- https://cathalmacdonnacha.com/route-based-code-splitting-with-react
