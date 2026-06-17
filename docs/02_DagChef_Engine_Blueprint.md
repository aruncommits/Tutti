# DagChef — Deterministic Engine Blueprint

**Document 2 of 3** · The algorithms inside the brain
*Specifies §5.2 of the Master Design Document*
*Status: Draft v1 · Owner: Arun*

---

## 0. Purpose & scope

This document specifies the **deterministic engine** — the pure, testable core that does all the real thinking. It contains no UI and makes **no LLM calls**. Given recipes, a kitchen, a target serve time, and live events, it produces a scheduled plan and the exact state the screen should render.

Everything here is implementable as pure functions over plain data. That is the point: it can be unit-tested exhaustively, run on a server or on-device, and reasoned about with certainty (Principle P1).

**The single most important idea in this document:**

> The cook's hands are modeled as a *resource*, exactly like a burner. Active tasks consume a hand-unit; passive tasks don't. Once you see hands as a resource, **cross-dish interleaving stops being a special feature and becomes an automatic consequence of resource-constrained scheduling.**

---

## 1. The engine's public interface

The entire engine is four pure functions. Everything else is internal.

```
compile(recipes[], kitchenProfile, targetServeTime, paceModel?)
        → MasterExecutionPlan        // merge + schedule, offline-capable

deriveViewState(plan)
        → ViewState                  // what the UI renders, pure function of status

applyEvent(plan, event)
        → MasterExecutionPlan        // completion / start / undo → new plan

reschedule(plan, now)
        → MasterExecutionPlan        // recompute timeline from current reality
```

No hidden state. No side effects. Same inputs always yield the same outputs — which is what makes the kitchen-critical behavior trustworthy and testable.

---

## 2. The data model (formal)

### 2.1 TaskNode

```jsonc
{
  "nodeId": "kz_5",
  "recipeId": "rec_kuzhambu",
  "title": "Fry brinjals",
  "instruction": "Add the slit brinjals to the hot oil and fry until skins blister.",
  "phase": "cook",                 // "prep" | "cook" | "serve"
  "attention": "active",           // "active" (needs hands) | "passive" (unattended)
  "duration": {                    // time as a distribution, not a fact (Master §6.4)
    "estMins": 10,
    "minMins": 8,
    "maxMins": 14,
    "elastic": false               // true = duration scales with the cook's pace (e.g. chopping)
  },
  "ingredients": [
    { "name": "baby brinjals", "amount": 8,  "unit": "whole", "preparedState": "slit" },
    { "name": "sesame oil",    "amount": 1,  "unit": "tbsp" }
  ],
  "resources": [                   // see §3 — what this node occupies while it runs
    { "category": "burner", "count": 1, "capabilities": [], "heldFor": "duration" },
    { "category": "pan",    "count": 1, "capabilities": ["large"], "heldFor": "duration" }
  ],
  "dependencies": ["kz_4", "kz_2"],// nodeIds that must be completed first
  "status": "locked"              // "locked" | "active" | "completed" (runtime only)
}
```

Notes that matter:
- **`attention`** is the interleaving lever. `active` = occupies the hands; `passive` = occupies equipment but frees the hands (simmer, bake, rest).
- **`duration.elastic`** marks tasks that scale with user speed (chopping) vs fixed-physics tasks (a 15-min simmer is 15 min for everyone). The pace model (§7) only stretches elastic tasks.
- **`resources`** is the generalized requirement that supports all three equipment-modeling levels in §3.

### 2.2 RecipeGraph (frozen library content)

```jsonc
{
  "recipeId": "rec_kuzhambu",
  "name": "Vatha Kuzhambu",
  "version": 3,                    // library content is versioned
  "servings": 4,
  "verified": true,                // human-approved (Master §4.3)
  "nodes": [ /* TaskNode[] */ ]
}
```

### 2.3 KitchenProfile + the layered resource model

This is where we satisfy "support all equipment-modeling options." One schema, three levels of fidelity — start coarse, deepen without migration.

```jsonc
{
  "cooks": 1,                      // human bandwidth = a resource (see §4)
  "resources": [
    // LEVEL 0 — coarse counts (MVP default). A burner is a burner.
    { "category": "burner", "count": 2 },
    { "category": "oven",   "count": 1 },
    { "category": "blender","count": 1 },

    // LEVEL 1 — capability-tagged counts (optional). Pools with attributes.
    { "category": "pan", "count": 3, "capabilities": ["small","medium","large"] },

    // LEVEL 2 — typed instances (optional, advanced). Individually identified gear.
    { "category": "pot", "instances": [
        { "id": "pot_heavy", "capabilities": ["heavy_bottom","large"] },
        { "id": "pot_light", "capabilities": ["small"] }
    ]}
  ]
}
```

