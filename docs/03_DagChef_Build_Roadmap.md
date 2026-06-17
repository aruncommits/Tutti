# DagChef — Phased Build Roadmap

**Document 3 of 3** · How we ship it, in order, without building the hard parts twice
*Implements the Master Design Document and Engine Blueprint*
*Status: Draft v1 · Owner: Arun*

---

## 0. The strategy in one paragraph

Build the **deterministic engine first, with hand-authored recipes**, and prove it works before writing a single line of UI or touching the LLM. The riskiest assumption — *"a computed parallel schedule genuinely saves time and reduces chaos"* — is validated in Phase 0 with a stopwatch and zero code. Everything after that is de-risked execution. The content pipeline (LLM parsing → human-verified Golden Library) runs as a **parallel track**, not a blocker, so the engine never waits on AI and the AI never sits on the cooking path.

**Guiding sequencing rule:** never build the UI until the engine is proven; never trust the LLM until a human-in-the-loop verifies it; never add a feature that puts an LLM call on the cooking critical path.

---

## 1. Phase map (at a glance)

```
 PHASE 0  Paper validation        ── no code ──        prove the time-saving is real
 PHASE 1  Headless engine         ── core ──           single-recipe scheduling + tests
 PHASE 2  Single-recipe UI        ── experience ──      3-tier view over engine state
 PHASE 3  Multi-dish compiler     ── the moat ──        merge + resources + reverse time
 PHASE 4  Hands-free + adaptive   ── polish ──          voice control + pace learning
 ───────────────────────────────────────────────────────────────────────────────
 TRACK C  Content pipeline (parallel)  LLM parser → validator → review tool → library
```

Each phase has **one falsifiable success metric**. If a phase fails its metric, we stop and fix the model before proceeding — that is the whole point of ordering it this way.

---

## 2. Phase 0 — Paper validation (no code)

**Goal:** prove the core premise before investing in engineering.

**What to do:** Take one real multi-dish meal — recommend the **South Indian thali** (Vatha Kuzhambu + Poriyal + Rice), since it matches the source examples and is rich in passive windows. By hand:
1. Write each dish as a DAG (nodes, active/passive, durations, dependencies, equipment).
2. Manually compute the interleaved schedule (hands-as-resource, 2 burners).
3. Cook it twice, with a stopwatch: once the normal linear way, once following the interleaved plan.

**Success metric:** the interleaved plan saves a **meaningful** chunk of wall-clock time (target: ≥15%) *and* the cook subjectively reports less chaos. If the savings are marginal, the premise is wrong and we rethink before building anything.

