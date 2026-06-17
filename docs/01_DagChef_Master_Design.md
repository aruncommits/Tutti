# DagChef — Master Design Document

**Document 1 of 3** · The buildable source of truth
*Supersedes and consolidates: Product Concept, Feature Requirements, Technical Architecture*
*Status: Draft v1 · Owner: Arun*

---

## 0. How to read this document

This is the single source of truth for **what DagChef is and how it must behave**. It is deliberately opinionated. Where the original three documents left decisions open or made risky assumptions, this document resolves them.

Two companion documents go deeper:

- **Doc 2 — Engine Blueprint:** the algorithms and data structures inside the deterministic engine.
- **Doc 3 — Build Roadmap:** the milestone-by-milestone plan to ship it.

The single most important idea, stated once so it governs everything below:

> **DagChef is a deterministic scheduling engine that happens to use an LLM at the edges. The app is the intelligence. The LLM is a one-time translator, never a live decision-maker.**

---

## 1. Vision & Thesis

### 1.1 The one-sentence pitch
DagChef turns any set of recipes into a single, parallel, self-adjusting cooking plan that tells you exactly what to do *right now* — so a home cook can produce a multi-dish meal with the timing of a professional line.

### 1.2 The core thesis
Cooking is not a list. It is a **scheduling problem with shared resources and real-time uncertainty**. Every existing recipe app models cooking as linear text. DagChef models it as what it actually is: a **Directed Acyclic Graph (DAG)** of tasks, scheduled against finite resources (hands, burners, pots, oven), executed under a moving clock.

The defensible insight — the thing nobody else does well — is **cross-dish interleaving**: slotting the active work of one dish (chop the beans) into the passive gaps of another (while the dal simmers). A human juggling three pots cannot hold this schedule in their head. A computer can compute it perfectly.

### 1.3 What success looks like
A cook selects three dishes, says "serve at 7:30," and DagChef produces a plan that (a) finishes all three hot at 7:30, (b) never asks them to be in two places at once, (c) never exceeds their burner count, and (d) silently re-plans when they fall behind or run ahead — without ever making them scroll, read ahead, or do mental math.

---

## 2. Design Principles

These are the rules every feature decision is checked against. They exist to keep us honest.

**P1 — Deterministic-first.** Anything that can be computed by an algorithm *must* be computed by an algorithm. Scheduling, dependency resolution, resource conflicts, critical path, recalculation, and state transitions are all pure, testable, offline-capable code. They are never delegated to an LLM at runtime.

**P2 — LLM at the edge, never in the loop.** The LLM does exactly one job: translate messy human recipe text into a structured DAG. This happens **once, offline, before a user ever cooks**. Its output is verified and frozen into the recipe library. No LLM call ever sits on the cooking critical path. (See §4.)

**P3 — Fail safe, because the stove is on.** An error in a chat app is an annoyance. An error mid-cook — hands full, oil heating — is a ruined meal or a burn. Every feature degrades gracefully. When the engine is uncertain, it defaults to the safe, conservative instruction and tells the user *why*.

**P4 — The cook is never blocked by the tool.** The app must work offline, respond instantly to taps/voice, and never spin on a network call while food is cooking. The cooking session is fully local.

**P5 — Guide, don't gate (mostly).** We help beginners without handcuffing experts. Opinionated defaults, but escape hatches. (This directly revises the original "strict 100% phase gate" — see §7.2.)

**P6 — Show only what's needed now.** Progressive disclosure is the core UX. The screen answers exactly one question at all times: *what do I do this second?*

**P7 — Earn trust with the clock.** Time promises ("serve at 7:30") are sacred. We under-promise, observe the user's real pace, and correct continuously rather than break a stated commitment.

---

## 3. The Problem Space (refined)

The original concept named four problems. They are real. Here they are, sharpened into the requirements they imply.

**The illusion of linear time → requires a scheduler.** Recipes are written serially but executed in parallel. *Implication: we need a true dependency graph and a topological scheduler, not a reordered list.*

**Multi-dish chaos → requires cross-graph merging under shared resources.** Three linear lists cannot be juggled mentally. *Implication: the merge engine and resource allocator are the product, not a feature.*