**Why one schema covers all three (the recommendation):**
A node's requirement is always expressed as `{ category, count, capabilities[] }`. The allocator (§4.3) matches requirements to availability the same way regardless of level:
- **Level 0:** capabilities empty → pure counting. Trivial, fast, ships first.
- **Level 1:** capabilities filter which units in a pool qualify.
- **Level 2:** instances are just a pool of size-1 capability sets; the *same* matching logic applies.

So MVP runs Level 0, and richer kitchens upgrade later **with zero engine rewrite** — only the data gets richer. That's the justification for the layered design: maximal future fidelity, minimal present cost.

### 2.4 MasterExecutionPlan

```jsonc
{
  "sessionId": "session_992",
  "targetServeTime": "19:30:00",
  "startTime": "18:45:00",         // computed (§5): the exact minute to begin
  "kitchenProfile": { /* … */ },
  "nodes": [ /* all TaskNodes from all recipes, with schedule fields filled */ ],
  "criticalPathMins": 45,
  "criticalPath": ["kz_1","kz_4","kz_5","kz_9","serve"],
  "projectedServeTime": "19:30:00",// updates live as reality diverges (§6)
  "schedule": {                    // per-node scheduling result
    "kz_5": { "plannedStart": "19:05:00", "plannedEnd": "19:15:00",
              "earliestStart": 20, "latestStart": 22, "slackMins": 2 }
  }
}
```

### 2.5 ViewState (what the UI renders)

```jsonc
{
  "active":  [ /* expanded TaskNodes, deps met, not done */ ],
  "queue":   [ /* collapsed upcoming nodes, titles only */ ],
  "archive": [ /* completed nodes, struck through */ ],
  "projectedServeTime": "19:30:00",
  "nextStartAlert": null           // e.g. "Start in 3 min to stay on time"
}
```

---

## 3. The offline compile pipeline (validation gate)

Before any RecipeGraph is trusted, deterministic checks run (Master §4.3). These are not optional — they are the safety net that lets a human reviewer trust the LLM's output.

```
validate(recipeGraph):
  1. SCHEMA:   every node matches the TaskNode schema; enums valid.
  2. REF:      every dependency id and ingredient ref points to a real node.
  3. ACYCLIC:  run cycle detection (DFS w/ colors OR Kahn's algorithm).
               If a back-edge exists → REJECT with the offending cycle.
  4. REACH:    no orphan nodes; every node reachable; exactly the expected
               terminal "serve" node(s).
  5. LINT (warnings, not blockers):
       - prep node whose output ingredient is never consumed by a cook node
       - duration outside sane bounds for its category
       - equipment category not in known vocabulary
       - active node with no hands requirement / passive node holding hands
  → returns { ok, errors[], warnings[] } for the human review tool.
```

**Cycle detection (the critical one):**
```
Kahn's algorithm:
  compute inDegree for every node
  queue ← all nodes with inDegree 0
  count ← 0
  while queue not empty:
     n ← queue.pop(); count++
     for each m in dependents(n):
        inDegree[m]--; if inDegree[m]==0: queue.push(m)
  if count != totalNodes:  → CYCLE EXISTS (reject)
```
A cycle means "A needs B which needs A" — an impossible recipe. We catch it at authoring time, never at the stove.

---

## 4. The scheduler — the core algorithm

This is the engine's heart: merge N recipe graphs into one resource-feasible, time-anchored schedule. It is **Resource-Constrained Project Scheduling (RCPSP)**. Optimal RCPSP is NP-hard, so we use a well-understood **greedy priority list-scheduling heuristic** — fast, deterministic, and good enough to beat any human juggling pots. We do not need the mathematical optimum; we need a feasible schedule that respects dependencies and resources and hits the deadline.

### 4.1 Step 1 — Merge
Concatenate all nodes from all selected recipes into one set. Dependencies are already local to each recipe (no cross-recipe edges) — the recipes are independent graphs that share only *resources*, not *dependencies*. This is what makes interleaving possible and safe.

