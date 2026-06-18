# Research Brief v14 — Hands-Lanes: who does what (Cook Mode)

*Status: active · continuous-enhancement · extends Brief v13 + Doc 2 §4 / Doc 7 · authored by the loop*

## Rationale — why this, now

Brief v13 made the multi-cook *speed-up* visible. But the moment two people actually stand in the
kitchen, the next question is immediate and practical: **"which of these do I do, and which do
you?"** Right now Cook Mode shows one undifferentiated NOW list even with 2 cooks — so the parallel
plan exists in the schedule but the humans can't act on it without negotiating every step. The
scheduler already assigns each hands-on task to a specific hands-unit during its forward pass (that's
*how* it parallelizes); we just don't surface which unit. Exposing that as a **lane label ("You" /
"Cook 2")** turns the abstract speed-up into a concrete, glanceable division of labor — the
real-world payoff of the hands-as-a-resource model, and the explicit stretch goal noted in v13.

### Research findings folded in (web pass, June 2026)

- Parallel-cooking and multi-agent kitchen systems (Overcooked-style, cooking-navigation studies)
  converge on **per-actor task assignment with right-timing** — each cook gets *their* next task at
  the right moment, not a shared undifferentiated queue. Novices finish two dishes in parallel when
  the system tells each person what to do.
- Keep it honest and simple: only show lanes when `cooks > 1`; with one cook there are no lanes.
  Lanes are an aid, not a lock — either cook can still tap any task done (Doc 7's no-gating ethos).

## Definition of done

When cooking with ≥2 cooks, each hands-on NOW task shows which cook it's assigned to (a lane chip),
and the NOW zone is organized so two people can split the work at a glance; with one cook nothing
changes. The assignment comes from the scheduler (not invented in the UI) and is covered by an
engine test; gate green (incl. perf/pwa/a11y).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Expose the hands-lane from the scheduler (engine).** In `schedule.ts`'s resource-aware forward
   pass, the allocator already picks a free hands-unit for each active task — capture that unit's
   index and record it on the scheduled task (e.g. `schedule[nodeId].hand` = 0-based cook index, or
   `undefined`/0 for passive/one-cook). Add it to the `ScheduledTask` type. Engine test: compile the
   thali with `cooks: 2` on an ample kitchen and assert that at least one moment has two active tasks
   on **distinct** hands (lanes 0 and 1), and no two simultaneously-active tasks share a hand
   (a correctness invariant — hands are exclusive).
2. **Pass lane into ViewState (engine).** Surface `hand` on the active/now items `deriveViewState`
   produces (or read it from `plan.schedule` in the view) so the UI doesn't recompute scheduling.
3. **Lane chips in Cook Mode (web).** In `CookScreen`, when the plan was built with `cooks > 1`, show
   a small lane chip on each hands-on NOW card — "You" for hand 0, "Cook 2"/"Cook 3" otherwise (a
   distinct subtle color per lane). Keep passive tasks lane-less. Don't gate completion by lane —
   anyone can tap Done (Doc 7 §9 guided-not-gated). Pass `cooks` from the plan/kitchen into CookScreen.
4. **Glanceability.** Optional: lightly group or order NOW by lane so each person finds "their"
   tasks fast. Keep it subtle; the single-cook view must be unchanged.
5. **Tests + verify.** Engine test for hand exclusivity + ≥2 distinct lanes (item 1). A web test that
   with a 2-cook plan the NOW cards render lane chips and with 1 cook they don't. In-browser verify a
   2-cook thali shows "You / Cook 2" on concurrent tasks.

## Enforce-what-you-build
- engine invariant test: simultaneously-active tasks never share a hand; ≥2 lanes used when cooks=2.
- web test: lane chips appear only when cooks > 1.

## When substantially done
Run a web-research pass on the next gap (nutrition/cost rollups, richer recipe scaling, a sharing/
export feature, or another competitor gap) and **author `docs/Research-Brief-v15-*.md`** inline. The
loop never ends.

## Sources (research pass)
- https://arxiv.org/pdf/2406.05720 (multi-agent task-dependency coordination)
- https://www.researchgate.net/publication/221518644_First-person_cooking_A_dual-perspective_interactive_kitchen_counter
- https://arxiv.org/pdf/2402.18796 (MOSAIC interactive cooking)