**The context-switching penalty → requires progressive disclosure + hands-free.** Scrolling a wall of text while managing hot pans breaks flow. *Implication: the UI shows one active focus; advancing must not require clean hands.*

**The mise-en-place deception → requires phase awareness, not phase tyranny.** Prep is hidden inside cook steps. *Implication: separate prep from cook so the user is never ambushed — but allow experienced cooks to overlap them (§7.2).*

**One problem the originals understated — bad time estimates.** Recipe durations are systematically wrong ("sauté 5 min" is really 12). Since DagChef makes explicit time promises, this is a first-class risk, addressed by P7, adaptive pacing (§6.4), and conservative defaults.

---

## 4. The Central Decision: the LLM / Deterministic boundary

This is the architectural spine. Get it wrong and the product is a fragile LLM wrapper. Get it right and it is a robust engine with an AI-assisted content pipeline.

### 4.1 The model: Parse offline → Verify → Curated golden library → Deterministic runtime

```
   ┌─────────────────── OFFLINE / CONTENT PIPELINE ───────────────────┐
   │                                                                   │
   │  Raw recipe        ┌─────────┐      ┌────────────┐                │
   │  (text / URL)  ──▶  │  LLM    │ ──▶  │  Validator  │ ──▶ Human    │
   │                     │ Parser  │      │ (no cycles, │     review   │
   │                     └─────────┘      │  schema OK) │       │      │
   │                                      └────────────┘       ▼      │
   │                                              ┌────────────────┐  │
   │                                              │  GOLDEN RECIPE │  │
   │                                              │    LIBRARY     │  │
   │                                              │ (frozen DAGs)  │  │
   │                                              └────────┬───────┘  │
   └───────────────────────────────────────────────────────┼─────────┘
                                                            │
   ┌───────────────────── RUNTIME / ON DEVICE ──────────────┼─────────┐
   │                                                         ▼         │
   │   User picks dishes ──▶  DETERMINISTIC ENGINE  ──▶  Cooking UI    │
   │   + serve time          (merge · schedule ·       (3-tier view,   │
   │   + kitchen profile      resource-solve ·          hands-free)    │
   │                          recalculate)                             │
   │                                                                   │
   │   ★ NO LLM CALLS HERE. Fully local. Works offline. ★             │
   └───────────────────────────────────────────────────────────────────┘
```

### 4.2 What the LLM does (and only this)
- Ingest raw recipe text or a URL.
- Emit a candidate `RecipeGraph` (TaskNodes, dependencies, ingredients-to-step mapping, prep/cook phase tags, active/passive tags, equipment hints, rough durations).
- That's it. It then exits the building.

### 4.3 What happens before any recipe is "live"
1. **Schema validation (deterministic):** valid JSON, every dependency points to a real node, no circular dependencies (cycle check), every ingredient maps to a node.
2. **Heuristic linting (deterministic):** flag suspicious durations, orphan nodes, prep steps with no consuming cook step, equipment not in the known vocabulary.
3. **Human review:** a person approves or corrects the DAG. This is cheap, one-time, and amortized across every user who ever cooks that recipe.
4. **Freeze:** the approved DAG enters the **Golden Recipe Library**. From now on it is trusted, versioned, deterministic content.

