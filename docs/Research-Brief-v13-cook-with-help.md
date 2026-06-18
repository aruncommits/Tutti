# Research Brief v13 — Cook With Help (surface the multi-hands moat)

*Status: active · continuous-enhancement · showcases Doc 2 §4 (hands-as-a-resource) · authored by the loop*

## Rationale — why this, now

Tutti's deepest differentiator is in the engine: it models **the cook's hands as a finite resource**,
so adding a second cook isn't a note in a shared list — it **re-schedules the whole meal in
parallel** and lands dinner sooner. The capability already exists (`kitchenProfile.cooks` feeds the
RCPSP scheduler; the Kitchen screen has a "Cooks (hands)" stepper) — but it's **buried and
invisible**: nothing shows the user that cooking with a partner gets the thali done 10–15 minutes
faster, and the moment most people *have* help (special occasions, the exact case the user called
out — "sometimes more than 5 dishes") is when it matters most. The web pass confirms competitors
only share *lists/roles*; **none reschedule by number of hands.** Surfacing this — a prominent
"cooking with help?" control in the planning flow plus the concrete time saved — turns a hidden
engine feature into Tutti's signature wow moment. Pure, local, no LLM.

### Research findings folded in (web pass, June 2026)

- Collaborative cooking apps (Clove, Kitchen Together, Samsung Food) focus on **shared meal plans,
  lists, and role checklists** — coordination, not scheduling. Tutti's edge is that the *schedule
  itself* changes with the number of hands. Lead with the **time delta** ("ready 13 min sooner").
- Co-op cooking games assign **stations/roles** (chop, fry, plate) — a hint that, later, showing
  *which* cook takes *which* task is desirable; but the high-value first step is simply making the
  speed-up visible and easy to toggle.

## Definition of done

The planning flow has an obvious "cooking with help" control (cook count) that re-compiles the plan
and shows the **makespan/serve-time improvement** vs. one cook; the engine's parallelism is verified
by a test; the cook count flows everywhere a plan is built; gate green (incl. perf/pwa/a11y).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Verify + lock the engine parallelism (test).** Add an engine test: take a meal with ≥2
   concurrent hands-on tasks (e.g. the thali, or two simple library dishes), compile with `cooks: 1`
   vs `cooks: 2` on an otherwise ample kitchen, and assert the 2-cook `criticalPathMins`/makespan is
   **strictly less** (and never greater) — proving hands drive parallelism. If it's NOT less,
   investigate the scheduler's hands modelling before any UI. This guards the moat.
2. **Cook-count in the planning flow (web).** Surface a compact "Cooking with help?" stepper (1–4
   hands) on the **Serve-time / Preview** step (reads/writes `kitchen.cooks` — the source of truth —
   so it stays consistent with the Kitchen screen). Recompute the live preview on change.
3. **Show the time saved.** When `cooks > 1`, compute the one-cook plan too (compile with cooks:1)
   and display the delta: e.g. "With 2 pairs of hands: ready by 19:30 — **13 min sooner** than
   solo." Honest: if the meal can't parallelize (no concurrent active tasks), say "about the same"
   rather than invent a saving.
4. **Thread cooks everywhere.** Confirm every `compile()`/preview path uses `toKitchenProfile(kitchen)`
   (which already carries cooks) — the cook stepper just edits `kitchen`. No plan path should ignore
   it.
5. **Tests + verify.** A web test that bumping the cook stepper changes the shown serve time/delta;
   in-browser verify the thali gets faster with 2 cooks. (Optional stretch, note as future: tag each
   active task with a hands-lane so Cook Mode can show "Cook 1 / Cook 2".)

## Enforce-what-you-build
- engine test: 2 cooks ⇒ makespan strictly smaller for a parallelizable meal (permanent moat guard).
- web test: changing the cook count updates the preview/delta.

## When substantially done
Run a web-research pass on the next gap (per-task cook assignment / hands-lanes in Cook Mode,
nutrition or cost rollups, or another competitor feature) and **author `docs/Research-Brief-v14-*.md`**
inline. The loop never ends.

## Sources (research pass)
- https://clove.kitchen/features/collaboration
- https://apps.apple.com/us/app/kitchen-together-2/id6748915442
- https://katiecouric.com/lifestyle/cooking-for-two-group-meals-advice/
