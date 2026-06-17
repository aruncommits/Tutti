# Research Brief v6 — The Learning Loop (per-user, on-device)

*Status: active · Doc 10 (Loop A) · Doc 2 §7 · authored by the loop after the roadmap's Phases 0–4*

## Rationale — why this, now

The original 5-phase roadmap (engine → cook UI → multi-dish → ingestion → voice/pace) is fully
delivered: a pure deterministic engine (six invariants property-tested), a complete responsive
cooking experience, paste/URL/AI ingestion, household features (scaling, shopping, allergens), and
hands-free voice. The pace model is **wired into `compile()` but starved of data** — it stays
identity because nothing populates it yet (we deliberately refused to fabricate timings in v5).

Doc 10 describes three nested learning loops; **Loop A (per-user) is the one we can build now**: it
"works from day one with zero network," needs no crowd, and turns the cook's own behavior into
truer time estimates. This brief closes the loop honestly — capture **planned-vs-actual** on
device, converge the per-category pace multipliers via the engine's `updatePace` EMA, and surface
it (the explainable line from v5 finally lights up). Loops B/C (crowd curation, parser improvement)
need a backend + many users and stay out of scope (Doc 10 §11).

### Research findings folded in (web pass, June 2026)

- **Local-first, opt-in, no egress.** Privacy-respecting telemetry keeps learning data on the
  device, asks explicit consent, and sends nothing without it. That's exactly Doc 10 §8 ("on-device
  capture; upload aggregates only; explicit opt-in"). For Tutti today there is **no upload at all** —
  everything lives in `localStorage`. Give the user a visible toggle and a "forget my data" control.
- **Robust stats over raw numbers** (Doc 10 §3.2): use the EMA (already in `updatePace`) and guard
  outliers (the cook who answered the phone) so one 40-min "simmer" doesn't poison the model.

## Definition of done

Completing tasks in a real cook records honest planned-vs-actual durations on device (opt-in);
across a session the per-category pace multipliers update via `updatePace`; the next compiled plan
reflects them and Home shows the explainable line; a small "cooking stats / pace" view exists; all
local, all clearable. Verified in-browser.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Honest actual-duration capture (web).** When a task is marked done in Cook Mode, record a real
   elapsed measurement: stamp `Date.now()` when a task becomes the active focus (or when the prior
   task completed) and compute the gap on completion. **Guard outliers** (ignore if actual is <0.3×
   minMins or >3× maxMins — Doc 10 §3.2 robustness) and only learn from `elastic` active tasks
   (chopping scales with the cook; a fixed simmer doesn't). No fabrication: if we can't attribute a
   clean interval, record nothing.
2. **Feed actuals into `updatePace` (opt-in).** Behind a persisted `tutti.learnPace` opt-in flag
   (default on, with a toggle), call `updatePace(pace, {category: paceCategoryOf(node), actualMins,
   estMins})` and persist `tutti.pace`. The v5 wiring already feeds `tutti.pace` into `compile()`,
   so the next plan and the Home explainable line update automatically.
3. **Event log (on-device, for the stats view).** Append `{type:"node_completed", recipeId, nodeId,
   category, plannedMins, actualMins, at}` to a capped (e.g. last 200) `tutti.events` array. Pure
   shape; the basis for a metrics view and a future Loop-B export (never auto-uploaded).
4. **Stats / pace view.** A small screen (from Home) showing: per-category pace multipliers with the
   plain-language explanation ("you run ~20% slow on chopping"), recent estimate-error (MAE of
   planned vs actual — Doc 10 §10), and a **"forget my learning"** button (clears pace + events).
   Privacy line: "Everything stays on this device."
5. **Tests.** Engine `updatePace` convergence is already covered; add a web/unit test for the
   outlier guard + the opt-in gate (no learning when off), and that the stats view renders pace.

## Enforce-what-you-build
- outlier-guard + opt-in unit-tested (no pace change when `learnPace` is off or the sample is wild).
- stats view assertion that it reads from persisted pace.

## When substantially done
Doc 10 Loop A is closed. Run a web-research pass on a **continuous-enhancement** theme (pick by
gap: competitor feature parity, performance/Lighthouse, PWA/offline installability, motion polish,
or deeper a11y) and **author `docs/Research-Brief-v7-*.md`** inline. From here the loop shifts from
"build the roadmap" to "compound quality" — each brief a focused enhancement, researched then
implemented, gate always green. The loop never ends.

## Sources (research pass)
- https://super-productivity.com/use-cases/privacy-productivity/
- https://privacysandbox.google.com/protections/on-device-personalization
- https://telemetrydeck.com/docs/guides/privacy-faq/