### 4.2 Step 2 — Model hands as a resource
Inject a synthetic resource into the kitchen profile:
```
{ "category": "hands", "count": kitchenProfile.cooks }   // 1 for MVP
```
Then normalize every node's requirements:
```
if node.attention == "active":  node.resources += { category:"hands", count:1 }
if node.attention == "passive": node holds no hands
```
**Consequence:** the scheduler will never place two active tasks at the same instant for a single cook (only one hands-unit exists), and it *will* place active tasks during another task's passive window (hands are free then). Cross-dish interleaving and "human bandwidth mapping" from the original concept are now **automatic** — no bespoke logic.

### 4.3 Step 3 — Forward pass (earliest feasible schedule, resource-aware)
Greedy list scheduling:
```
scheduleForward(nodes, resources):
  topoOrder ← topologicalSort(nodes)          // respects dependencies
  for each node in priority order:            // priority = on critical path first,
                                              //   tie-break: least slack, longest duration
     est ← max(end time of all its dependencies)
     t   ← earliest time ≥ est where ALL required resource units are free
            for the node's whole duration
     assign node to [t, t + duration]; mark those resource units busy in that window
  returns earliest start/end for every node + makespan
```
Resource availability is tracked as a timeline per resource category (and per capability/instance at Levels 1–2 via bipartite matching of requirement→available unit). If a unit can't be found, the node slides later — this is exactly the "stagger two stove tasks when you only have 2 burners" behavior, generalized.

### 4.4 Step 4 — Critical path
The critical path is the longest dependency-respecting chain; its length is the minimum possible makespan. Computed from the forward/backward passes (nodes with zero slack). It tells the user the irreducible floor on cooking time and drives scheduling priority.

### 4.5 Step 5 — Reverse target-time anchoring
The user says "serve at 19:30." We anchor the schedule to *end* there:
```
anchor(schedule, targetServeTime):
  makespan ← schedule.makespanMins
  startTime ← targetServeTime − makespan        // the exact minute to begin
  shift every planned start/end so the last node ends at targetServeTime
  backward pass → latestStart & slack per node (how late each can begin safely)
```
If `startTime` is in the past relative to "now," the engine reports "this meal needs X minutes; to serve at 19:30 you needed to start at 18:45 — earliest realistic serve is HH:MM." Honest, never silently broken (Principle P7).

### 4.6 Worked micro-example (why interleaving wins)
Two dishes, one cook, two burners:
- Dal: `boil dal` (passive, 20m, burner) → `temper & mix` (active, 5m, burner)
- Poriyal: `chop beans` (active, 8m, hands) → `sauté beans` (active, 12m, burner+hands)

Linear human: 20 + 5 + 8 + 12 = **45 min**.
DagChef: start `boil dal` (passive). Hands are free → do `chop beans` (8m) *during* the boil. After dal boils, `temper & mix` (5m), then `sauté beans` (12m). Makespan ≈ 20 (boil, with chop hidden inside) + 5 + 12 = **37 min**, and nothing was rushed. The 8 minutes of chopping vanished into the simmer. That recovered time *is the product.*

---

## 5. Runtime state machine

At cook time there is **no scheduling math on the critical path** — only state transitions and view derivation. Both are trivial and instant.

### 5.1 Node status lifecycle
```
locked ──(all dependencies completed)──▶ active ──(user completes)──▶ completed
   ▲                                                                      │
   └──────────────────────(user undo)────────────────────────────────────┘
```

### 5.2 deriveViewState — pure function of status (the render loop)
```
deriveViewState(plan):
  active  = nodes where status≠"completed" AND every dependency is "completed"
  archive = nodes where status=="completed"
  queue   = all remaining nodes (locked, deps not yet met)
  sort active  by plannedStart
  sort queue   by plannedStart
  sort archive by completion time
  return { active, queue, archive, projectedServeTime, nextStartAlert }
```
This is the three-tier UI (Master §7.1) expressed as one deterministic filter. The UI never decides what to show; it asks this function.

### 5.3 applyEvent — completion traversal
```
applyEvent(plan, { type:"complete", nodeId, at:now }):
  mark nodeId completed; record actualDuration
  for each node currently "locked":
     if every dependency is "completed":  promote to "active"
  return reschedule(plan, now)        // §6 — keep the clock honest
```
The promotion step is the "dynamic state traversal / auto-progression" feature — pure graph traversal, O(affected dependents).

---

## 6. Real-time recalculation

