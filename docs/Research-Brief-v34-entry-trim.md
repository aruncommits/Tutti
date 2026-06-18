# Research Brief v34 — Reclaim Entry-Bundle Headroom

*Status: active · continuous-enhancement / performance · keeps Doc 1 P4 (instant) honest · authored by the loop*

## Rationale — why this, now

The perf-check budget exists precisely so performance can't erode unnoticed as features land — and
it's doing its job: after 33 briefs the **entry chunk has crept to 189 KB, one kilobyte under the
190 KB limit**. The next feature that touches the eager path would trip the gate. Rather than quietly
raise the ceiling (the "budget rot" anti-pattern the research warns about), the right move is to
**reclaim real headroom** by deferring code that isn't on the instant-cook critical path. The entry
still eagerly loads `PlanFlow` (PickScreen + ServeTimeScreen) — but the critical path is Home →
"Start cooking" → **CookScreen** (which must stay eager); Pick/ServeTime are reached only via the
secondary "Pick dishes" route and can be lazy-loaded like the other secondary screens (Brief v10).
That trims the entry and buys runway, with no UX regression (a brief Suspense fallback on a
non-critical screen).

### Research findings folded in (web pass, June 2026)

- **Route-based lazy loading gives the largest initial-JS reduction**; keep only what the user needs
  *immediately* (core layout/nav + the instant action) in the entry, defer secondary/conditional
  screens. `React.lazy` + `Suspense` is the mechanism (already in use here).
- Measure **before/after entry size**; modern bundlers dedupe shared deps across chunks automatically,
  so splitting a screen out rarely duplicates code.

## Definition of done

PlanFlow (Pick + ServeTime) is lazy-loaded; the entry chunk drops meaningfully below the 190 KB
budget (target ≤ ~178 KB) giving real headroom; the cook path (Home → Start cooking → Cook) stays
eager and instant; all flows still work (tests, incl. the journey tests, pass with `findBy` for the
now-lazy Pick); gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Lazy-load PlanFlow (App).** Change the eager `import { PickScreen, ServeTimeScreen } from
   "./PlanFlow"` to `React.lazy` named-export wrappers (`const PickScreen = lazy(() =>
   import("./PlanFlow").then(m => ({ default: m.PickScreen })))`, same for ServeTimeScreen). They're
   already rendered inside the routed `<Suspense>`, so no new boundary is needed. Keep `CookScreen`
   eager. Build and read the entry size from `dist/index.html`’s entry chunk.
2. **Fix tests that now await Pick/ServeTime.** Any test rendering `<App/>` and reaching Pick/Serve
   synchronously must use `findBy*`/`await` (e.g. journey.test step "Pick dishes" → await the Pick
   heading/Set-serve-time button; multidish/pickServings render PickScreen *directly* so they're
   unaffected — only App-level routes change). Update minimally.
3. **Confirm the trim + keep the budget.** perf-check should now report the entry well under 190 KB
   (record the new size in the commit). Leave the budget at 190 KB so the reclaimed headroom is real,
   not spent. Don't raise the ceiling.
4. **No UX regression.** Pick/ServeTime show the standard Suspense "Loading…" briefly on first visit;
   the instant-cook path (Start cooking) is unchanged (CookScreen eager). Verify the journey test +
   in-browser that Pick still appears.
5. **(Optional) audit other eager weight.** If the entry is still tight, check whether any other
   eagerly-imported helper is large/secondary; but prefer the single PlanFlow split and stop once
   there's comfortable headroom — don't over-split the critical path.

## Enforce-what-you-build
- perf-check: entry chunk under budget *with margin* (record before/after in the commit).
- journey + plan-flow tests still pass with the now-lazy Pick (await), proving no functional regression.

## When substantially done
Run a web-research pass on the next gap (onboarding, temperature, or competitor feature) and **author
`docs/Research-Brief-v35-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://www.greatfrontend.com/blog/code-splitting-and-lazy-loading-in-react
- https://schof.co/lazy-loading-routes-with-vite-and-react-router-v7/
- https://github.com/vitejs/vite/discussions/17730
