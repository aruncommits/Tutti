# Research Brief v35 — Error Boundary (no white screen)

*Status: active · continuous-enhancement / robustness · Doc 1 P4 (never blocked by the tool) · authored by the loop*

## Rationale — why this, now

Brief v23 made *persisted data* crash-proof, but a runtime error inside a screen's render (a bad
prop after an external refactor, an unexpected shape, a typo in a redesign) still takes the **whole
app to a blank white page** — the worst possible failure for a tool whose core promise is "the cook
is never blocked by the tool" (Doc 1 P4). This app is a moving target: it has absorbed several
external redesigns (Shell wrapper, theme swap, Settings refactor) and keeps changing. A single
**route-level React error boundary** turns "white screen of death" into a calm, recoverable
"something went wrong — back to home", keeping the rest of the app usable. It's the standard React
pattern, needs no dependency, and is the natural completion of the resilience work (v23 → data, v35 →
render).

### Research findings folded in (web pass, June 2026)

- An error boundary must be a **class component** using `static getDerivedStateFromError` (to render
  the fallback) and `componentDidCatch` (to log) — there's no hook equivalent.
- **Place it at the route level**, not a single wrapper around the whole app; the fallback should
  have **real content + a recovery action** (a button that resets/navigates), not just "error".
- Boundaries **don't catch errors in event handlers or async** — those still need local try/catch
  (we already guard storage, notify, share, resize). This covers the render path.

## Definition of done

A render-time error in any routed screen shows a friendly recoverable fallback ("Something went wrong
showing this screen" + a "Back to home" button) instead of a blank page; the header/nav stay usable;
navigating away clears it; errors are logged; no new deps; gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **ErrorBoundary component (web).** `apps/web/src/ErrorBoundary.tsx`: a class component
   `ErrorBoundary` with props `{ onHome?: () => void; children: ReactNode }`, state `{ error: Error | null }`.
   `static getDerivedStateFromError(error)` → `{ error }`; `componentDidCatch(error, info)` →
   `console.error("Tutti screen error:", error, info)`. `render()`: if `error`, a `.zone` fallback —
   a heading "Something went wrong", a line ("This screen hit a snag. Your saved data is safe."), and
   a "🏠 Back to home" button that calls `onHome?.()` and `this.setState({ error: null })`; else
   `this.props.children`. Keep it plain (no deps).
2. **Wrap the routed screen (App).** In App, wrap the routed `<Suspense>`/screen content inside
   `#screen-main` with `<ErrorBoundary key={screen} onHome={() => setScreen("home")}>` — keying by
   `screen` so a normal navigation always resets the boundary (a fresh screen never inherits a stale
   error). Leave the header/Shell/skip-link/announce OUTSIDE the boundary so they stay functional.
3. **Honest + safe.** Fallback says data is safe (true — localStorage is untouched). Don't swallow the
   error silently — log it. Don't wrap the whole app (header must survive).
4. **Tests.** `errorBoundary.test.tsx`: a child that throws renders the fallback (suppress the
   expected `console.error` via a spy); clicking "Back to home" calls `onHome` and the boundary
   recovers to render children again (rerender with a non-throwing child after reset). A normal child
   renders through untouched.

## Enforce-what-you-build
- a test that a throwing child yields the fallback + the recovery button calls onHome (console.error
  spied/suppressed), and a healthy child renders normally.
- boundary is route-level (keyed by screen); header stays outside it.

## When substantially done
Run a web-research pass on the next gap (onboarding, temperature, or competitor feature) and **author
`docs/Research-Brief-v36-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- https://github.com/bvaughn/react-error-boundary
- https://legacy.reactjs.org/docs/error-boundaries.html