### 4.4 Why this boundary (the justification, per your principle)
- **Robustness:** the failure mode of a hallucinated dependency is caught at review time by a human, not discovered by a user with oil heating.
- **Cost & latency:** zero LLM cost or latency per cook. A cooking session is just graph traversal — instant and offline.
- **Trust:** users cook from a curated, tested library (like NYT Cooking's edited recipes), not raw machine output.
- **Optionality:** "paste your own recipe" can still exist later as a clearly-labelled *experimental* path that runs the same parser but skips human review — with a visible "unverified" badge. It is never the default.

### 4.5 The boundary as a hard rule
| Concern | Owner |
|---|---|
| Parsing text → DAG | **LLM** (offline, once) |
| Cycle detection, schema validation | Deterministic |
| Merging multiple recipes | Deterministic |
| Critical path / topological sort | Deterministic |
| Resource conflict resolution | Deterministic |
| Reverse target-time scheduling | Deterministic |
| Real-time recalculation | Deterministic |
| State transitions (lock→active→done) | Deterministic |
| Adaptive pace learning | Deterministic (statistics, not LLM) |

If a proposed feature wants an LLM call at runtime, the answer is no until proven it cannot be deterministic.

---

## 5. System Architecture

Three layers, cleanly separated so each is independently testable.

### 5.1 Content layer (offline)
The LLM parser + validator + human review tool + the Golden Recipe Library (versioned store of frozen `RecipeGraph` objects). Output is data, not behavior. This layer can be down and users can still cook everything already in the library.

### 5.2 Engine layer (the brain — pure & portable)
A dependency-free module that takes `(selected recipes, kitchen profile, target serve time, live completion events)` and returns `(a scheduled, resource-resolved MasterExecutionPlan and a live view-state)`. It is pure functions over data — no UI, no network, no LLM. This is what Doc 2 specifies in full. It must run identically on a server *and* on-device (P4).

### 5.3 Experience layer (the cooking UI)
A reactive client (React Native) that renders the engine's view-state into the three-tier interface and feeds user events (tap / voice) back into the engine. The UI is "dumb": it asks the engine what to show and reports what the user did. All logic lives in the engine.

```
 Content layer (offline)   →   Engine layer (pure)   →   Experience layer (UI)
 LLM + review + library         merge·schedule·recalc      3-tier view · hands-free
        produces DATA                produces STATE              renders STATE
```

---

## 6. The Core Domain Model

This is the shared vocabulary across all three docs. Doc 2 formalizes the exact schema; here is the conceptual model.

### 6.1 RecipeGraph
A single dish, as a frozen DAG of `TaskNode`s plus metadata (name, cuisine, servings, source, version). Lives in the Golden Library.

### 6.2 TaskNode — the atom
Every action in the kitchen is one node:
- **identity:** id, parent recipe.
- **what:** title, the contextual ingredients+measurements consumed *at this step* (§7.4).
- **phase:** `prep` | `cook` | `serve`.
- **attention type:** `active` (occupies the hands) | `passive` (occupies the stove/oven but frees the hands). *This active/passive distinction is the heart of interleaving.*
- **duration:** an estimate, treated as a distribution not a fact (§6.4).
- **equipment:** what physical resources it occupies and for how long.
- **dependencies:** node ids that must complete first.
- **status:** `locked` | `active` | `completed`.

### 6.3 MasterExecutionPlan — the merged session
When the user selects multiple recipes, the engine merges all their nodes into one session carrying: target serve time, kitchen profile, the full node set, the computed schedule (start/end per node), and the critical path. This is the object the UI cooks from.

### 6.4 Time as a distribution, not a number
A durationMins of 10 means "about 10, for an average cook." The engine treats it as an estimate with slack. The **adaptive pace model** (deterministic statistics) observes that this user runs ~25% slow on knife work and adjusts *their* future estimates. Conservative rounding protects the serve-time promise (P7). No LLM involved — this is arithmetic over the user's own history.

---

## 7. Feature Set (MVP and the reasoning behind each)

### 7.1 Three-Tier Progressive Disclosure (the cooking screen)
The screen always renders exactly three zones derived purely from node status:
- **Active Zone (expanded):** every node whose dependencies are all met and isn't done. Full instructions, big text, contextual measurements. This is "what to do now."
- **The Queue (collapsed):** upcoming nodes, titles only, for spatial awareness — visible but not actionable.
- **The Archive (struck through):** completed nodes, collapsed to the bottom.

The view is a pure function of state (Doc 2 §5). No scrolling to cook.

### 7.2 Phase awareness — guided, not gated *(revises original)*
The original spec **hard-locked** all cooking until prep was 100% done. We soften this deliberately (P5):
- **Default / Beginner mode:** strong nudge to finish prep first; cook steps appear visually "held" with a one-tap "I'm ready to start cooking" confirmation. Not an impassable wall.
- **Pro mode:** prep and cook interleave freely wherever the DAG and resources allow (e.g., start onions, then chop garlic during the sauté). This is how good cooks actually work, and blocking it contradicts our own time-saving thesis.
The phase tags still drive *organization and safety warnings*; they just don't impose an artificial barrier in pro mode.

### 7.3 Cross-dish interleaving + reverse scheduling (the differentiator)
The engine merges graphs, maps each dish's active/passive windows, slots one dish's active tasks into another's passive gaps, resolves resource conflicts, and schedules backward from the target serve time to compute the exact start moment. Fully deterministic. (Doc 2 §3–4.)

### 7.4 Contextual Measurement Injection
No "ingredients list" to scroll back to. Each measurement is attached to the node that consumes it — the step literally reads "Add 1 tsp cumin, ½ tsp turmeric." The data binding is done at parse time and frozen in the library.

### 7.5 Dynamic State Traversal (auto-progression)
Completing an active node triggers a deterministic graph traversal: dependents whose blockers are now cleared get promoted from Queue → Active and auto-expand. Instant, local, no network.

### 7.6 Kitchen Equipment Profile
One-time setup: burners, oven, microwave, pressure cooker, blender, cutting boards, counter size. Feeds the resource allocator so the schedule never demands more than the user physically has.

### 7.7 Real-time recalculation
Finish early or late and the whole downstream timeline + serve-time estimate recomputes instantly. Protects P7.

---

## 8. UX Strategy: the "Sticky Hands" problem

Hands are covered in food; tapping a screen fails. We split interaction by phase:
- **Prep:** standard tapping is fine (the user is at a board with a knife).
- **Cooking:** must be hands-free. **Voice is the MVP bet** ("DagChef, next" / "done"). It is robust, cheap, and works in steam.
- **Gesture (camera wave):** explicitly **cut from MVP.** Steam, bad phone angles, and lighting make it a demo feature that fails in real kitchens. Revisit only if voice proves insufficient.

---

## 9. Build Roadmap (summary — full detail in Doc 3)

- **Phase 1 — Headless engine + content schema.** Deterministic single-recipe scheduling from a hand-authored DAG. Prove the graph model and state machine with tests. *No UI, minimal LLM — recipes hand-built.*
- **Phase 2 — Progressive single-recipe UI.** The three-tier view over one recipe, driven entirely by engine state. Prove a user can cook one dish without getting lost.
- **Phase 3 — Multi-dish compiler.** Merge logic + resource constraints + reverse scheduling. The differentiator. Prove two stove-bound dishes get staggered correctly.
- **Phase 4 — Hands-free + adaptive pace.** Voice control; pace learning.
- **Content pipeline (parallel track):** LLM parser + validator + review tool, feeding the Golden Library, maturing alongside Phases 1–3 so there's trusted content by launch.

---

## 10. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| LLM mis-parses dependencies/durations | High | Human-verified Golden Library (P2, §4); never raw output by default |
| Time estimates wrong → broken serve promise | High | Conservative rounding, adaptive pace model, P7 |
| Resource model too simplistic (one "burner" ≠ another) | Med | Start coarse; richer equipment typing in Doc 2 schema |
| Phase-gate dogma alienates skilled cooks | Med | Guided-not-gated, pro mode (§7.2) |
| Hands-free unreliable | Med | Voice-first, gesture cut (§8) |
| Library too small at launch → no value | High | Content pipeline as parallel track from day one; seed with one strong cuisine vertical |
| Scope creep beyond the engine | Med | Principles P1–P2 as a gate on every feature |

---

## 11. Open Questions (to resolve before/within Doc 2 & 3)

1. **Equipment granularity:** is a "burner" fungible, or do we model pot/pan instances too? (Affects schema depth.)
2. **Launch vertical:** which single cuisine seeds the Golden Library for maximum coherence? (e.g., South Indian thali, given the Kuzhambu/Poriyal examples.)
3. **Server vs fully-on-device runtime** for v1 — engine is portable either way; which ships first?
4. **B2C vs B2B sequencing** — the engine is the asset; is v1 a consumer app, a data-flywheel, or a licensable SDK? (Strategic, can trail the build.)
5. **Multi-cook support** (two people in the kitchen) — out of MVP scope, but the model should not preclude it.

---

*End of Document 1. Next: Document 2 — Deterministic Engine Blueprint (the algorithms inside §5.2).*