Reality diverges from the plan constantly (user is fast/slow). The engine keeps the timeline truthful without ever blocking the user.

```
reschedule(plan, now):
  remaining ← nodes not yet completed
  freeze    ← nodes in progress keep their actual start
  re-run scheduleForward(remaining, resources) but with t0 = now
        and earliest starts clamped to now
  recompute projectedServeTime = now + remaining makespan
  recompute slack; if any active node's latestStart < now → flag "running late"
  emit nextStartAlert for the soonest not-yet-started critical node
  return updated plan
```

Key properties:
- Triggered on every completion event and on a lightweight wall-clock tick (e.g. each minute) so an *idle* user still sees the serve time drift.
- Runs in microseconds (tens to hundreds of nodes) — safe to run synchronously on-device.
- Never reorders what the user is *currently* doing; only adjusts downstream and the projected serve time. Stability matters: we avoid thrash by only re-promoting/re-timing, never yanking an active task away.

---

## 7. Adaptive pace model (statistics, not AI)

Per Principle P1, personalization is arithmetic over the user's own history — no LLM.

```
For each task category (chop, sauté, knead, …):
  maintain a running ratio  r = actualDuration / estimatedDuration
  use an exponential moving average:  r ← α·(actual/est) + (1−α)·r_prev
  store per-category multipliers per user (e.g. chop: 1.25, simmer: 1.0)

At compile time, for nodes where duration.elastic == true:
  adjustedEst = baseEst × userMultiplier[category]
Fixed-physics nodes (elastic=false) are never scaled.
```
Cold start: everyone begins at multiplier 1.0 with conservative rounding. The model only *widens* estimates until it has evidence, protecting the serve promise (P7). It converges within a few sessions and is fully explainable ("you tend to take 25% longer on prep, so I padded it").

---

## 8. Edge cases & failure handling (fail safe — P3)

| Situation | Deterministic response |
|---|---|
| Infeasible deadline (not enough time) | Report earliest realistic serve time; never fake it |
| Resource over-subscription (3 stove tasks, 2 burners) | Stagger via §4.3; if unavoidable on critical path, surface the bottleneck |
| User completes tasks out of order | Allow it; recompute. If they complete a node whose deps aren't done, warn but don't hard-block (P5) |
| User undoes a completion | Revert status, re-lock dependents whose deps are no longer met, reschedule |
| A passive task overruns (forgot the simmer) | Wall-clock tick detects overrun; push downstream, update serve time, alert |
| Two recipes need the one heavy pot (Level 2) | Bipartite match fails for the second → it's staggered after the first frees the pot |
| Network down | Entire session runs locally; library already on device |
| Corrupt/invalid library entry | Caught at compile validate(); never reaches the cook |

---

## 9. Invariants & testing strategy

Because the engine is pure, it is exhaustively testable. These invariants must hold after **every** `compile`, `applyEvent`, and `reschedule`:

1. **Acyclicity:** the active dependency graph is always a DAG.
2. **Dependency safety:** no node is `active` unless all its dependencies are `completed`.
3. **Resource feasibility:** at no instant does concurrent usage of any resource category exceed its capacity (including `hands`).
4. **Monotonic progress:** `completed` count never decreases except via explicit `undo`.
5. **Deadline honesty:** `projectedServeTime ≥ now + remainingCriticalPath` (never promises the impossible).
6. **Determinism:** identical inputs → byte-identical plan (enables snapshot testing).

Test layers:
- **Unit:** topo sort, cycle detection, forward/backward pass, resource matching, pace EMA.
- **Property-based:** generate random valid DAGs + kitchens; assert all six invariants hold.
- **Golden scenarios:** the Kuzhambu+Poriyal+Rice thali, hand-checked against a stopwatch ground truth (ties to Master §11 validation).
- **Simulation:** replay event streams (fast/slow/out-of-order cooks) and assert no invariant breaks.

---

## 10. What this engine deliberately does NOT do

- It does not call an LLM. Ever. (Master P2.)
- It does not parse text. It consumes already-validated RecipeGraphs from the library.
- It does not render UI. It emits ViewState; the client draws it.
- It does not seek the mathematically optimal schedule — a feasible, dependency- and resource-correct schedule that beats human juggling is the goal.
- It does not require a network. The full cooking session is local.

---

*End of Document 2. Next: Document 3 — Phased Build Roadmap (how we ship §4–§7 incrementally, and how the content pipeline matures in parallel).*
