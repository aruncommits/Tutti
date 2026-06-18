# Research Brief v30 — End-to-End Cook Journey Test

*Status: active · continuous-enhancement / quality · regression guard for the whole flow · authored by the loop*

## Rationale — why this, now

Tutti now has ~30 screens and keeps absorbing **external redesigns** (the light "rice-paper" theme,
PreviewScreen rewrites, index.html/title swaps) plus a steady stream of features. Coverage is strong
at the unit/component level, but there is **no test that drives the whole cook journey end to end** —
the exact place a wiring break hides (a renamed prop, a route that no longer reaches Cook Mode, a
finale that stops promoting tasks). A single integration test that walks **Home → plan → Cook Mode →
finished**, asserting via visible text/roles like a real user, would catch those cross-screen
regressions the gate can't see today, and turn "I verified it in the browser once" into a permanent
guard. The engine is already property-tested; this protects the **engine-to-UI seam** across the app.

### Research findings folded in (web pass, June 2026)

- Treat it as **a bigger unit test of the combined components**; assert **behavior via accessible
  roles / visible text**, never internal state — so it survives refactors and redesigns.
- **AAA** structure, descriptive name; use **`findBy*`** for the lazy-loaded screens (Preview/Mise
  resolve through Suspense). "The more your tests resemble how the software is used, the more
  confidence they give."

## Definition of done

An App-level integration test drives the critical journey — start a cook, see Cook Mode, complete the
active tasks (starting passive timers as needed), and reach the "Dinner is served" finale — using
only role/text queries; it passes and is part of the gate; any wiring break it surfaces along the way
is fixed. Gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Golden-path integration test (web).** `apps/web/src/journey.test.tsx`: seed `tutti.onboarded=true`,
   `tutti.screen="home"`. Render `<App/>`. (a) Click "Start cooking" (Home's big button → `startCooking`
   → Cook Mode). (b) Assert the NOW zone renders (region "NOW" / a "Serving at" clock). (c) Drive the
   cook to completion: repeatedly, for each active card, click its "Start — it cooks itself" (passive)
   or "✓ Done" (active) button until none remain — a bounded loop (cap iterations, e.g. ≤ node count
   ×3) querying buttons by name each pass. (d) Assert the finale "Dinner is served" appears (findBy).
   Use `await`/`findBy` for any lazy/async transitions. Keep it deterministic (no timers needed —
   passive "Done" can be clicked without waiting for the countdown).
2. **Plan-flow sub-journey (web).** A second test: from Home click "Pick dishes" → (dishes already
   selected by default) "Set serve time" → set/accept time → "Build my plan" → assert the Preview
   ("The score" / a serve time) renders (findBy, it's lazy) → "Start cooking" → "Get ready" (Mise)
   renders → "Start cooking" → Cook Mode. Assert each milestone by visible text/role.
3. **Fix what it surfaces.** If a step can't find its control (renamed button, broken route, missing
   prop after an external edit), fix the wiring minimally so the journey completes. Note the fix in
   the commit.
4. **Keep it resilient.** Query by accessible name/role/visible text (not test-ids or classes); use
   `getAllByRole` + filter where multiple Done buttons exist; cap loops so a regression fails fast
   instead of hanging.
5. **Honest.** If part of the journey genuinely can't be driven in jsdom (e.g. requires real timers/
   notifications), assert up to that boundary and say so in a comment — don't fake a pass.

## Enforce-what-you-build
- the journey test is in the gate: a break in Home→Cook→finale or Pick→Preview→Mise→Cook fails CI.
- queries are role/text based so it doesn't rot on the next redesign.

## When substantially done
Run a web-research pass on the next gap (photos, onboarding, temperature, or competitor feature) and
**author `docs/Research-Brief-v31-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://maxrozen.com/understanding-integration-testing-react
- https://thetshaped.dev/p/9-react-testing-best-practices-for-better-test-design-quality
- https://testing-library.com/docs/guiding-principles/