**Output:** a validated example DAG (becomes the first golden recipe + the engine's golden test fixture) and a go/no-go decision.

---

## 3. Phase 1 — Headless engine (the core)

**Goal:** implement the deterministic engine (Blueprint §2–§7) for a **single recipe**, with hand-authored DAGs. No UI. No LLM.

**Build:**
- The data model (TaskNode, RecipeGraph, KitchenProfile, MasterExecutionPlan, ViewState).
- `validate()` — schema, refs, **cycle detection (Kahn's)**, lint warnings.
- `compile()` for one recipe: topological sort, forward/backward pass, critical path, reverse target-time anchoring.
- Hands-as-resource normalization (even single-recipe benefits: interleave prep into passive cook windows).
- `deriveViewState()`, `applyEvent()`, `reschedule()`.
- The full test suite: unit + property-based (the six invariants) + the Phase 0 thali as a golden fixture.

**Hardcode / fake for now:** recipes are hand-written JSON (no parser yet). Kitchen profile is a fixed object. No persistence beyond memory.

**Success metric (from original Tech doc, kept):** feed it a hand-authored recipe → it outputs a valid, acyclic, resource-feasible schedule, and all six invariants pass under property-based testing.

**Why first:** this is the asset (Master §1.2). Everything else renders or feeds it. It must be bulletproof and is the cheapest thing to test exhaustively because it's pure.

---

## 4. Phase 2 — Single-recipe progressive UI (the experience)

**Goal:** a cook can make **one** dish start-to-finish without ever scrolling or getting lost.

**Build:**
- React Native client.
- The **three-tier view** (Active expanded / Queue collapsed / Archive struck) rendered purely from `deriveViewState()`.
- Tap-to-complete → `applyEvent()` → auto-promotion of unblocked nodes (live).
- Contextual measurement injection (measurements live in the node, not a separate list).
- Kitchen Equipment Profile setup screen (Level 0 coarse counts).
- Local persistence of an in-progress session (survive app backgrounding — the stove is on).

**Hardcode / fake:** recipes still hand-authored, loaded from a bundled file. Single recipe only — no merge yet. No voice.

**Success metric (from original Tech doc, kept):** a test user cooks a single real recipe through the app, never opens a separate ingredients list, never scrolls to find the current step, and finishes successfully.

**Deliberately deferred:** phase-gate behavior ships here as **guided-not-gated** (Master §7.2) — a one-tap "start cooking" confirmation, not a hard wall.

---

## 5. Phase 3 — Multi-dish compiler (the moat)

**Goal:** the actual differentiator — merge multiple recipes into one interleaved, resource-correct, deadline-anchored plan.

**Build:**
- `compile()` over **N recipes**: merge node sets, resource-constrained greedy scheduling (Blueprint §4.3).
- Resource collision handling at **Level 0** (burner/oven counts) with the schema already capable of Levels 1–2.
- Reverse target-time scheduling end-to-end: user picks dishes + serve time → exact start time + live projected serve time.
- Real-time recalculation on completion + wall-clock tick (Blueprint §6).
- Multi-dish view: interleaved Active Zone may show tasks from different dishes; clear dish labeling.

**Success metric (sharpened from original):** given two dishes that both need the stove and a 2-burner kitchen, the app produces a schedule that (a) never schedules 3 concurrent burner tasks, (b) slots Dish B's chopping into Dish A's simmer, and (c) hits the target serve time in a real timed cook — beating the linear baseline by the Phase 0 margin.

**Why here, not earlier:** merge logic is meaningless until single-recipe scheduling and the UI are proven. This phase only adds the merge dimension to an already-trusted engine.

---

## 6. Phase 4 — Hands-free + adaptive pace (the polish)

**Goal:** make it survive a real, messy kitchen and get smarter per user.

**Build:**
- **Voice control** (Web Speech API / native recognition): "next," "done," "what's next," "how long left." This is the hands-free MVP bet.
- Adaptive pace model (Blueprint §7): per-category EMA multipliers, applied only to `elastic` durations, fully explainable to the user.
- Overrun detection + gentle alerts ("the dal's been simmering 4 min over — want to move on?").

**Explicitly cut from MVP:** camera-gesture control (Master §8) — unreliable in steam, revisit only if voice proves insufficient.

**Success metric:** a user completes a full multi-dish cook advancing entirely by voice, hands never touching the screen during Phase 2 cooking; pace model visibly converges across 3+ sessions.

---

## 7. Track C — Content pipeline (runs in parallel from day one)

This track matures alongside Phases 1–4 so there's trusted content at launch. It is **never** on the cooking critical path (Master P2).

- **C1 (during Phase 1):** draft the LLM parsing prompt; output must conform to the TaskNode schema via strict structured/function-calling. Test against the hand-authored Phase 0 DAG — does the LLM reproduce the human's graph?
- **C2 (during Phase 2):** build the deterministic validator as the gate (reuse Phase 1 `validate()`), plus a lightweight **human review tool** to approve/correct parsed DAGs.
- **C3 (during Phase 3):** seed the **Golden Recipe Library** with one coherent cuisine vertical (recommend South Indian, matching the examples) — enough verified, interleavable dishes to make multi-dish compelling at launch.
- **C4 (post-MVP):** optional "paste your own recipe" path — same parser, skips human review, shows a visible **"unverified"** badge. Never the default.

**Success metric for the track:** ≥N human-verified, interleavable recipes in the library before public launch (N set by the chosen vertical — enough that any two combine into a sensible meal).

---

## 8. Dependency graph of the build itself

```
 Phase 0 ──▶ Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4
                │                        ▲
                └─ Track C1 ─ C2 ────────┴─ C3 ──▶ C4
   (engine and content advance in parallel; C3 needs Phase-3 merge to be meaningful)
```

The engine track and content track only **converge** at Phase 3 (when a real library makes multi-dish real). Until then they progress independently — engine on hand-authored data, content pipeline maturing against the same fixtures.

---

## 9. What we deliberately defer past MVP

| Deferred item | Why | Revisit when |
|---|---|---|
| Camera-gesture control | Unreliable in steam (Master §8) | Voice proves insufficient |
| Level 1/2 equipment fidelity | Coarse counts prove the model | Power users hit count limits |
| User-pasted unverified recipes | Trust risk (Master §4.4) | Library trusted + badge UX ready |
| Multi-cook (2+ people) | Scope; model already allows `cooks>1` | Post-MVP, schema-ready |
| B2B SDK / licensing | Engine must prove itself in B2C first | Engine validated, library seeded |
| Server-side sync / accounts | Cooking session is fully local | Cross-device demand appears |

---

## 10. Cross-cutting definition of done (every phase)

A phase is not "done" until:
1. Its single success metric is met with a **real cook**, not just a passing test.
2. All six engine invariants (Blueprint §9) still hold.
3. No LLM call sits on the cooking critical path (Master P2 audit).
4. The feature degrades gracefully offline (Master P4) and fails safe (P3).
5. The work is covered by automated tests at the appropriate layer.

---

## 11. The first concrete step

If Phase 0 is approved as the starting point, the very first deliverable is small and non-technical: **hand-author the thali DAG and run the two-stopwatch cook.** That single experiment either validates the entire premise or saves you from building on a false one — for the cost of one dinner.

---

*End of Document 3. The three documents together — Master Design, Engine Blueprint, Build Roadmap — form the complete buildable specification for DagChef.*
