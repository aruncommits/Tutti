# Research Brief v1 — Engine Core (the deterministic scheduler)

*Status: active · Phase 1 of the roadmap (Doc 3 §3) · authored by the unattended loop*

## Rationale — why this, now

The engine is **the asset** (Master Design §1.2): everything else renders it or feeds it. The
scaffold already ships the domain types, the `validate()` gate (Kahn's cycle detection), the
golden `thali_v1` fixture, and a responsive Cook Mode shell that renders a *placeholder*
three-tier derivation (active = deps-done, by hand). That placeholder is the seam to replace.

This brief builds the real, pure scheduler from Engine Blueprint (Doc 2 §4–§7) so that the UI
renders genuine `ViewState` from a genuine `MasterExecutionPlan`, and so the **six invariants**
(Doc 2 §9) are property-tested. Until this exists, nothing downstream (multi-dish interleaving,
serve-time honesty, pace learning) can be trusted. We build it first because it is pure and the
cheapest thing to test exhaustively.

**Boundary reminder:** no LLM here, ever (Doc 1 P2). Pure functions over plain data. Same inputs
→ byte-identical output (invariant 6).

## Definition of done (phase metric, Doc 3 §3)

Feed a hand-authored DAG (the thali) → the engine outputs a **valid, acyclic, resource-feasible**
schedule, and **all six invariants** hold under property-based testing. The web app's Cook Mode
renders from `deriveViewState(plan)` rather than the placeholder.

## Items — small, ordered, independently testable

Keep the gate green after each (`npm run typecheck && npm test && npm run build && npm run smoke`).

1. **Topological sort + critical path.** `topoSort(nodes)` (reuse Kahn's from `validate`),
   forward pass (earliest start/finish honoring dependencies only), backward pass, critical path =
   zero-slack chain. Unit-test against the thali's hand-known critical path.
2. **Hands-as-resource normalization (Doc 2 §4.2).** Inject `{category:"hands", count:cooks}` into
   the kitchen; every `active` node gains a `hands:1` requirement, `passive` nodes none. This is
   the lever that makes interleaving automatic — test that two active tasks never overlap for 1 cook.
3. **Resource-aware forward pass — greedy list scheduling (Doc 2 §4.3).** Priority = on-critical-
   path first, tie-break least-slack then longest-duration. Track a per-category availability
   timeline (Level 0 counts). A node starts at the earliest time ≥ its dependency finish where ALL
   its resource units are free for its whole duration. Test: thali never schedules 3 burner tasks
   on 2 burners; chopping slots into the rice/simmer passive windows.
4. **Reverse target-time anchoring (Doc 2 §4.5).** `startTime = targetServeTime − makespan`;
   shift planned start/end so the last node ends at the target; backward pass → `latestStart` +
   `slackMins`. If `startTime` is in the past, report the earliest realistic serve time (honest,
   P7) rather than faking it.
5. **`compile(recipes, kitchen, targetServeTime, paceModel?)` → `MasterExecutionPlan`.** Wire 1–4
   together: merge node sets (no cross-recipe edges, Doc 2 §4.1), schedule, fill `schedule{}`,
   `criticalPath`, `criticalPathMins`, `startTime`, `projectedServeTime`. Golden snapshot on the
   thali (invariant 6 enables snapshot testing).
6. **`deriveViewState(plan)` (Doc 2 §5.2).** active = not-completed AND all deps completed;
   archive = completed; queue = the rest; sort active/queue by plannedStart, archive by completion;
   compute `nextStartAlert`. Replace the web app's placeholder derivation with this.
7. **`applyEvent(plan, event)` (Doc 2 §5.3).** complete → mark completed + record actualDuration +
   promote newly-unblocked nodes; undo → revert + re-lock dependents; then `reschedule`.
8. **`reschedule(plan, now)` (Doc 2 §6).** Re-run the forward pass on remaining nodes with t0=now,
   freeze in-progress, recompute `projectedServeTime` and slack, flag running-late, emit
   `nextStartAlert`. Never reorder the currently-active task (stability).
9. **Adaptive pace EMA (Doc 2 §7).** Per-category `r ← α·(actual/est) + (1−α)·r_prev`; at compile
   time scale only `elastic` nodes by `userMultiplier[category]`. Cold start = 1.0, conservative.
10. **Property tests for all six invariants (Doc 2 §9)** with `fast-check`: generate random valid
    DAGs + kitchens; after every `compile`/`applyEvent`/`reschedule` assert — (1) acyclicity,
    (2) dependency safety, (3) resource feasibility incl. hands, (4) monotonic progress,
    (5) deadline honesty, (6) determinism. Plus a simulation test replaying fast/slow/out-of-order
    event streams.

## Enforce-what-you-build (gate assertions to add)

- Engine: the six-invariant property suite + the thali golden snapshot become permanent gate checks.
- Web: an assertion (via the browser MCP per-phase, or a DOM test) that Cook Mode's NOW zone equals
  `deriveViewState(plan).active` for the thali at t0.

## When substantially done

Run the **web-research pass** for Phase 1 (areas: RCPSP greedy heuristics & priority rules,
critical-path/PERT correctness, competitor cooking-scheduler apps and their gaps, mobile cooking
UX patterns, accessibility for glanceable kitchen UIs). Then **author
`docs/Research-Brief-v2-single-recipe-ui.md`** inline (lead with rationale) — Phase 2: the full
single-recipe responsive Cook Mode (tap-to-Done auto-promotion, contextual measurements, Kitchen
Profile setup, local session persistence) over the now-real engine. The loop never ends.
